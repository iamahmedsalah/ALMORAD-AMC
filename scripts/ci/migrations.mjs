import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
export class ReleasePolicyError extends Error {}
const root=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(new URL('../../apps/api/package.json',import.meta.url));
export function migrationTarget(env){
  const url=new URL(env.DIRECT_URL||env.DATABASE_URL||'');
  if(!['postgres:','postgresql:'].includes(url.protocol)||url.pathname.length<2)throw new ReleasePolicyError('Migration requires an existing PostgreSQL TCP database');
  const schema=url.searchParams.get('schema')||'public';
  if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema))throw new ReleasePolicyError('Invalid migration schema');
  const fingerprint=createHash('sha256').update([url.hostname,url.port||'5432',url.pathname,url.username,schema].join('|')).digest('hex');
  return {url,schema,fingerprint};
}
export function reviewSql(sql,checksum,reviewed){
  const clean=sql.replace(/\/\*[\s\S]*?\*\//g,'').replace(/--[^\n]*/g,'');
  // Conservative review gate, not a complete SQL parser or compatibility proof.
  const sensitive=/\b(?:DROP|TRUNCATE|DELETE|UPDATE)\b|\bALTER\s+COLUMN\b|\bRENAME\b/i.test(clean);
  if(sensitive&&!reviewed.includes(checksum))throw new ReleasePolicyError('Migration needs an explicit SQL checksum review before release');
}
export async function migrationManifest(){
  const directory=resolve(root,'apps/api/prisma/migrations');
  const reviewed=JSON.parse(await readFile(resolve(root,'scripts/ci/reviewed-migrations.json'),'utf8'));
  const entries=[];
  for(const name of (await readdir(directory,{withFileTypes:true})).filter(x=>x.isDirectory()).map(x=>x.name).sort()){
    const sql=await readFile(resolve(directory,name,'migration.sql'),'utf8');
    const canonical=sql.replace(/\r\n/g,'\n');
    const checksum=createHash('sha256').update(canonical).digest('hex');
    reviewSql(sql,checksum,reviewed.reviewedChecksums);
    entries.push({name,checksum,checksums:[...new Set([checksum,createHash('sha256').update(canonical.replace(/\n/g,'\r\n')).digest('hex'),...(reviewed.historicalChecksums[checksum]||[])])]});
  }
  return {entries,digest:createHash('sha256').update(JSON.stringify(entries.map(({name,checksum})=>({name,checksum})))).digest('hex')};
}
export function pendingMigrations(entries,history,existingTables){
  if(history===null&&existingTables.length)throw new ReleasePolicyError('Nonempty schema has no migration history; explicit baseline review required');
  const applied=new Set();
  for(const row of history||[]){
    if(row.rolled_back_at)continue;
    if(!row.finished_at)throw new ReleasePolicyError('Failed or unfinished migration requires operator review');
    const entry=entries.find(x=>x.name===row.migration_name);
    if(!entry||!(entry.checksums||[entry.checksum]).includes(row.checksum))throw new ReleasePolicyError('Applied migration differs from reviewed repository history');
    applied.add(row.migration_name);
  }
  let gap=false;
  for(const entry of entries){if(!applied.has(entry.name))gap=true;else if(gap)throw new ReleasePolicyError('Migration history has an unexpected gap');}
  return entries.filter(x=>!applied.has(x.name)).map(x=>x.name);
}
export async function inspectMigrations(env=process.env,{connectionTimeoutMillis=10000}={}){
  const target=migrationTarget(env),manifest=await migrationManifest();
  const {Client}=require('pg');
  const db=new Client({connectionString:target.url.href,options:`-c search_path=${target.schema}`,connectionTimeoutMillis,statement_timeout:15000});
  try{
    await db.connect();await db.query('BEGIN READ ONLY');
    const tables=(await db.query('SELECT tablename FROM pg_tables WHERE schemaname=$1',[target.schema])).rows.map(x=>x.tablename);
    const history=tables.includes('_prisma_migrations')?(await db.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM "_prisma_migrations" ORDER BY started_at')).rows:null;
    const pending=pendingMigrations(manifest.entries,history,tables.filter(x=>x!=='_prisma_migrations'));
    await db.query('ROLLBACK');
    return {fingerprint:target.fingerprint,digest:manifest.digest,pending};
  }finally{await db.end();}
}
export function authorizeMigration(env,state){
  if(!state.pending.length)return;
  const target=migrationTarget(env);
  const local=['127.0.0.1','localhost','[::1]'].includes(target.url.hostname)&&decodeURIComponent(target.url.pathname).endsWith('_test');
  if(local&&env.NODE_ENV!=='production')return;
  // Owner-authorized development/testing deployments do not require a backup.
  // Keep this explicit: NODE_ENV=production is also used by Vercel test builds.
  if(env.AMC_RELEASE_MIGRATIONS==='1'&&env.AMC_MIGRATION_POLICY==='development'){
    if(env.AMC_RELEASE_DATABASE_FINGERPRINT&&env.AMC_RELEASE_DATABASE_FINGERPRINT!==state.fingerprint)throw new ReleasePolicyError('Development release database does not match');
    if(env.AMC_RELEASE_MIGRATION_DIGEST&&env.AMC_RELEASE_MIGRATION_DIGEST!==state.digest)throw new ReleasePolicyError('Development release migration manifest does not match');
    return;
  }
  if(env.AMC_RELEASE_MIGRATIONS!=='1'||!/^(github:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+:\d+:\d+|snapshot:[A-Za-z0-9_.:-]{8,200})$/.test(env.AMC_MIGRATION_BACKUP_REF||'')||!/^[a-f0-9]{40}$/.test(env.AMC_RELEASE_SHA||'')||env.AMC_RELEASE_DATABASE_FINGERPRINT!==state.fingerprint||env.AMC_RELEASE_MIGRATION_DIGEST!==state.digest)throw new ReleasePolicyError('Pending production migrations require a reviewed release, matching database, backup and rehearsal');
}
export async function deployMigrations(env=process.env,{inspect=inspectMigrations,execute=spawnSync}={}){
  const state=await inspect(env);authorizeMigration(env,state);
  if(state.pending.length){
    const cli=resolve(root,'apps/api/node_modules/prisma/build/index.js');
    const result=execute(process.execPath,[cli,'migrate','deploy'],{cwd:resolve(root,'apps/api'),env,encoding:'utf8',timeout:180000,windowsHide:true});
    if(result.error||result.status!==0)throw new ReleasePolicyError('Prisma migration deployment failed; inspect migration status before retrying');
  }
  const after=await inspect(env);
  if(after.pending.length||after.fingerprint!==state.fingerprint||after.digest!==state.digest)throw new ReleasePolicyError('Migration verification failed; target or manifest changed, or migrations remain pending');
  console.log(JSON.stringify({event:'migrations_verified',applied:state.pending.length}));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  try{
    if(process.argv[2]==='policy'){const manifest=await migrationManifest();console.log(JSON.stringify({reviewedMigrations:manifest.entries.length,digest:manifest.digest}));}
    else if(process.argv[2]==='inspect')console.log(JSON.stringify(await inspectMigrations()));
    else if(process.argv[2]==='deploy')await deployMigrations();
    else throw new ReleasePolicyError('Use migrations.mjs policy|inspect|deploy');
  }catch(error){console.error(error instanceof ReleasePolicyError?error.message:'Database release inspection failed; no credentials were logged');process.exitCode=1;}
}

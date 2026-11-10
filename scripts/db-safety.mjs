import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {loadEnvFile} from 'node:process';
if(existsSync('.env'))loadEnvFile('.env');
const mode=process.argv[2];
if(!['backup','rehearse'].includes(mode))throw new Error('Usage: node scripts/db-safety.mjs backup|rehearse');
const url=new URL(process.env.DATABASE_URL||'');
const database=url.pathname.slice(1);
if(!['postgres:','postgresql:'].includes(url.protocol)||process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(url.hostname)||!/^amc_[a-z0-9_]+_(dev|test|demo)$/.test(database)&&!['amc_dev','amc_test','amc_demo'].includes(database))throw new Error('Safety tool requires a local amc development/test/demo database');
const container=process.env.LOCAL_POSTGRES_CONTAINER||'almorad-amc-dev-postgres-1';
const backend=process.env.LOCAL_POSTGRES_MODE||'docker';
if(!['native','docker'].includes(backend))throw new Error('Invalid local PostgreSQL tool mode');
const native=backend==='native';
if(native&&!database.endsWith('_test'))throw new Error('Native CI restore checks require an isolated *_test database');
if(!/^[a-zA-Z0-9_-]+$/.test(container))throw new Error('Invalid local container name');
const user=decodeURIComponent(url.username);if(!/^[a-zA-Z0-9_]+$/.test(user))throw new Error('Invalid local database user');
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
if(!native){
 const endpoint=process.env.DOCKER_HOST||docker('context','inspect','--format','{{.Endpoints.docker.Host}}');
 if(!endpoint.startsWith('npipe:')&&!endpoint.startsWith('unix:'))throw new Error('Only a local Docker daemon is permitted');
}
const {Client}=createRequire(new URL('../apps/api/package.json',import.meta.url))('pg');
const connection=new Client({connectionString:url.href});
const pg=(command,...args)=>native?execFileSync(command,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:'disable',PGOPTIONS:'',PGSERVICE:'',PGSSLROOTCERT:''}}).trim():docker('exec',container,command,...args);
const sql=(db,query)=>pg('psql','-X','-v','ON_ERROR_STOP=1','-U',user,'-d',db,'-At','-c',query);
function snapshot(db){const names=sql(db,"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").split('\n').filter(Boolean);return Object.fromEntries(names.map(name=>{if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))throw new Error('Unsupported table identifier');return [name,Number(sql(db,`SELECT count(*) FROM "${name}"`))];}));}
const stamp=randomUUID();const temp=`/tmp/amc-${stamp}.dump`;
const directory=resolve('.backups');mkdirSync(directory,{recursive:true});
const file=join(directory,`${database}-${stamp}.dump`);
const restored=`amc_restore_${stamp.replaceAll('-','').slice(0,12)}_test`;
let created=false;
try{
  await connection.connect();
  await connection.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const {rows:tables}=await connection.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const expected={};
  for(const {tablename:name} of tables){if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))throw new Error('Unsupported table identifier');expected[name]=Number((await connection.query(`SELECT count(*) FROM "${name}"`)).rows[0].count);}
  const exported=(await connection.query('SELECT pg_export_snapshot() AS snapshot')).rows[0].snapshot;
  pg('pg_dump','-U',user,'-d',database,'--snapshot',exported,'-Fc','-f',temp);
  await connection.query('COMMIT');
  if(native)copyFileSync(temp,file);else docker('cp',`${container}:${temp}`,file);
  const sha256=createHash('sha256').update(readFileSync(file)).digest('hex');
  writeFileSync(`${file}.json`,JSON.stringify({database,createdAt:new Date().toISOString(),sha256,tableCounts:expected},null,2));
  console.log(`Local backup written: ${file}`);
  if(mode==='rehearse'){
    if(!/^amc_restore_[a-f0-9]{12}_test$/.test(restored))throw new Error('Unsafe restore target');
    pg('createdb','-U',user,restored);created=true;
    pg('pg_restore','-U',user,'--no-owner','--no-privileges','--exit-on-error','-d',restored,temp);
    if(JSON.stringify(snapshot(restored))!==JSON.stringify(expected))throw new Error('Restored table counts differ');
    if(sql(restored,'SELECT 1')!=='1')throw new Error('Restored database query failed');
    console.log(`Restore PASS: schema/constraints restored, ${Object.keys(expected).length} table counts match; original database untouched.`);
  }
}finally{
  await connection.end();
  if(created)pg('dropdb','-U',user,restored);
  if(native)rmSync(temp,{force:true});else docker('exec',container,'rm','-f',temp);
}

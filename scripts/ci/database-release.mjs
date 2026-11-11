import {createHash} from 'node:crypto';
import {open,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {inspectMigrations,migrationTarget,ReleasePolicyError} from './migrations.mjs';
import {runDatabaseCommand as run,postgresEnvironment as pgEnvironment} from './database-command.mjs';
import {archiveExtensions,missingExtensions} from './restore-extensions.mjs';
const mode=process.argv[2];
const directory=resolve(process.env.RUNNER_TEMP||'.tmp','amc-database-release');
const dump=join(directory,'database.dump'),encrypted=join(directory,'database.dump.enc');
async function rowCounts(connection){
  const {Client}=createRequire(new URL('../../apps/api/package.json',import.meta.url))('pg');
  const target=migrationTarget({DIRECT_URL:connection});
  const db=new Client({connectionString:connection,options:`-c search_path=${target.schema}`,connectionTimeoutMillis:10000,statement_timeout:30000});
  try{
    await db.connect();await db.query('BEGIN READ ONLY');
    const tables=(await db.query('SELECT tablename FROM pg_tables WHERE schemaname=$1',[target.schema])).rows;
    const counts={};
    for(const {tablename:name} of tables){
      if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))throw new ReleasePolicyError('Unexpected table identifier in restore rehearsal');
      counts[name]=Number((await db.query(`SELECT count(*) AS count FROM "${name}"`)).rows[0].count);
    }
    await db.query('ROLLBACK');return counts;
  }finally{await db.end();}
}
try{
  await mkdir(directory,{recursive:true,mode:0o700});
  if(mode==='backup'){
    if((process.env.BACKUP_ENCRYPTION_KEY?.length||0)<32)throw new ReleasePolicyError('Set a strong BACKUP_ENCRYPTION_KEY secret');
    const state=await inspectMigrations();
    await writeFile(join(directory,'manifest.json'),JSON.stringify({...state,createdAt:new Date().toISOString(),commit:process.env.GITHUB_SHA},null,2));
    const file=await open(dump,'w',0o600);
    try{run('backup_dump','pg_dump',['--no-password','--format=custom','--no-owner','--no-privileges'],{env:pgEnvironment(process.env.DIRECT_URL),stdio:['ignore',file.fd,'pipe']});}finally{await file.close();}
    run('backup_encrypt','openssl',['enc','-aes-256-cbc','-salt','-pbkdf2','-iter','200000','-in',dump,'-out',encrypted,'-pass','env:BACKUP_ENCRYPTION_KEY']);
    const encryptedHash=createHash('sha256').update(await readFile(encrypted)).digest('hex');
    await writeFile(join(directory,'backup.json'),JSON.stringify({sha256:encryptedHash,commit:process.env.GITHUB_SHA,createdAt:new Date().toISOString(),format:'openssl-aes-256-cbc-pbkdf2-200000'},null,2));
    await rm(dump);
    console.log(JSON.stringify({event:'encrypted_database_backup_created',pending:state.pending.length}));
  }else if(mode==='rehearse'){
    const local=migrationTarget({DIRECT_URL:process.env.REHEARSAL_DATABASE_URL});
    if(!['127.0.0.1','localhost'].includes(local.url.hostname)||!local.url.pathname.endsWith('_test'))throw new ReleasePolicyError('Rehearsal requires isolated local *_test PostgreSQL');
    // Use the same native client environment as restore, before decrypting data.
    run('rehearsal_connect','psql',['--no-password','--no-psqlrc','--set','ON_ERROR_STOP=1','--command','SELECT 1'],{env:pgEnvironment(local.url.href)});
    const expected=JSON.parse(await readFile(join(directory,'backup.json'),'utf8')).sha256;
    if(createHash('sha256').update(await readFile(encrypted)).digest('hex')!==expected)throw new ReleasePolicyError('Encrypted backup checksum mismatch');
    run('rehearsal_decrypt','openssl',['enc','-d','-aes-256-cbc','-pbkdf2','-iter','200000','-in',encrypted,'-out',dump,'-pass','env:BACKUP_ENCRYPTION_KEY']);
    // Inspect only extension TOC entries. Never emit SQL, table names or archive contents.
    const required=archiveExtensions(run('rehearsal_extensions','pg_restore',['--list',dump]));
    const available=run('rehearsal_extensions','psql',['--no-password','--no-psqlrc','--tuples-only','--no-align','--set','ON_ERROR_STOP=1','--command','SELECT name FROM pg_available_extensions'],{env:pgEnvironment(local.url.href)});
    const missing=missingExtensions(required,available);
    if(missing.length){
      const action=missing.includes('prisma_postgres')
        ? 'The source archive requires the Prisma Postgres provider extension. Rehearse the full archive on a separate provider-compatible isolated database with that extension; do not install an unverified substitute or skip archive entries'
        : 'Install matching PostgreSQL 18 extension packages on the isolated rehearsal runner; do not skip archive entries';
      throw new ReleasePolicyError(JSON.stringify({event:'rehearsal_extensions_missing',extensions:missing,action}));
    }
    const file=await open(dump,'r');
    try{run('rehearsal_restore','pg_restore',['--no-password','--no-owner','--no-privileges','--exit-on-error','--dbname',decodeURIComponent(local.url.pathname.slice(1))],{env:pgEnvironment(local.url.href),stdio:[file.fd,'pipe','pipe']});}finally{await file.close();}
    const state=await inspectMigrations({DIRECT_URL:local.url.href});
    if(JSON.stringify(state.pending)!==JSON.stringify(JSON.parse(await readFile(join(directory,'manifest.json'),'utf8')).pending))throw new ReleasePolicyError('Restored migration state differs from production snapshot');
    const before=await rowCounts(local.url.href);
    run('rehearsal_migrate',process.execPath,[resolve('apps/api/node_modules/prisma/build/index.js'),'migrate','deploy'],{cwd:resolve('apps/api'),env:{...process.env,NODE_ENV:'test',DIRECT_URL:local.url.href,DATABASE_URL:local.url.href}});
    const after=await inspectMigrations({DIRECT_URL:local.url.href});
    if(after.pending.length)throw new ReleasePolicyError('Rehearsal left pending migrations');
    const counts=await rowCounts(local.url.href);
    if(Object.entries(before).some(([table,count])=>counts[table]===undefined||counts[table]<count))throw new ReleasePolicyError('Migration rehearsal removed a table or existing records');
    await rm(dump);
    console.log('Backup restore and pending migration rehearsal passed on isolated local PostgreSQL.');
  }else throw new ReleasePolicyError('Use database-release.mjs backup|rehearse');
}catch(error){console.error(error instanceof ReleasePolicyError?error.message:'Database backup/rehearsal failed; provider output was suppressed');process.exitCode=1;}
finally{
  try{await rm(dump,{force:true});}
  catch{console.error('Temporary plaintext backup cleanup failed');process.exitCode=1;}
}

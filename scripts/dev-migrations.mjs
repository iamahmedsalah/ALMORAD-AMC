import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {inspectMigrations,migrationTarget,ReleasePolicyError} from './ci/migrations.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));

export function developmentTarget(env){
  if(env.VERCEL||env.CI||env.NODE_ENV&&env.NODE_ENV!=='development')throw new ReleasePolicyError('Development migrations require a local development environment');
  const runtime=migrationTarget({DATABASE_URL:env.DATABASE_URL});
  const direct=migrationTarget(env);
  const local=target=>['127.0.0.1','localhost','[::1]'].includes(target.url.hostname)&&/^amc_[a-z0-9_]+$/.test(decodeURIComponent(target.url.pathname.slice(1)))&&decodeURIComponent(target.url.pathname).endsWith('_dev');
  const hosted=target=>!['127.0.0.1','localhost','[::1]'].includes(target.url.hostname);
  const authorizedHosted=hosted(runtime)&&hosted(direct)&&(env.AMC_RELEASE_MIGRATIONS==='0'||env.AMC_RELEASE_MIGRATIONS==='1'&&env.AMC_MIGRATION_POLICY==='development');
  if(!(local(runtime)&&local(direct))&&!authorizedHosted)throw new ReleasePolicyError('Hosted development migrations require AMC_RELEASE_MIGRATIONS=1 and AMC_MIGRATION_POLICY=development');
  if(runtime.url.pathname!==direct.url.pathname||runtime.schema!==direct.schema||
    (authorizedHosted?(runtime.url.username!==direct.url.username||runtime.url.password!==direct.url.password):(runtime.url.port||'5432')!==(direct.url.port||'5432')))throw new ReleasePolicyError('Runtime and migration URLs must use the same development database and schema');
  return direct;
}

export function developmentFailure(error){
  if(error instanceof ReleasePolicyError)return error.message;
  const code=error?.code||error?.cause?.code;
  if(['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','ETIMEDOUT'].includes(code)||/timeout|timed out|connection terminated/i.test(error?.message||''))return 'Development database connection failed or timed out. Check network access and DATABASE_URL / DIRECT_URL, then retry.';
  if(code==='28P01')return 'Development database authentication failed. Check the configured database credentials.';
  if(/certificate|TLS|SSL/i.test(error?.message||''))return 'Development database TLS verification failed. Check the configured certificate and SSL settings.';
  return 'Development migration inspection failed. Check database connectivity and migration configuration; credentials were not logged.';
}

export async function migrateDevelopment(env=process.env,{inspect=inspectMigrations,execute=spawnSync}={}){
  developmentTarget(env);
  const localEnv={...env,NODE_ENV:'development'};
  const before=await inspect(localEnv,{connectionTimeoutMillis:30000});
  const cli=resolve(root,'apps/api/node_modules/prisma/build/index.js');
  const run=command=>{
    const result=execute(process.execPath,[cli,...command],{cwd:resolve(root,'apps/api'),env:localEnv,encoding:'utf8',timeout:180000,windowsHide:true});
    if(result.error||result.status!==0)throw new ReleasePolicyError(command[0]==='generate'?'Local Prisma client generation failed':'Local migration failed; inspect migration history before retrying');
  };
  const enabled=env.AMC_RELEASE_MIGRATIONS!=='0';
  if(before.pending.length&&enabled)run(['migrate','deploy']);
  const after=await inspect(localEnv,{connectionTimeoutMillis:30000});
  if(after.pending.length&&enabled)throw new ReleasePolicyError('Development database still has pending migrations');
  run(['generate']);
  return {event:enabled?'development_migrations_verified':'development_migrations_skipped',applied:enabled?before.pending.length:0,pending:after.pending.length,clientGenerated:true};
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  try{
    const file=resolve(root,'.env');if(existsSync(file))loadEnvFile(file);
    console.log(JSON.stringify(await migrateDevelopment()));
  }catch(error){console.error(developmentFailure(error));process.exitCode=1;}
}

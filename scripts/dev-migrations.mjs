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
  if(!local(runtime)||!local(direct))throw new ReleasePolicyError('Development migrations require local amc_*_dev PostgreSQL; hosted URLs are refused');
  if(runtime.url.pathname!==direct.url.pathname||(runtime.url.port||'5432')!==(direct.url.port||'5432')||runtime.schema!==direct.schema)throw new ReleasePolicyError('Runtime and migration URLs must use the same local development database and schema');
  return direct;
}

export async function migrateDevelopment(env=process.env,{inspect=inspectMigrations,execute=spawnSync}={}){
  developmentTarget(env);
  const localEnv={...env,NODE_ENV:'development'};
  const before=await inspect(localEnv);
  const cli=resolve(root,'apps/api/node_modules/prisma/build/index.js');
  const run=command=>{
    const result=execute(process.execPath,[cli,...command],{cwd:resolve(root,'apps/api'),env:localEnv,encoding:'utf8',timeout:180000});
    if(result.error||result.status!==0)throw new ReleasePolicyError(command[0]==='generate'?'Local Prisma client generation failed':'Local migration failed; inspect migration history before retrying');
  };
  if(before.pending.length)run(['migrate','deploy']);
  const after=await inspect(localEnv);
  if(after.pending.length)throw new ReleasePolicyError('Development database still has pending migrations');
  run(['generate']);
  return {event:'development_migrations_verified',applied:before.pending.length,pending:0,clientGenerated:true};
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  try{
    const file=resolve(root,'.env');if(existsSync(file))loadEnvFile(file);
    console.log(JSON.stringify(await migrateDevelopment()));
  }catch(error){console.error(error instanceof ReleasePolicyError?error.message:'Development migration setup failed; credentials were not logged');process.exitCode=1;}
}

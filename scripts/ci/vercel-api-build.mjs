import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {deployMigrations,ReleasePolicyError} from './migrations.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
// Schema checks run outside Turbo's build cache, before candidate health checks.
export async function buildVercelApi(env=process.env,{execute=spawnSync,migrate=deployMigrations}={}){
  const result=execute(process.execPath,[resolve(root,'node_modules/turbo/bin/turbo'),'run','build','--filter=@amc/api'],{cwd:root,env,stdio:'inherit'});
  if(result.error||result.status!==0)throw new ReleasePolicyError('API build failed; database migrations were not started');
  if(['production','preview'].includes(env.VERCEL_ENV)&&env.AMC_RELEASE_MIGRATIONS==='1')await migrate(env);
  else console.log('Vercel build: migrations skipped.');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  try{await buildVercelApi();}
  catch(error){console.error(error instanceof ReleasePolicyError?error.message:'Production schema release gate failed; do not reset the database.');process.exitCode=1;}
}

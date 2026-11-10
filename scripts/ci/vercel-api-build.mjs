import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {deployMigrations} from './migrations.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
// Build and verify the artifact before touching the production schema. Turbo may
// cache compilation; migration inspection always runs outside the cached task.
const result=spawnSync(process.execPath,[resolve(root,'node_modules/turbo/bin/turbo'),'run','build','--filter=@amc/api'],{cwd:root,env:process.env,stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
if(process.env.VERCEL_ENV==='production'){
  try{await deployMigrations();}catch{console.error('Production schema release gate failed. Use the reviewed CI release with backup/rehearsal; do not reset the database.');process.exitCode=1;}
}else console.log('Preview/local build: production migrations skipped.');

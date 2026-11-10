import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {cp,mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
const apiPackage=new URL('../apps/api/package.json',import.meta.url);
const require=createRequire(apiPackage);
const manifest=require(fileURLToPath(apiPackage));
const dependencies=Object.keys(manifest.dependencies);
const source=fileURLToPath(new URL('../apps/api/dist/apps/api/src/',import.meta.url));
if(JSON.parse(await readFile(join(source,'package.json'),'utf8')).type!=='module')throw new Error('Compiled API must carry its ESM package boundary');
async function assertRealFiles(directory){
  for(const item of await readdir(directory,{withFileTypes:true})){
    if(item.isSymbolicLink())throw new Error('Standalone API contains a workspace link');
    if(item.isDirectory())await assertRealFiles(join(directory,item.name));
  }
}
await assertRealFiles(source);
const tempRoot=resolve(tmpdir());
const target=await mkdtemp(join(tempRoot,'amc-api-check-'));
try{
  await cp(source,target,{recursive:true});
  const expression=`import {createRequire} from 'node:module';const require=createRequire(${JSON.stringify(pathToFileURL(join(target,'package.json')).href)});for(const dependency of ${JSON.stringify(dependencies)})require.resolve(dependency);await import(${JSON.stringify(pathToFileURL(join(target,'app.module.js')).href)});`;
  // Import metadata/providers only: no Nest startup, DB connection or delivery.
  const result=spawnSync(process.execPath,['--input-type=module','-e',expression],{cwd:target,encoding:'utf8',env:{...process.env,NODE_PATH:''},timeout:30000});
  if(result.error||result.status!==0)throw new Error('Isolated compiled API import failed: '+(result.error?.message||result.stderr));
  console.log(`API isolated runtime import passed (${dependencies.length} direct dependencies, outside workspace).`);
  const handshake=spawnSync(process.execPath,[fileURLToPath(new URL('./check-api-entrypoint.mjs',import.meta.url)),target],{cwd:target,encoding:'utf8',env:{...process.env,NODE_PATH:''},timeout:15000});
  if(handshake.error||handshake.status!==0)throw new Error('API listener handshake failed: '+(handshake.error?.message||handshake.stderr));
  console.log(handshake.stdout.trim());
}finally{
  const absolute=resolve(target);
  if(!absolute.startsWith(tempRoot+sep)||!absolute.startsWith(join(tempRoot,'amc-api-check-')))throw new Error('Refusing cleanup outside generated temporary runtime');
  await rm(absolute,{recursive:true,force:true});
}

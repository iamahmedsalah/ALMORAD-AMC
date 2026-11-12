import {createRequire} from 'node:module';
import {cp,mkdir,readFile,realpath,writeFile} from 'node:fs/promises';
import {dirname,join,resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const apiRoot=fileURLToPath(new URL('../apps/api/',import.meta.url));
const runtimeRoot=resolve(apiRoot,'dist/apps/api/src');
const output=join(runtimeRoot,'node_modules');
const rootRequire=createRequire(join(apiRoot,'package.json'));
const roots=new Map(),copied=new Set();
let count=0;
async function materialize(name,fromRequire,parentOutput){
  let packagePath;
  try{packagePath=fromRequire.resolve(`${name}/package.json`);}catch(error){
    if(error.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED')throw error;
    let directory=dirname(await realpath(fromRequire.resolve(name)));
    while(true){
      const candidate=join(directory,'package.json');
      try{if(JSON.parse(await readFile(candidate,'utf8')).name===name){packagePath=candidate;break;}}catch{}
      const parent=dirname(directory);if(parent===directory)throw new Error(`Cannot locate runtime package ${name}`);directory=parent;
    }
  }
  const source=dirname(await realpath(packagePath));
  const manifest=JSON.parse(await readFile(packagePath,'utf8'));
  // Share matching versions at the runtime root. Conflicting versions stay nested.
  // Mark before recursion so dependency cycles reuse the already selected package.
  if(!roots.has(name))roots.set(name,manifest.version);
  const target=resolve(roots.get(name)===manifest.version?output:parentOutput,name);
  if(!target.startsWith(output+sep)||relative(output,target).startsWith('..'))throw new Error('Runtime output must remain inside compiled API node_modules');
  if(copied.has(target))return;
  copied.add(target);
  await mkdir(dirname(target),{recursive:true});
  await cp(source,target,{recursive:true,dereference:true,filter:path=>!relative(source,path).split(sep).includes('node_modules')});
  const require=createRequire(packagePath);
  for(const dependency of Object.keys(manifest.dependencies||{}))await materialize(dependency,require,join(target,'node_modules'));
  count++;
}
const apiManifest=JSON.parse(await readFile(join(apiRoot,'package.json'),'utf8'));
// Reserve direct versions before traversing transitive dependencies.
for(const name of Object.keys(apiManifest.dependencies)){
  const entry=rootRequire.resolve(name);
  let directory=dirname(await realpath(entry));
  while(true){
    try{const manifest=JSON.parse(await readFile(join(directory,'package.json'),'utf8'));if(manifest.name===name){roots.set(name,manifest.version);break;}}catch{}
    const parent=dirname(directory);if(parent===directory)throw new Error(`Cannot locate direct package ${name}`);directory=parent;
  }
}
for(const name of Object.keys(apiManifest.dependencies))await materialize(name,rootRequire,output);
await cp(join(apiRoot,'src/modules/notifications/assets'),join(runtimeRoot,'modules/notifications/assets'),{recursive:true});
// Vercel relocates this directory to /var/task. Everything needed by Node must
// live inside it, including the ESM boundary and real dependency directories.
await writeFile(join(runtimeRoot,'package.json'),JSON.stringify({private:true,type:'module'})+'\n');
console.log(`API standalone runtime staged (${count} packages, no workspace links).`);

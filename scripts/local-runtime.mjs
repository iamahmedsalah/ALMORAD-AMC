import {existsSync,readFileSync,mkdirSync,cpSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadEnvFile} from 'node:process';
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:https';
import {request as httpRequest} from 'node:http';
import {inspectMigrations} from './ci/migrations.mjs';
import {migrateDevelopment} from './dev-migrations.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const apiRequire=createRequire(new URL('../apps/api/package.json',import.meta.url));
const localHosts=['localhost','127.0.0.1','[::1]'];
export function runtimeEnvironment(mode,input){
  if(input.VERCEL||input.CI)throw new Error('Local runtime commands cannot run in CI or Vercel.');
  if(!['setup','check','preview','build','cert'].includes(mode))throw new Error('Use setup, check, build, cert or preview.');
  if(mode!=='cert'){
    let database;
    try{database=new URL(input.DATABASE_URL);}catch{throw new Error('Set DATABASE_URL in the root .env.');}
    if(!['postgres:','postgresql:'].includes(database.protocol)||!database.hostname||database.pathname.length<2)throw new Error('DATABASE_URL must be a PostgreSQL TCP URL from your database provider.');
  }
  const env={...input};
  // The origin belongs to the local browser; database/mail credentials stay intact.
  if(['preview','build'].includes(mode)){
    for(const key of ['STAFF_PROXY_SECRET','STAFF_CSRF_SECRET','BOOKING_TOKEN_SECRET']){
      if((env[key]?.length??0)<64)throw new Error(`Set ${key} to at least 64 random characters in .env.`);
    }
    if(env.RESEND_API_KEY==='mock')throw new Error('Use a real RESEND_API_KEY or leave it unset; this is not demo mode.');
    Object.assign(env,{NODE_ENV:'production',API_HOST:'127.0.0.1',API_PORT:'4401',PORT:'4401',WEB_ORIGIN:'https://localhost:4443',STAFF_API_ORIGIN:'http://127.0.0.1:4401',AMC_RELEASE_MIGRATIONS:'0'});
  }
  return env;
}

export async function verifyDatabase(env){
  // Both operations are read only. No migration, seed, outbox drain or provider call.
  const {Client}=apiRequire('pg');
  const db=new Client({connectionString:env.DATABASE_URL,connectionTimeoutMillis:10000,query_timeout:10000});
  try{
    await db.connect();
    await db.query('BEGIN READ ONLY');
    await db.query('SELECT 1');
    await db.query('ROLLBACK');
  }catch{throw new Error('Cannot connect to DATABASE_URL. Check the provider URL, TLS/network access and credentials; values were not logged.');}
  finally{await db.end();}
  let state;
  try{state=await inspectMigrations(env);}catch{throw new Error('Cannot verify migration history through DIRECT_URL (or DATABASE_URL). No schema changes were attempted.');}
  if(state.pending.length)throw new Error(`${state.pending.length} migrations are pending. Run pnpm dev:setup with the authorized development migration settings before starting the preview.`);
  console.log(JSON.stringify({event:'local_database_verified',target:localHosts.includes(new URL(env.DATABASE_URL).hostname)?'loopback':'hosted',pendingMigrations:0}));
}

function run(args,cwd,env){
  const result=spawnSync(process.execPath,args,{cwd,env,stdio:'inherit',windowsHide:true});
  if(result.error||result.status!==0)throw new Error('Local command failed. See the command output above.');
}
function certificateFiles(env){
  return {cert:resolve(root,env.LOCAL_HTTPS_CERT||'.tmp/local-https/localhost-cert.pem'),key:resolve(root,env.LOCAL_HTTPS_KEY||'.tmp/local-https/localhost-key.pem')};
}
export function createCertificate(env){
  const files=certificateFiles(env);
  if(existsSync(files.cert)&&existsSync(files.key)){console.log('Local certificate already exists.');return;}
  if(existsSync(files.cert)||existsSync(files.key))throw new Error('Only one TLS file exists. Configure a matching LOCAL_HTTPS_CERT and LOCAL_HTTPS_KEY.');
  const openssl=env.LOCAL_OPENSSL||(process.platform==='win32'&&existsSync('C:/Program Files/Git/usr/bin/openssl.exe')?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl');
  mkdirSync(dirname(files.cert),{recursive:true});mkdirSync(dirname(files.key),{recursive:true});
  const result=spawnSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-keyout',files.key,'-out',files.cert,'-days','30','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore',windowsHide:true});
  if(result.error||result.status!==0)throw new Error('Certificate creation failed. Install OpenSSL or set LOCAL_HTTPS_CERT and LOCAL_HTTPS_KEY to existing local certificate files.');
  console.log('Created an untrusted localhost certificate under .tmp/local-https. No system trust settings changed.');
}

export function proxyRequest(req,res,port=4400){
  const upstream=httpRequest({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers:{...req.headers,host:'localhost:4443','x-forwarded-host':'localhost:4443','x-forwarded-proto':'https'}},response=>{
    res.writeHead(response.statusCode||502,{...response.headers,'x-robots-tag':'noindex, nofollow'});response.pipe(res);
  });
  upstream.setTimeout(30000,()=>upstream.destroy());
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'content-type':'text/plain'});res.end('Local preview is starting or unavailable.');});
  req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
}

export async function preview(env){
  const files=certificateFiles(env);
  if(!existsSync(files.cert)||!existsSync(files.key))throw new Error('Run pnpm preview:cert first, or configure LOCAL_HTTPS_CERT and LOCAL_HTTPS_KEY.');
  const api=resolve(root,'apps/api/dist/apps/api/src/main.js');
  const standalone=resolve(root,'apps/web/.next/standalone/apps/web');
  if(!existsSync(api)||!existsSync(resolve(standalone,'server.js')))throw new Error('Run pnpm preview:build first to build the API and standalone website.');
  await verifyDatabase(env);
  cpSync(resolve(root,'apps/web/public'),resolve(standalone,'public'),{recursive:true});
  cpSync(resolve(root,'apps/web/.next/static'),resolve(standalone,'.next/static'),{recursive:true});
  const children=[];
  const server=createServer({cert:readFileSync(files.cert),key:readFileSync(files.key)},proxyRequest);
  let stopping=false;
  const stop=()=>{if(stopping)return;stopping=true;server.close();server.closeAllConnections();for(const child of children)child.kill();};
  server.on('error',()=>{console.error('Cannot bind local HTTPS port 4443.');process.exitCode=1;stop();});
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,stop);
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4443,'127.0.0.1',resolve);});
  for(const [entry,cwd,extra] of [[api,resolve(root,'apps/api'),{}],[resolve(standalone,'server.js'),standalone,{PORT:'4400',HOSTNAME:'127.0.0.1'}]]){
    const child=spawn(process.execPath,[entry],{cwd,env:{...env,...extra},stdio:'inherit',windowsHide:true});children.push(child);
    child.on('error',()=>{console.error('Local preview process failed to start.');process.exitCode=1;stop();});
    child.on('exit',code=>{if(!stopping){process.exitCode=code||1;stop();}});
  }
  console.log('Production-mode local preview: https://localhost:4443/en and /ar. Real database and configured providers are active.');
}

async function main(){
  const file=resolve(root,'.env');if(existsSync(file))loadEnvFile(file);
  const mode=process.argv[2];const env=runtimeEnvironment(mode,process.env);
  if(mode==='cert'){createCertificate(env);return;}
  if(mode==='build'){
    run([resolve(root,'node_modules/turbo/bin/turbo'),'run','build'],root,env);return;
  }
  if(mode==='preview'){await preview(env);return;}
  if(mode==='setup')console.log(JSON.stringify(await migrateDevelopment(env)));
  await verifyDatabase(env);
  console.log('Database configuration ready. pnpm dev uses this .env without Docker.');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  main().catch(error=>{console.error(error instanceof Error?error.message:'Local runtime failed; credentials were not logged.');process.exitCode=1;});
}

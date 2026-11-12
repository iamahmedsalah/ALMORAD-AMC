import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseEnv} from 'node:util';
import {spawn} from 'node:child_process';

const workspace=fileURLToPath(new URL('../',import.meta.url));
const read=(root,file)=>existsSync(resolve(root,file))?parseEnv(readFileSync(resolve(root,file),'utf8')):{};
export function profileEnvironment(profile,root=workspace,inherited=process.env){
 if(!['base','local','prod'].includes(profile))throw new Error('Use base, local or prod.');
 const required=profile==='prod'?'.env.prod':'.env';
 if(!existsSync(resolve(root,required)))throw new Error(`Missing ${required}; see .env.example.`);
 const base=read(root,'.env');
 // Existing API/CLI commands load .env again. Defined empty entries prevent
 // those loaders from filling omitted production keys with development secrets.
 const values=profile==='prod'?{...Object.fromEntries(Object.keys(base).map(key=>[key,''])),...read(root,'.env.prod')}:{...base,...(profile==='local'?read(root,'.env.local'):{})};
 return {...values,...inherited,...(profile==='base'?{}:{NODE_ENV:profile==='prod'?'production':'development'})};
}
export function auditEnvironment(env,{production=false}={}){
 const missing=[],invalid=[],warnings=[];
 for(const key of ['DATABASE_URL','WEB_ORIGIN','STAFF_PROXY_SECRET','STAFF_CSRF_SECRET','BOOKING_TOKEN_SECRET','CRON_SECRET'])if(!env[key])missing.push(key);
 for(const key of ['STAFF_PROXY_SECRET','STAFF_CSRF_SECRET','BOOKING_TOKEN_SECRET'])if(env[key]&&env[key].length<64)invalid.push(key);
 if(env.CRON_SECRET&&env.CRON_SECRET.length<32)invalid.push('CRON_SECRET');
 for(const key of ['DATABASE_URL','DIRECT_URL'])if(env[key]){try{const url=new URL(env[key]);if(!['postgres:','postgresql:'].includes(url.protocol)||url.pathname.length<2||url.hostname.endsWith('.invalid')||['USER','PASSWORD'].some(value=>decodeURIComponent(url.username)===value||decodeURIComponent(url.password)===value))invalid.push(key);else if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&url.searchParams.get('sslmode')!=='verify-full')warnings.push(`${key}: confirm provider TLS certificate verification`);}catch{invalid.push(key);}}
 for(const key of ['WEB_ORIGIN','EMAIL_SITE_URL','NEXT_PUBLIC_SITE_URL','STAFF_API_ORIGIN'])if(env[key]){try{const url=new URL(env[key]);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash||(production&&key!=='STAFF_API_ORIGIN'&&url.protocol!=='https:'))invalid.push(key);}catch{invalid.push(key);}}
 if(!production&&!env.STAFF_API_ORIGIN)missing.push('STAFF_API_ORIGIN');
 if(production&&!env.STAFF_API_ORIGIN)warnings.push('STAFF_API_ORIGIN: supplied by the Vercel web-to-API service binding; local HTTPS preview supplies its own');
 if(env.RESEND_API_KEY){for(const key of ['RESEND_FROM_EMAIL','RESEND_BOOKING_FROM_EMAIL','CONTACT_INBOX_EMAIL','BOOKING_INBOX_EMAIL','REPLY_TO_EMAIL']){if(!env[key])missing.push(key);else if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env[key].match(/<([^<>]+)>$/)?.[1]||env[key]))invalid.push(key);}if(production&&[env.RESEND_FROM_EMAIL,env.RESEND_BOOKING_FROM_EMAIL].some(value=>/@resend\.dev(?:>|$)/i.test(value||'')))invalid.push('RESEND_FROM_EMAIL / RESEND_BOOKING_FROM_EMAIL');}
 if(env.HUBSPOT_ACCESS_TOKEN){if(!env.HUBSPOT_PORTAL_ID)missing.push('HUBSPOT_PORTAL_ID');else if(!/^\d+$/.test(env.HUBSPOT_PORTAL_ID))invalid.push('HUBSPOT_PORTAL_ID');if(!env.HUBSPOT_CONTACT_MESSAGE_PROPERTY)warnings.push('HUBSPOT_CONTACT_MESSAGE_PROPERTY: defaults to message');}
 if(production&&env.BOOKING_APPROVED!=='true')warnings.push('BOOKING_APPROVED: production booking remains disabled until approved');
 if(production&&!env.NEXT_PUBLIC_SITE_URL)warnings.push('NEXT_PUBLIC_SITE_URL: public indexing remains disabled until a verified origin is supplied');
 return {ok:!missing.length&&!invalid.length,missing:[...new Set(missing)],invalid:[...new Set(invalid)],warnings};
}
async function main(){
 const [mode,...rest]=process.argv.slice(2);
 if(mode==='check'){
  const selected=rest[0]==='--'?rest.slice(1):rest;
  const profiles=selected.length?selected:['base','local','prod'];let failed=false;
  if(profiles.some(profile=>!['base','local','prod'].includes(profile)))throw new Error('Select base, local or prod.');
  for(const profile of profiles){try{const result=auditEnvironment(profileEnvironment(profile,workspace,{}),{production:profile==='prod'});console.log(JSON.stringify({profile,...result}));failed||=!result.ok;}catch{console.log(JSON.stringify({profile,ok:false,error:'Profile file missing or invalid; no values printed'}));failed=true;}}
  if(failed)process.exitCode=1;return;
 }
 if(!['local','prod'].includes(mode))throw new Error('Use pnpm env:check, pnpm env:local -- <script>, or pnpm env:prod -- <script>.');
 if(process.env.CI||process.env.VERCEL)throw new Error('Environment file profiles are for local use; hosted platforms must inject their environment settings.');
 const args=rest[0]==='--'?rest.slice(1):rest,script=args.shift();
 const env=profileEnvironment(mode);
 const validation=auditEnvironment(env,{production:mode==='prod'});
 if(!script){console.log(JSON.stringify({profile:mode,...validation}));if(!validation.ok)process.exitCode=1;return;}
 if(!validation.ok)throw new Error(`Invalid ${mode} profile keys: ${[...validation.missing,...validation.invalid].join(', ')}`);
 const scripts=JSON.parse(readFileSync(resolve(workspace,'package.json'),'utf8')).scripts;
 if(!scripts[script]||script.startsWith('env:'))throw new Error('Select an existing application script, not another environment launcher.');
 const runner=process.env.npm_execpath;
 if(!runner||!/\.(?:c?js|mjs)$/i.test(runner))throw new Error('Run this launcher through pnpm env:local or pnpm env:prod.');
 const child=spawn(process.execPath,[runner,'run',script,...args],{cwd:workspace,env,stdio:'inherit',windowsHide:true});
 child.on('error',()=>{console.error('Profile command failed to start.');process.exitCode=1;});
 child.on('exit',code=>{process.exitCode=code??1;});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main().catch(error=>{console.error(error instanceof Error?error.message:'Environment profile failed; no values printed.');process.exitCode=1;});

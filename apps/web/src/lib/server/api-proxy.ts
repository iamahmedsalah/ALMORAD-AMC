import {NextRequest,NextResponse} from 'next/server';
import {ipAddress} from '@vercel/functions';
import {proxyClient,signProxy} from '@amc/shared/server';

const publicAllowed:Record<string,string>={'config':'GET','slots':'GET','create':'POST','manage':'POST','action':'POST'};
const contactAllowed:Record<string,string>={'submit':'POST'};
const allowed:Record<string,string>={'auth/login':'POST','auth/logout':'POST','auth/password':'POST','auth/session':'GET','security/sessions':'GET','security/revoke':'POST','security/overview':'GET','security/audit':'GET','appointments':'GET','appointments/detail':'GET','appointments/create':'POST','appointments/action':'POST','booking-settings':'GET,POST','booking-analytics':'GET'};

export async function forward(request:NextRequest,endpoint:string,namespace:'staff'|'booking'|'contact'){
 const routes=namespace==='staff'?allowed:namespace==='contact'?contactAllowed:publicAllowed;
 const bodyLimit=namespace==='contact'?16384:namespace==='staff'&&endpoint==='booking-settings'?16384:4096;
 const unavailable=()=>NextResponse.json({message:namespace==='staff'?'Staff service unavailable':namespace==='contact'?'Contact service unavailable':'Booking service unavailable'},{status:503,headers});
 const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
 if(!routes[endpoint]?.split(',').includes(request.method))return NextResponse.json({message:'Not found'},{status:404,headers});
 const fallbackOrigin=process.env.VERCEL_PROJECT_PRODUCTION_URL?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`:request.nextUrl.origin||'http://localhost:3000';
 const expected=process.env.WEB_ORIGIN||fallbackOrigin;
 if(request.method==='POST'){
  const reqOrigin=request.headers.get('origin')||'';
  const origins=new Set([expected]);
  if(process.env.VERCEL_PROJECT_PRODUCTION_URL)origins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  if(process.env.VERCEL_URL)origins.add(`https://${process.env.VERCEL_URL}`);
  if(process.env.VERCEL_BRANCH_URL)origins.add(`https://${process.env.VERCEL_BRANCH_URL}`);
  let originUrl:URL;
  try{originUrl=new URL(reqOrigin);}catch{return NextResponse.json({message:'Forbidden'},{status:403,headers});}
  const isVercelHost=/^[a-zA-Z0-9.-]+\.vercel\.app$/.test(originUrl.hostname);
  const isSameHost=reqOrigin===request.nextUrl.origin;
  const local=process.env.NODE_ENV!=='production'&&isSameHost&&['127.0.0.1','localhost'].includes(request.nextUrl.hostname);
  if(!origins.has(reqOrigin)&&!local&&!(isSameHost&&isVercelHost))return NextResponse.json({message:'Forbidden'},{status:403,headers});
 }
 const value=process.env.STAFF_API_ORIGIN||(process.env.NODE_ENV==='production'?undefined:'http://127.0.0.1:4000');
 const secret=process.env.STAFF_PROXY_SECRET;
 if(!value||(process.env.NODE_ENV==='production'&&(!secret||secret.length<64)))return unavailable();
 let api:URL;
 try{
  api=new URL(value);
  const internalOrLocal=api.protocol==='http:'&&(['127.0.0.1','localhost','api','[::1]'].includes(api.hostname)||api.hostname.endsWith('.internal')||process.env.VERCEL_ENV==='development');
  if((api.protocol!=='https:'&&!internalOrLocal)||api.pathname!=='/'||api.username||api.password||api.search||api.hash)throw new Error();
 }catch{return unavailable();}
 if(request.method==='POST'&&(!request.headers.get('content-type')?.startsWith('application/json')||Number(request.headers.get('content-length')||0)>bodyLimit))return NextResponse.json({message:'Invalid request'},{status:400,headers});
 let body:string|undefined;
 if(request.method==='POST'){
  const reader=request.body?.getReader();const chunks:Uint8Array[]=[];let bytes=0;
  if(reader){while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>bodyLimit){await reader.cancel();return NextResponse.json({message:'Invalid request'},{status:413,headers});}chunks.push(chunk.value);}}
  body=Buffer.concat(chunks).toString('utf8');
 }
 const suffix=`/${namespace}/${endpoint}${request.method==='GET'?request.nextUrl.search:''}`;
 const targetUrl=new URL(suffix,api.origin);
 const forward=new Headers({'Content-Type':'application/json','Origin':expected});
 for(const name of ['cookie','x-csrf-token']){const v=request.headers.get(name);if(v)forward.set(name,v);}
 if(secret){const time=String(Date.now());const client=proxyClient(secret,process.env.VERCEL?(ipAddress(request)||'unknown'):'local-development');forward.set('X-AMC-Proxy-Time',time);forward.set('X-AMC-Client',client);forward.set('X-AMC-Proxy-Signature',signProxy(secret,{time,client,method:request.method,path:suffix,origin:expected,body:body||'',cookie:forward.get('cookie')||''}));}
 if(process.env.STAFF_API_BYPASS_TOKEN)forward.set('x-vercel-protection-bypass',process.env.STAFF_API_BYPASS_TOKEN);
 try{
  const upstream=await fetch(targetUrl,{method:request.method,headers:forward,body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  const payload=await upstream.text();
  // Platform invocation failures may be plain text/HTML, not the API's JSON contract.
  if(!upstream.headers.get('content-type')?.toLowerCase().includes('application/json'))return unavailable();
  try{JSON.parse(payload);}catch{return unavailable();}
  const response=new NextResponse(payload,{status:upstream.status,headers:{...headers,'Content-Type':'application/json'}});
  for(const cookie of upstream.headers.getSetCookie())response.headers.append('Set-Cookie',cookie);
  return response;
 }catch{
  if(process.env.NODE_ENV!=='production'){
   console.warn(`[API Proxy Warning] Unable to reach backend API at ${targetUrl.toString()}. Please check that the API (@amc/api) is running.`);
  }
  return unavailable();
 }
}

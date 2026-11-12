export function releaseOrigin(value){
 const origin=new URL(value||'');
 const vercel=origin.hostname.endsWith('.vercel.app');
 if(origin.protocol!=='https:'||!(vercel||origin.hostname==='almorad-amc.com')||origin.username||origin.password||origin.port||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('Release smoke requires an approved credential-free HTTPS origin');
 return {origin,vercel};
}
export function releaseHeaders(vercel,secret){return vercel&&secret?{'x-vercel-protection-bypass':secret}:{};}

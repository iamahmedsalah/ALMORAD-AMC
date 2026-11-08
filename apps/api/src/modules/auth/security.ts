import {createHash, randomBytes, scrypt, timingSafeEqual} from 'node:crypto';
const derive = (password:string,salt:Buffer) => new Promise<Buffer>((resolve,reject) => scrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key)));
export const tokenHash = (token:string) => createHash('sha256').update(token).digest('hex');
export async function hashPassword(password:string) {const salt=randomBytes(16);return `scrypt$1$${salt.toString('hex')}$${(await derive(password,salt)).toString('hex')}`;}
export async function verifyPassword(password:string,encoded:string|null|undefined) {
  const parts=encoded?.match(/^scrypt\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/);
  // Missing/disabled accounts still pay the same derivation cost.
  const derived=await derive(password,Buffer.from(parts?.[1]||'0'.repeat(32),'hex'));
  return Boolean(parts)&&timingSafeEqual(derived,Buffer.from(parts![2]!,'hex'));
}
export const sessionCookieName = () => process.env.NODE_ENV==='production'?'__Host-amc_session':'amc_session';
export function cookieToken(cookie:string|undefined) {const name=sessionCookieName();const values=(cookie||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(`${name}=`));if(values.length!==1)return undefined;return values[0]!.slice(name.length+1).match(/^[a-f0-9]{64}$/)?.[0];}
export function sameOrigin(origin:string|undefined) {
  if(!origin)return false;
  const expected=process.env.WEB_ORIGIN||'http://localhost:3000';
  if(origin===expected)return true;
  if(process.env.NODE_ENV==='production')return false;
  try {const url=new URL(origin);return url.origin===origin&&url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&['3000','3100'].includes(url.port);}catch{return false;}
}

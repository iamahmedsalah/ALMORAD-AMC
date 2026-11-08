import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
export type ProxyEnvelope={time:string;method:string;path:string;origin:string;client:string;body:string;cookie:string};
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function signProxy(secret:string,value:ProxyEnvelope){return createHmac('sha256',secret).update(JSON.stringify([value.time,value.method,value.path,value.origin,value.client,digest(value.body),digest(value.cookie)])).digest('hex');}
export function verifyProxy(secret:string,value:ProxyEnvelope,signature:string,now=Date.now()){
 if(!/^\d{13}$/.test(value.time)||Math.abs(now-Number(value.time))>60000||!value.client.match(/^[a-f0-9]{64}$/)||!signature.match(/^[a-f0-9]{64}$/))return false;
 return timingSafeEqual(Buffer.from(signProxy(secret,value),'hex'),Buffer.from(signature,'hex'));
}
export function proxyClient(secret:string,address:string){return createHmac('sha256',secret).update(`client:${address}`).digest('hex');}

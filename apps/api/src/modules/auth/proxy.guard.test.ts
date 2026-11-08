import 'reflect-metadata';
import {afterEach,expect,it,vi} from 'vitest';
import {randomBytes} from 'node:crypto';
import type {ExecutionContext} from '@nestjs/common';
import {proxyClient,signProxy} from '@amc/shared/server';
import {ProxyGuard,type ProxyRequest} from './proxy.guard.js';
afterEach(()=>vi.unstubAllEnvs());
it('rejects unsigned production staff calls and accepts only an intact signed envelope',()=>{
 const secret=randomBytes(32).toString('hex');vi.stubEnv('NODE_ENV','production');vi.stubEnv('STAFF_PROXY_SECRET',secret);
 const body='{"email":"fixture@example.invalid"}';const time=String(Date.now());const client=proxyClient(secret,'127.0.0.1');
 const headers:Record<string,string>={origin:'https://example.invalid','x-amc-proxy-time':time,'x-amc-client':client};
 const req={path:'/staff/auth/login',originalUrl:'/staff/auth/login',method:'POST',headers:{cookie:''},rawBody:Buffer.from(body),get:(name:string)=>headers[name.toLowerCase()]} as unknown as ProxyRequest;
 const context={switchToHttp:()=>({getRequest:()=>req})} as unknown as ExecutionContext;
 const guard=new ProxyGuard();expect(()=>guard.canActivate(context)).toThrow();
 headers['x-amc-proxy-signature']=signProxy(secret,{time,client,origin:headers.origin!,method:req.method,path:req.originalUrl,body,cookie:''});
 expect(guard.canActivate(context)).toBe(true);expect(req.trustedClient).toBe(client);
 req.rawBody=Buffer.from('{}');expect(()=>guard.canActivate(context)).toThrow();
});

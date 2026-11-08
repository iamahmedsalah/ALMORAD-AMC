import {type CanActivate,type ExecutionContext,ForbiddenException,Injectable} from '@nestjs/common';
import {randomBytes} from 'node:crypto';
import {proxyClient,verifyProxy} from '@amc/shared/server';
import type {RawBodyRequest} from '@nestjs/common';
import type {Request} from 'express';
export type ProxyRequest=RawBodyRequest<Request>&{trustedClient?:string};
@Injectable()
export class ProxyGuard implements CanActivate {
 private readonly secret=process.env.STAFF_PROXY_SECRET||randomBytes(32).toString('hex');
 constructor(){if(process.env.NODE_ENV==='production'&&(!process.env.STAFF_PROXY_SECRET||process.env.STAFF_PROXY_SECRET.length<64))throw new Error('STAFF_PROXY_SECRET must contain at least 64 characters in production');}
 canActivate(context:ExecutionContext){
  const request=context.switchToHttp().getRequest<ProxyRequest>();
  if(!request.path.startsWith('/staff')&&!request.path.startsWith('/booking')&&!request.path.startsWith('/contact'))return true;
  const signature=request.get('X-AMC-Proxy-Signature');
  if(!signature&&process.env.NODE_ENV!=='production'){request.trustedClient=proxyClient(this.secret,request.ip||'local');return true;}
  const value={time:request.get('X-AMC-Proxy-Time')||'',method:request.method,path:request.originalUrl,origin:request.get('Origin')||'',client:request.get('X-AMC-Client')||'',body:request.rawBody?.toString('utf8')||'',cookie:request.headers.cookie||''};
  if(!signature||!verifyProxy(this.secret,value,signature))throw new ForbiddenException();
  request.trustedClient=value.client;return true;
 }
}

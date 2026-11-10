import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {forward} from './api-proxy';

const origin='https://studio.example.invalid';
const request=(path:string,body?:string,requestOrigin=origin)=>new NextRequest(`${origin}/api/${path}`,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{origin:requestOrigin,'content-type':'application/json'},body});
beforeEach(()=>{
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('WEB_ORIGIN',origin);
 vi.stubEnv('STAFF_API_ORIGIN','https://backend.example.invalid');vi.stubEnv('STAFF_PROXY_SECRET','x'.repeat(64));
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('public API proxy failure boundary',()=>{
 for(const namespace of ['contact','booking'] as const)it(`normalizes platform invocation failures for ${namespace}`,async()=>{
  const fetch=vi.fn().mockResolvedValue(new Response('FUNCTION_INVOCATION_FAILED internal deployment details',{status:500,headers:{'content-type':'text/plain'}}));vi.stubGlobal('fetch',fetch);
  const response=await forward(request(`${namespace}/x`,namespace==='contact'?'{}':undefined),namespace==='contact'?'submit':'config',namespace);
  expect(response.status).toBe(503);expect(await response.json()).toEqual({message:namespace==='contact'?'Contact service unavailable':'Booking service unavailable'});
  expect(response.headers.get('cache-control')).toBe('private, no-store');
 });
 it('rejects malformed JSON even if the upstream labels it JSON',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('FUNCTION_INVOCATION_FAILED',{status:500,headers:{'content-type':'application/json'}})));
  const response=await forward(request('booking/config'),'config','booking');expect(response.status).toBe(503);
 });
 it('preserves successful committed-contact responses and signs the upstream request',async()=>{
  const fetch=vi.fn().mockResolvedValue(Response.json({accepted:true},{status:201}));vi.stubGlobal('fetch',fetch);
  const response=await forward(request('contact/submit','{}'),'submit','contact');
  expect(response.status).toBe(201);expect(await response.json()).toEqual({accepted:true});
  const [url,options]=fetch.mock.calls[0]!;expect(String(url)).toBe('https://backend.example.invalid/contact/submit');
  expect(options.headers.get('X-AMC-Proxy-Signature')).toBeTruthy();expect(options.headers.get('Origin')).toBe(origin);
 });
 it('preserves booking conflict responses rather than inventing success',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({message:'Slot unavailable'},{status:409})));
  const response=await forward(request('booking/create','{}'),'create','booking');expect(response.status).toBe(409);expect(await response.json()).toEqual({message:'Slot unavailable'});
 });
 it('returns an unavailable response when the backend cannot be reached',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('network unavailable')));
  expect((await forward(request('booking/config'),'config','booking')).status).toBe(503);
 });
 it('rejects malformed and foreign origins without reaching the backend',async()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  for(const value of ['invalid-origin','https://other.example.invalid'])expect((await forward(request('contact/submit','{}',value),'submit','contact')).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
 });
 it('fails closed when the signing secret is missing in production',async()=>{
  vi.stubEnv('STAFF_PROXY_SECRET',undefined);const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  expect((await forward(request('booking/config'),'config','booking')).status).toBe(503);expect(fetch).not.toHaveBeenCalled();
 });
});

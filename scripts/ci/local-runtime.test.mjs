import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runtimeEnvironment,proxyRequest} from '../local-runtime.mjs';
import {createServer} from 'node:http';

const configured={DATABASE_URL:'postgresql://fixture:private@db.example.invalid/studio?sslmode=require',DIRECT_URL:'postgresql://fixture:private@direct.example.invalid/studio?sslmode=require',RESEND_API_KEY:'fixture-provider-key',RESEND_FROM_EMAIL:'Studio <studio@example.invalid>',CONTACT_INBOX_EMAIL:'inbox@example.invalid',STAFF_PROXY_SECRET:'p'.repeat(64),STAFF_CSRF_SECRET:'c'.repeat(64),BOOKING_TOKEN_SECRET:'b'.repeat(64)};
test('hosted setup preserves provider configuration without requiring localhost',()=>{
  const result=runtimeEnvironment('setup',configured);
  assert.deepEqual(result,configured);
  assert.notEqual(result,configured);
});
test('production preview retains real providers and enables local HTTPS without changing input',()=>{
  const before={...configured};
  const result=runtimeEnvironment('preview',configured);
  for(const key of Object.keys(configured))assert.equal(result[key],configured[key]);
  assert.equal(result.NODE_ENV,'production');
  assert.equal(result.WEB_ORIGIN,'https://localhost:4443');
  assert.equal(result.STAFF_API_ORIGIN,'http://127.0.0.1:4401');
  assert.equal(result.API_HOST,'127.0.0.1');
  assert.equal(result.AMC_RELEASE_MIGRATIONS,'0');
  assert.deepEqual(configured,before);
});
test('preview fails before startup for mock mail or missing production signing keys',()=>{
  assert.throws(()=>runtimeEnvironment('preview',{...configured,RESEND_API_KEY:'mock'}),/real RESEND_API_KEY/);
  for(const key of ['STAFF_PROXY_SECRET','STAFF_CSRF_SECRET','BOOKING_TOKEN_SECRET'])assert.throws(()=>runtimeEnvironment('preview',{...configured,[key]:''}),new RegExp(key));
});
test('local commands reject non-PostgreSQL databases and hosted execution contexts',()=>{
  for(const DATABASE_URL of ['', 'mongodb://db.example.invalid/studio','prisma+postgres://db.example.invalid/?api_key=private'])assert.throws(()=>runtimeEnvironment('setup',{...configured,DATABASE_URL}));
  for(const flags of [{VERCEL:'1'},{CI:'true'}])assert.throws(()=>runtimeEnvironment('preview',{...configured,...flags}),/CI or Vercel/);
});
test('certificate preparation does not require database or delivery credentials',()=>{
  assert.deepEqual(runtimeEnvironment('cert',{}),{});
});

test('local proxy preserves request bodies and secure cookies, fixes origin headers and prevents indexing',async()=>{
  const upstream=createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    res.writeHead(201,{'content-type':'application/json','set-cookie':'__Host-amc_session=fixture; Secure; HttpOnly; SameSite=Strict; Path=/'});
    res.end(JSON.stringify({body,path:req.url,host:req.headers.host,proto:req.headers['x-forwarded-proto'],forwardedHost:req.headers['x-forwarded-host'],origin:req.headers.origin,csrf:req.headers['x-csrf-token']}));
  });
  const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  await listen(upstream);
  const proxy=createServer((req,res)=>proxyRequest(req,res,upstream.address().port));
  await listen(proxy);
  try{
    const response=await fetch(`http://127.0.0.1:${proxy.address().port}/api/staff/auth/login?fixture=1`,{method:'POST',headers:{'content-type':'application/json','x-forwarded-host':'evil.invalid','x-forwarded-proto':'http','origin':'https://localhost:4443','x-csrf-token':'fixture-csrf'},body:'{"fixture":true}'});
    assert.equal(response.status,201);
    assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
    assert.match(response.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Strict/);
    assert.deepEqual(await response.json(),{body:'{"fixture":true}',path:'/api/staff/auth/login?fixture=1',host:'localhost:4443',proto:'https',forwardedHost:'localhost:4443',origin:'https://localhost:4443',csrf:'fixture-csrf'});
  }finally{
    for(const server of [proxy,upstream]){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  }
});

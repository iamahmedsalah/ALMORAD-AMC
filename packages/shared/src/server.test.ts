import {expect,it} from 'vitest';
import {proxyClient,signProxy,verifyProxy} from './server.js';
it('binds proxy signatures to method/path/body/cookie/origin/client and timestamp',()=>{
 const secret='synthetic signing key for tests';const value={time:String(Date.now()),method:'POST',path:'/staff/auth/login',origin:'https://example.invalid',client:proxyClient(secret,'127.0.0.1'),body:'{}',cookie:''};const signature=signProxy(secret,value);
 expect(verifyProxy(secret,value,signature)).toBe(true);
 for(const altered of [{...value,body:'{"admin":true}'},{...value,path:'/staff/security/revoke'},{...value,cookie:'stolen'},{...value,origin:'https://evil.invalid'},{...value,time:String(Date.now()-120000)}])expect(verifyProxy(secret,altered,signature)).toBe(false);
 expect(proxyClient(secret,'127.0.0.1')).not.toContain('127.0.0.1');
});

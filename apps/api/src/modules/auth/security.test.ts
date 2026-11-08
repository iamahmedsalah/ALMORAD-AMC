import {describe,expect,it,vi,afterEach} from 'vitest';
import {cookieToken,hashPassword,sessionCookieName,sameOrigin,verifyPassword} from './security.js';
import {CsrfService} from './csrf.js';
afterEach(()=>vi.unstubAllEnvs());
describe('staff credential and browser boundaries',()=>{
 it('hashes credentials with unique salts and verifies without a plaintext representation',async()=>{const password='A test-only password 123';const a=await hashPassword(password),b=await hashPassword(password);expect(a).not.toBe(b);expect(a).not.toContain(password);expect(await verifyPassword(password,a)).toBe(true);expect(await verifyPassword('incorrect',a)).toBe(false);expect(await verifyPassword(password,null)).toBe(false);});
 it('rejects duplicate/malformed cookies and uses secure production names',()=>{vi.stubEnv('NODE_ENV','production');expect(sessionCookieName()).toBe('__Host-amc_session');expect(cookieToken('__Host-amc_session='+'a'.repeat(64))).toBe('a'.repeat(64));expect(cookieToken('__Host-amc_session=a; __Host-amc_session=b')).toBeUndefined();expect(cookieToken('amc_session='+'a'.repeat(64))).toBeUndefined();});
 it('binds CSRF tokens to the session and rejects untrusted origins',()=>{vi.stubEnv('NODE_ENV','test');const csrf=new CsrfService();expect(csrf.valid('session-a',csrf.token('session-a'))).toBe(true);expect(csrf.valid('session-b',csrf.token('session-a'))).toBe(false);expect(csrf.valid('session-a',undefined)).toBe(false);expect(sameOrigin('https://evil.invalid')).toBe(false);vi.stubEnv('NODE_ENV','production');vi.stubEnv('WEB_ORIGIN','https://example.invalid');expect(sameOrigin('https://example.invalid')).toBe(true);expect(sameOrigin('http://localhost:3000')).toBe(false);});
 it('requires an explicit strong CSRF key in production',()=>{vi.stubEnv('NODE_ENV','production');vi.stubEnv('STAFF_CSRF_SECRET',undefined);expect(()=>new CsrfService()).toThrow('STAFF_CSRF_SECRET');});
});

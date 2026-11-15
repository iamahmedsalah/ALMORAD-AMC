import 'reflect-metadata';
import {afterEach,expect,it,vi} from 'vitest';
import {OAuth2Client} from 'google-auth-library';
import {forgotPasswordInput,resetPasswordInput,googleAuthInput} from '@amc/shared';
import {AuthService,toPublicUser} from './auth.service.js';
import {otpHash} from './security.js';
import {CsrfService} from './csrf.js';
import type {PrismaService} from '../../prisma/prisma.service.js';
import type {NotificationsService} from '../notifications/notifications.service.js';
import type {StaffRequest} from './session.guard.js';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
const request={staff:{id:'staff'}} as StaffRequest;
function service(tx:object={}){const db={$transaction:async(work:(value:object)=>unknown)=>work(tx),staffAuditEvent:{create:vi.fn()}};return new AuthService(db as unknown as PrismaService,new CsrfService(),{} as NotificationsService);}
it('validates recovery inputs without allowing role or account-creation payloads',()=>{
 expect(forgotPasswordInput.parse({email:' Staff@Example.com ',locale:'ar'}).email).toBe('staff@example.com');
 expect(resetPasswordInput.safeParse({email:'a@example.com',code:'12345',newPassword:'short'}).success).toBe(false);
 expect(googleAuthInput.safeParse({credential:'x'.repeat(30),role:'ADMIN'}).success).toBe(false);
});
it('binds OTP hashes to user and challenge and requires a production secret',()=>{
 vi.stubEnv('STAFF_OTP_SECRET','test-secret-'.repeat(4));const hash=otpHash('u','t','000123');expect(hash).toMatch(/^[a-f0-9]{64}$/);
 expect(hash).not.toBe(otpHash('other','t','000123'));expect(hash).not.toBe(otpHash('u','other','000123'));
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('STAFF_OTP_SECRET','');expect(()=>otpHash('u','t','000123')).toThrow('STAFF_OTP_SECRET');
});
it('never exposes password hashes or Google subject IDs in the identity response',()=>{
 const result=toPublicUser({id:'id',email:'staff@example.com',firstName:'Test',lastName:'Staff',role:'ADMIN',passwordHash:'private hash'});
 expect(result.hasPassword).toBe(true);expect(result).not.toHaveProperty('passwordHash');expect(result).not.toHaveProperty('googleId');
});
it('fails closed when Google is unconfigured and rejects invalid token claims',async()=>{
 const auth=service();vi.stubEnv('GOOGLE_CLIENT_ID','');await expect(auth.verifyGoogle({credential:'x'.repeat(30)})).rejects.toMatchObject({status:503});
 vi.stubEnv('GOOGLE_CLIENT_ID','client');const verify=vi.spyOn(OAuth2Client.prototype,'verifyIdToken');
 for(const payload of [{sub:'s',email:'staff@example.com',email_verified:false,iss:'https://accounts.google.com'},{sub:'s',email:'staff@example.com',email_verified:true,iss:'https://evil.invalid'}]){
  verify.mockResolvedValueOnce({getPayload:()=>payload} as never);await expect(auth.verifyGoogle({credential:'x'.repeat(30)})).rejects.toMatchObject({status:401});
 }
 verify.mockRejectedValueOnce(new Error('expired'));await expect(auth.verifyGoogle({credential:'x'.repeat(30)})).rejects.toMatchObject({status:401});
});
it('does not auto-provision Google users or auto-link email by default',async()=>{
 const find=vi.fn().mockResolvedValue(null);const auth=service({staffUser:{findUnique:find}});vi.spyOn(auth,'verifyGoogle').mockResolvedValue({sub:'google-sub',email:'staff@example.com',authoritative:true});vi.stubEnv('GOOGLE_AUTO_LINK_BY_EMAIL','false');
 await expect(auth.googleLogin({})).rejects.toMatchObject({status:401});expect(find).toHaveBeenCalledExactlyOnceWith({where:{googleId:'google-sub'}});
});
it('refuses unlinking the only credential and detects existing Google ownership',async()=>{
 const tx={$queryRaw:vi.fn(),staffUser:{findUnique:vi.fn().mockResolvedValue({active:true,passwordHash:null})}};const auth=service(tx);
 await expect(auth.googleUnlink(request)).rejects.toMatchObject({status:400});
 vi.spyOn(auth,'verifyGoogle').mockResolvedValue({sub:'new-sub',email:'staff@example.com',authoritative:true});tx.staffUser.findUnique.mockResolvedValue({active:true,passwordHash:null,googleId:'old-sub'} as never);
 await expect(auth.googleLink(request,{})).rejects.toMatchObject({status:409});
});

import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {beforeAll,afterAll,expect,it,vi} from 'vitest';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '../../generated/prisma/client.js';
import type {PrismaService} from '../../prisma/prisma.service.js';
import type {NotificationsService} from '../notifications/notifications.service.js';
import type {StaffRequest} from './session.guard.js';
import {AuthService} from './auth.service.js';
import {CsrfService} from './csrf.js';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {AppModule} from '../../app.module.js';
import {PrismaService as PrismaProvider} from '../../prisma/prisma.service.js';
import {NotificationsService as NotificationsProvider} from '../notifications/notifications.service.js';
import {hashPassword,otpHash,verifyPassword,tokenHash} from './security.js';
const value=process.env.TEST_DATABASE_URL;if(!value)throw new Error('TEST_DATABASE_URL required');const url=new URL(value);
if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw new Error('Isolated local *_test database required');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:value})});
const id=randomUUID(),other=randomUUID(),email=`${id}@example.invalid`,missing=`${randomUUID()}@example.invalid`;
const deliver=vi.fn().mockResolvedValue({status:'UNCONFIGURED'});let auth:AuthService;
const password='Isolated staff recovery password 123';
beforeAll(async()=>{await db.$connect();await db.staffUser.createMany({data:[{id,email,role:'ADMIN',passwordHash:await hashPassword(password)},{id:other,email:`${other}@example.invalid`,role:'MANAGER',active:false}]});auth=new AuthService(db as unknown as PrismaService,new CsrfService(),{sendStaffPasswordResetOtp:deliver} as unknown as NotificationsService);});
afterAll(async()=>{vi.restoreAllMocks();await db.staffAuditEvent.deleteMany({where:{OR:[{subjectId:{in:[id,other]}},{actorId:{in:[id,other]}}]}});await db.requestThrottle.deleteMany({where:{key:{in:[email,missing,`${other}@example.invalid`].map(v=>tokenHash('staff-reset:'+v))}}});await db.staffUser.deleteMany({where:{id:{in:[id,other]}}});await db.$disconnect();});
async function challenge(){const tokenId=randomUUID();await db.staffPasswordResetToken.updateMany({where:{userId:id,consumedAt:null},data:{consumedAt:new Date()}});return db.staffPasswordResetToken.create({data:{id:tokenId,userId:id,codeHash:otpHash(id,tokenId,'012345'),expiresAt:new Date(Date.now()+60000)}});}
it('uses the same public response for missing, inactive and eligible users; serializes cooldown',async()=>{
 expect(await auth.forgotPassword({email:missing})).toEqual({accepted:true});expect(await auth.forgotPassword({email:`${other}@example.invalid`})).toEqual({accepted:true});expect(deliver).not.toHaveBeenCalled();
 const results=await Promise.all([auth.forgotPassword({email}),auth.forgotPassword({email})]);expect(results).toEqual([{accepted:true},{accepted:true}]);expect(deliver).toHaveBeenCalledTimes(1);
 const token=await db.staffPasswordResetToken.findFirstOrThrow({where:{userId:id},orderBy:{createdAt:'desc'}});const code=deliver.mock.calls[0]![1] as string;
 expect(token.codeHash).toBe(otpHash(id,token.id,code));expect(token.codeHash).not.toContain(code);expect(await db.staffPasswordResetToken.count({where:{userId:id,consumedAt:null}})).toBe(1);
});
it('persists all five wrong attempts, including concurrent requests, and locks out the correct code',async()=>{
 const token=await challenge();const wrong={email,code:'999999',newPassword:password};
 const results=await Promise.allSettled(Array.from({length:5},()=>auth.resetPassword(wrong)));expect(results.every(r=>r.status==='rejected')).toBe(true);
 expect((await db.staffPasswordResetToken.findUniqueOrThrow({where:{id:token.id}})).attempts).toBe(5);
 await expect(auth.resetPassword({...wrong,code:'012345'})).rejects.toMatchObject({status:400});
});
it('rejects expired codes, consumes success once and revokes every session atomically',async()=>{
 const expired=await challenge();await db.staffPasswordResetToken.update({where:{id:expired.id},data:{expiresAt:new Date(0)}});
 await expect(auth.resetPassword({email,code:'012345',newPassword:password})).rejects.toMatchObject({status:400});await challenge();
 await db.staffSession.createMany({data:[1,2].map(()=>({userId:id,tokenHash:tokenHash(randomUUID()),expiresAt:new Date(Date.now()+60000)}))});
 const results=await Promise.allSettled([1,2].map(()=>auth.resetPassword({email,code:'012345',newPassword:password+' changed'})));
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(await db.staffSession.count({where:{userId:id}})).toBe(0);
 expect(await verifyPassword(password+' changed',(await db.staffUser.findUniqueOrThrow({where:{id}})).passwordHash)).toBe(true);
 expect(await db.staffPasswordResetToken.count({where:{userId:id,consumedAt:null}})).toBe(0);
 expect(await db.staffAuditEvent.count({where:{subjectId:id,action:'PASSWORD_RESET_COMPLETED'}})).toBe(1);
});
it('links an existing account, signs in by Google subject and refuses subject theft/inactive access',async()=>{
 const verify=vi.spyOn(auth,'verifyGoogle').mockResolvedValue({sub:`test-${id}`,email,authoritative:true});
 const request={staff:{id,role:'ADMIN'}} as StaffRequest;await auth.googleLink(request,{});const result=await auth.googleLogin({});expect(result.staff.id).toBe(id);expect(result.staff).not.toHaveProperty('passwordHash');
 await db.staffUser.update({where:{id:other},data:{active:true}});await expect(auth.googleLink({staff:{id:other,role:'MANAGER'}} as StaffRequest,{})).rejects.toMatchObject({status:409});
 await db.staffUser.update({where:{id},data:{active:false}});await expect(auth.googleLogin({})).rejects.toMatchObject({status:401});await db.staffUser.update({where:{id},data:{active:true}});
 await auth.googleUnlink(request);expect((await db.staffUser.findUniqueOrThrow({where:{id}})).googleId).toBeNull();verify.mockRestore();
});
it('guards the new HTTP endpoints with trusted origin, sessions, CSRF, throttling and no-store',async()=>{
 const testingModule=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(PrismaProvider).useValue(db).overrideProvider(NotificationsProvider).useValue({sendStaffPasswordResetOtp:deliver,configured:false}).compile();
 const app=testingModule.createNestApplication();await app.init();
 try{
  const http=app.getHttpServer();
  await request(http).post('/staff/auth/forgot-password').set('Origin','https://wrong.invalid').send({email:missing}).expect(403);
  const response=await request(http).post('/staff/auth/forgot-password').set('Origin','http://localhost:3000').send({email:missing}).expect(200,{accepted:true});expect(response.headers['cache-control']).toBe('no-store');
  await request(http).post('/staff/auth/forgot-password').set('Origin','http://localhost:3000').send({email:missing}).expect(200,{accepted:true});
  await request(http).post('/staff/auth/forgot-password').set('Origin','http://localhost:3000').send({email:missing}).expect(429);
  await request(http).post('/staff/auth/google/link').set('Origin','http://localhost:3000').send({credential:'x'.repeat(30)}).expect(401);
  const agent=request.agent(http);const login=await agent.post('/staff/auth/login').set('Origin','http://localhost:3000').send({email,password:password+' changed'}).expect(200);
  expect(login.headers['set-cookie'].join(';')).toContain('HttpOnly');expect(login.headers['set-cookie'].join(';')).toContain('SameSite=Strict');expect(login.body.staff).not.toHaveProperty('passwordHash');
  await agent.post('/staff/auth/google/unlink').set('Origin','http://localhost:3000').send({}).expect(403);
  await agent.post('/staff/auth/google/unlink').set('Origin','http://localhost:3000').set('X-CSRF-Token',login.body.csrfToken).send({}).expect(200);
 }finally{await app.close();}
});

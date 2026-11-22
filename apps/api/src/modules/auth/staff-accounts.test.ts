import 'reflect-metadata';
import {expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {StaffAccountsService} from './staff-accounts.service.js';
import {StaffAccountsController} from './staff-accounts.controller.js';
import type {PrismaService} from '../../prisma/prisma.service.js';

it('requires the ADMIN-only staff management permission at the API boundary',()=>{
  expect(Reflect.getMetadata('permission',StaffAccountsController)).toBe('staff:manage');
});
it('archives deleted accounts, revokes sessions, records the reason and prevents self/last-admin deletion',async()=>{
 const id=randomUUID(),actorId=randomUUID();const tx={$queryRaw:vi.fn(),staffUser:{findUnique:vi.fn().mockResolvedValue({id,active:true,role:'MANAGER'}),update:vi.fn(),count:vi.fn().mockResolvedValue(1)},staffSession:{deleteMany:vi.fn()},staffAuditEvent:{create:vi.fn()}};
 const service=new StaffAccountsService({$transaction:async(fn:(t:typeof tx)=>unknown)=>fn(tx)} as unknown as PrismaService);
 await service.remove(actorId,{id,reason:'Access no longer required'});
 expect(tx.staffUser.update).toHaveBeenCalledWith({where:{id},data:{active:false,deletedAt:expect.any(Date)}});expect(tx.staffSession.deleteMany).toHaveBeenCalledWith({where:{userId:id}});
 expect(tx.staffAuditEvent.create).toHaveBeenCalledWith({data:expect.objectContaining({action:'STAFF_ACCOUNT_DELETED',details:{reason:'Access no longer required'}})});
 await expect(service.remove(id,{id,reason:'Review removal'})).rejects.toMatchObject({status:409});
 tx.staffUser.findUnique.mockResolvedValue({id,active:true,role:'ADMIN'});
 await expect(service.remove(actorId,{id,reason:'Review removal'})).rejects.toMatchObject({status:409});
});
it('preserves the last active admin account',async()=>{
  const id=randomUUID();const tx={$queryRaw:vi.fn().mockResolvedValue([]),staffUser:{findUnique:vi.fn().mockResolvedValue({id,role:'ADMIN',active:true}),count:vi.fn().mockResolvedValue(1)},staffSession:{deleteMany:vi.fn()},staffAuditEvent:{create:vi.fn()}};
  const service=new StaffAccountsService({$transaction:async(fn:(value:typeof tx)=>unknown)=>fn(tx)} as unknown as PrismaService);
  await expect(service.update(randomUUID(),{id,role:'MANAGER'})).rejects.toMatchObject({status:409});
  await expect(service.deactivate(randomUUID(),{id})).rejects.toMatchObject({status:409});
  expect(tx.staffSession.deleteMany).not.toHaveBeenCalled();
  expect(tx.staffAuditEvent.create).not.toHaveBeenCalled();
});
it('revokes sessions and audits a deactivated receptionist without removing the row',async()=>{
  const id=randomUUID(),actorId=randomUUID();const account={id,email:'staff@example.invalid',role:'RECEPTIONIST',active:false};
  const tx={$queryRaw:vi.fn().mockResolvedValue([]),staffUser:{findUnique:vi.fn().mockResolvedValue({...account,active:true}),update:vi.fn().mockResolvedValue(account)},staffSession:{deleteMany:vi.fn().mockResolvedValue({count:2})},staffAuditEvent:{create:vi.fn().mockResolvedValue({id:randomUUID()})}};
  const service=new StaffAccountsService({$transaction:async(fn:(value:typeof tx)=>unknown)=>fn(tx)} as unknown as PrismaService);
  expect(await service.deactivate(actorId,{id})).toEqual(account);
  expect(tx.staffUser.update).toHaveBeenCalledWith(expect.objectContaining({data:{active:false}}));
  expect(tx.staffSession.deleteMany).toHaveBeenCalledWith({where:{userId:id}});
  expect(tx.staffAuditEvent.create).toHaveBeenCalledWith({data:{actorId,subjectId:id,action:'STAFF_ACCOUNT_DEACTIVATED'}});
});

it('blocks canonical duplicates and requires explicit review for a likely typo',async()=>{
 const actorId=randomUUID();
 const tx={$queryRaw:vi.fn().mockResolvedValue([]),staffUser:{findMany:vi.fn().mockResolvedValue([{email:'mo.khaledmord@example.com'}]),create:vi.fn().mockResolvedValue({id:randomUUID()})},staffAuditEvent:{create:vi.fn()}};
 const service=new StaffAccountsService({$transaction:async(fn:(value:typeof tx)=>unknown)=>fn(tx)} as unknown as PrismaService);
 const input={email:' MO.KHALEDMORAD@example.com ',role:'MANAGER',password:'Synthetic-test-password-73'};
 await expect(service.create(actorId,input)).rejects.toMatchObject({status:409,response:{code:'STAFF_EMAIL_REVIEW_REQUIRED'}});
 expect(tx.staffUser.create).not.toHaveBeenCalled();
 await service.create(actorId,{...input,confirmSimilarEmail:true});
 expect(tx.staffUser.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({email:'mo.khaledmorad@example.com'})}));
 expect(tx.staffAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({action:'STAFF_SIMILAR_EMAIL_CONFIRMED'})}));
 tx.staffUser.findMany.mockResolvedValue([{email:'MO.KHALEDMORAD@example.com'}]);
 await expect(service.create(actorId,{...input,confirmSimilarEmail:true})).rejects.toMatchObject({status:409,response:{code:'STAFF_EMAIL_EXISTS'}});
});
it('rejects unknown fields and unsupported roles before persistence',async()=>{
 const prisma={$transaction:vi.fn()};const service=new StaffAccountsService(prisma as unknown as PrismaService);
 for(const role of ['CEO','OWNER','admin'])await expect(service.create(randomUUID(),{email:'staff@example.com',password:'Synthetic-test-password-73',role})).rejects.toMatchObject({status:400});
 await expect(service.create(randomUUID(),{email:'staff@example.com',password:'Synthetic-test-password-73',role:'ADMIN',active:true})).rejects.toMatchObject({status:400});
 expect(prisma.$transaction).not.toHaveBeenCalled();
});

it('updates staff names while revoking sessions and rejects overlong names',async()=>{
 const id=randomUUID();const tx={$queryRaw:vi.fn(),staffUser:{findUnique:vi.fn().mockResolvedValue({id,role:'MANAGER',active:true}),update:vi.fn().mockResolvedValue({id,firstName:'Mohamed',lastName:'Khaled Morad'})},staffSession:{deleteMany:vi.fn()},staffAuditEvent:{create:vi.fn()}};
 const service=new StaffAccountsService({$transaction:async(fn:(value:typeof tx)=>unknown)=>fn(tx)} as unknown as PrismaService);
 await service.update(randomUUID(),{id,firstName:' Mohamed ',lastName:' Khaled Morad '});
 expect(tx.staffUser.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({firstName:'Mohamed',lastName:'Khaled Morad'})}));expect(tx.staffSession.deleteMany).toHaveBeenCalledWith({where:{userId:id}});
 await expect(service.update(randomUUID(),{id,firstName:'x'.repeat(81)})).rejects.toMatchObject({status:400});
});

it('restores a previously deleted staff account when recreated with the same email',async()=>{
 const id=randomUUID(),actorId=randomUUID();
 const restored={id,email:'restored@example.com',firstName:'New',lastName:'Staff',role:'MANAGER',active:true,createdAt:new Date()};
 const tx={$queryRaw:vi.fn().mockResolvedValue([]),staffUser:{findMany:vi.fn().mockResolvedValue([{id,email:'restored@example.com',deletedAt:new Date()}]),update:vi.fn().mockResolvedValue(restored),create:vi.fn()},staffAuditEvent:{create:vi.fn()}};
 const service=new StaffAccountsService({$transaction:async(fn:(value:typeof tx)=>unknown)=>fn(tx)} as unknown as PrismaService);
 expect(await service.create(actorId,{email:'restored@example.com',firstName:'New',lastName:'Staff',role:'MANAGER',password:'Synthetic-test-password-73'})).toEqual(restored);
 expect(tx.staffUser.create).not.toHaveBeenCalled();
 expect(tx.staffUser.update).toHaveBeenCalledWith(expect.objectContaining({where:{id},data:expect.objectContaining({active:true,deletedAt:null,role:'MANAGER'})}));
 expect(tx.staffAuditEvent.create).toHaveBeenCalledWith({data:{actorId,subjectId:id,action:'STAFF_ACCOUNT_CREATED'}});
});

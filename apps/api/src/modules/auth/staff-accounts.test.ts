import 'reflect-metadata';
import {expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {StaffAccountsService} from './staff-accounts.service.js';
import {StaffAccountsController} from './staff-accounts.controller.js';
import type {PrismaService} from '../../prisma/prisma.service.js';

it('requires the ADMIN-only staff management permission at the API boundary',()=>{
  expect(Reflect.getMetadata('permission',StaffAccountsController)).toBe('staff:manage');
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

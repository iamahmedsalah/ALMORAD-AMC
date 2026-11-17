import 'reflect-metadata';
import {expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {InquiriesController} from './inquiries.controller.js';
import type {PrismaService} from '../../prisma/prisma.service.js';
import type {StaffRequest} from '../auth/session.guard.js';
it('requires staff management permission for contact creation and archival',()=>{
 for(const action of ['create','remove'] as const)expect(Reflect.getMetadata('permission',InquiriesController.prototype[action])).toBe('staff:manage');
});
it('creates an internal record without claiming visitor consent or scheduling notification delivery',async()=>{
 const id=randomUUID();const tx={$queryRaw:vi.fn(),contactInquiry:{findUnique:vi.fn().mockResolvedValue(null),create:vi.fn().mockResolvedValue({id})},staffAuditEvent:{create:vi.fn()}};
 const controller=new InquiriesController({$transaction:async(fn:(t:typeof tx)=>unknown)=>fn(tx)} as unknown as PrismaService);
 await controller.create({staff:{id:randomUUID(),role:'ADMIN'}} as StaffRequest,{idempotencyKey:randomUUID(),name:'Internal contact',email:'CONTACT@example.invalid',phone:'',message:'Discuss a future campaign',locale:'en'});
 expect(tx.contactInquiry.create).toHaveBeenCalledWith({data:expect.objectContaining({source:'STAFF',consentAt:null,email:'contact@example.invalid',ownerEmailStatus:'SKIPPED',visitorEmailStatus:'SKIPPED',hubspotStatus:'SKIPPED'})});
});
it('replays an internal intake key without creating or auditing the contact twice',async()=>{
 const id=randomUUID(),idempotencyKey=randomUUID();let saved:Record<string,unknown>|null=null;
 const tx={$queryRaw:vi.fn(),contactInquiry:{findUnique:vi.fn(async()=>saved),create:vi.fn(async({data}:{data:Record<string,unknown>})=>{saved={...data,id};return saved;})},staffAuditEvent:{create:vi.fn()}};
 const controller=new InquiriesController({$transaction:async(fn:(t:typeof tx)=>unknown)=>fn(tx)} as unknown as PrismaService);
 const req={staff:{id:randomUUID(),role:'ADMIN'}} as StaffRequest;const data={idempotencyKey,name:'Internal contact',email:'contact@example.invalid',message:'Discuss a future campaign',locale:'en'};
 expect(await controller.create(req,data)).toEqual({id});expect(await controller.create(req,data)).toEqual({id});expect(tx.contactInquiry.create).toHaveBeenCalledTimes(1);expect(tx.staffAuditEvent.create).toHaveBeenCalledTimes(1);
 await expect(controller.create(req,{...data,message:'Different request using the same key'})).rejects.toMatchObject({status:409});
});
it('archives with an audit reason and rejects missing records without deleting them',async()=>{
 const id=randomUUID();const tx={contactInquiry:{updateMany:vi.fn().mockResolvedValue({count:1})},staffAuditEvent:{create:vi.fn()}};
 const controller=new InquiriesController({$transaction:async(fn:(t:typeof tx)=>unknown)=>fn(tx)} as unknown as PrismaService);
 const req={staff:{id:randomUUID(),role:'ADMIN'}} as StaffRequest;
 await controller.remove(req,{id,reason:'Duplicate inquiry'});expect(tx.contactInquiry.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:{id,deletedAt:null},data:expect.objectContaining({deletedAt:expect.any(Date)})}));
 tx.contactInquiry.updateMany.mockResolvedValue({count:0});await expect(controller.remove(req,{id,reason:'Duplicate inquiry'})).rejects.toMatchObject({status:404});
});

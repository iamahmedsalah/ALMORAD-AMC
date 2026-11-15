import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import {BookingsService} from './bookings.service.js';
import type {PrismaService} from '../../prisma/prisma.service.js';
const id=randomUUID(),manager=randomUUID();
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
it('does not disclose whether an email exists and does not return private tokens',async()=>{
 const db={$queryRaw:vi.fn().mockResolvedValue([{totalHits:1}]),booking:{findMany:vi.fn().mockResolvedValue([])}};
 const service=new BookingsService(db as unknown as PrismaService);
 expect(await service.recover({identifier:'client@example.invalid',locale:'en'})).toEqual({accepted:true});
 expect(db.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({email:'client@example.invalid',deletedAt:null})}));
});
it('normalizes phone lookup and queues private access only for matching records',async()=>{
 const tx={$queryRaw:vi.fn(),booking:{findUnique:vi.fn().mockResolvedValue({id,status:'CONFIRMED',tokenExpiresAt:new Date(Date.now()+60000)})},bookingEvent:{create:vi.fn().mockResolvedValue({id:'event'})},bookingOutbox:{create:vi.fn()}};
 const db={$queryRaw:vi.fn().mockResolvedValueOnce([{totalHits:1}]).mockResolvedValueOnce([{id}]),booking:{findMany:vi.fn().mockResolvedValue([{id}])},$transaction:async(fn:(v:typeof tx)=>unknown)=>fn(tx)};
 const service=new BookingsService(db as unknown as PrismaService);
 expect(await service.recover({identifier:'+20 (100) 123-4567',locale:'ar'})).toEqual({accepted:true});
 expect(db.$queryRaw.mock.calls[1]?.slice(1)).toContain('201001234567');
 expect(tx.bookingOutbox.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({bookingId:id,kind:'BOOKING_ACCESS_RECOVERY:EMAIL'})}));
 expect(tx.bookingEvent.create).toHaveBeenCalledOnce();
});
it('limits repeated account recovery without exposing a different public result',async()=>{
 const db={$queryRaw:vi.fn().mockResolvedValue([{totalHits:4}]),booking:{findMany:vi.fn()}};
 const service=new BookingsService(db as unknown as PrismaService);
 expect(await service.recover({identifier:'client@example.invalid',locale:'en'})).toEqual({accepted:true});
 expect(db.booking.findMany).not.toHaveBeenCalled();
});
it('does not turn recovery of a demo fixture into a real outgoing email',async()=>{
 vi.stubEnv('RESEND_API_KEY','synthetic-key');
 const tx={$queryRaw:vi.fn(),booking:{findUnique:vi.fn().mockResolvedValue({id,status:'CONFIRMED',isDemo:true,tokenExpiresAt:new Date(Date.now()+60000)})},bookingEvent:{create:vi.fn().mockResolvedValue({id:'event'})},bookingOutbox:{create:vi.fn()}};
 const db={$queryRaw:vi.fn().mockResolvedValue([{totalHits:1}]),booking:{findMany:vi.fn().mockResolvedValue([{id}])},$transaction:async(fn:(v:typeof tx)=>unknown)=>fn(tx)};
 const service=new BookingsService(db as unknown as PrismaService);
 expect(await service.recover({identifier:'fixture@example.invalid',locale:'en'})).toEqual({accepted:true});
 expect(tx.bookingOutbox.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'UNCONFIGURED'})}));
});
it('scopes manager agenda and total counts to assigned, non-deleted meetings',async()=>{
 const db={booking:{findMany:vi.fn().mockResolvedValue([]),count:vi.fn().mockResolvedValue(0)},$transaction:async(values:Promise<unknown>[])=>Promise.all(values)};
 const service=new BookingsService(db as unknown as PrismaService);
 vi.spyOn(service,'getSettings').mockResolvedValue({timezone:'Africa/Cairo',isDemo:false} as never);
 await service.list({from:'2026-11-12',to:'2026-11-14',assignment:'unassigned'},{id:manager,role:'MANAGER'});
 for(const call of [db.booking.findMany.mock.calls[0],db.booking.count.mock.calls[0]])expect(call?.[0]).toMatchObject({where:{AND:[{OR:[{assignedToId:manager},{assignees:{some:{staffId:manager}}}]}],deletedAt:null}});
});
it('denies a manager direct detail and update access to another managers meeting',async()=>{
 const booking={id,assignedToId:randomUUID()};const tx={$queryRaw:vi.fn(),bookingAssignee:{findUnique:vi.fn().mockResolvedValue(null)},booking:{findFirst:vi.fn().mockResolvedValue(null),findUnique:vi.fn().mockResolvedValue(booking)}};
 const db={booking:tx.booking,$transaction:async(fn:(v:typeof tx)=>unknown)=>fn(tx)};
 const service=new BookingsService(db as unknown as PrismaService);
 await expect(service.staffDetail(id,{id:manager,role:'MANAGER'})).rejects.toMatchObject({status:404});
 await expect(service.staffAction({id,version:1,idempotencyKey:randomUUID(),action:'EDIT',reason:'Update own meeting'},manager,'MANAGER')).rejects.toMatchObject({status:404});
});
it('denies receptionist deletion and manager reassignment before any database write',async()=>{
 const db={$transaction:vi.fn()};const service=new BookingsService(db as unknown as PrismaService);
 const input={id,version:1,idempotencyKey:randomUUID(),reason:'Requested update'};
 await expect(service.staffAction({...input,action:'DELETE'},manager,'RECEPTIONIST')).rejects.toMatchObject({status:403});
 await expect(service.staffAction({...input,action:'EDIT',assignedToId:null},manager,'MANAGER')).rejects.toMatchObject({status:403});
 expect(db.$transaction).not.toHaveBeenCalled();
});
it('allows a manager to edit their assigned meeting and archives an admin-deleted meeting without deleting its row',async()=>{
 const original={id,assignedToId:manager,version:1,status:'CONFIRMED',startsAt:new Date(Date.now()+86400000),endsAt:new Date(Date.now()+88200000),changes:[],notifications:[],deletedAt:null};
 const tx={bookingAssignee:{findMany:vi.fn().mockResolvedValue([]),upsert:vi.fn()},$queryRaw:vi.fn(),booking:{findUnique:vi.fn().mockResolvedValue(original),findUniqueOrThrow:vi.fn().mockResolvedValue(original),update:vi.fn().mockImplementation(async({data})=>({...original,...data,version:2}))},bookingSettings:{findUnique:vi.fn().mockResolvedValue({isDemo:false})},bookingCommand:{findUnique:vi.fn().mockResolvedValue(null),create:vi.fn()},bookingChangeRequest:{findFirst:vi.fn().mockResolvedValue(null),updateMany:vi.fn()},bookingEvent:{create:vi.fn().mockResolvedValue({id:'event'})},bookingOutbox:{create:vi.fn()},staffAuditEvent:{create:vi.fn()}};
 const db={$transaction:async(fn:(v:typeof tx)=>unknown)=>fn(tx)};const service=new BookingsService(db as unknown as PrismaService);
 await service.staffAction({id,version:1,idempotencyKey:randomUUID(),action:'EDIT',notes:'Updated meeting details',reason:'Client provided details'},manager,'MANAGER');
 expect(tx.booking.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({notes:'Updated meeting details'})}));
 await service.staffAction({id,version:1,idempotencyKey:randomUUID(),action:'DELETE',reason:'Admin removed duplicate'},manager,'ADMIN');
 expect(tx.booking.update).toHaveBeenLastCalledWith(expect.objectContaining({data:expect.objectContaining({status:'CANCELLED',deletedAt:expect.any(Date)})}));
 expect(tx.staffAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({action:'BOOKING_DELETED'})}));
 expect(tx.bookingChangeRequest.updateMany).toHaveBeenCalled();
 tx.booking.findUnique.mockResolvedValue({...original,status:'COMPLETED'});
 await service.staffAction({id,version:1,idempotencyKey:randomUUID(),action:'DELETE',reason:'Archive completed meeting'},manager,'ADMIN');
 const archived=tx.booking.update.mock.calls.at(-1)?.[0].data;
 expect(archived).not.toHaveProperty('status');expect(archived).toHaveProperty('deletedAt');
 expect(tx.bookingOutbox.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({kind:'BOOKING_DELETED:EMAIL',status:'SKIPPED'})}));
});

it('lets receptionists find legacy unassigned records without changing ownership',async()=>{
 const db={booking:{findMany:vi.fn().mockResolvedValue([]),count:vi.fn().mockResolvedValue(0)},$transaction:async(values:Promise<unknown>[])=>Promise.all(values)};
 const service=new BookingsService(db as unknown as PrismaService);vi.spyOn(service,'getSettings').mockResolvedValue({timezone:'Africa/Cairo',isDemo:false} as never);
 await service.list({from:'2026-11-12',to:'2026-11-14',assignment:'unassigned'},{id:manager,role:'RECEPTIONIST'});
 expect(db.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({AND:[{assignedToId:null,assignees:{none:{}}}]})}));
});

it('confirms an unassigned appointment with the approved default and refuses an inactive assignee',async()=>{
 const original={id,assignedToId:null,version:1,status:'PENDING',startsAt:new Date(Date.now()+86400000),endsAt:new Date(Date.now()+88200000),deletedAt:null};
 const tx={bookingAssignee:{findMany:vi.fn().mockResolvedValue([]),upsert:vi.fn()},$queryRaw:vi.fn(),booking:{findUnique:vi.fn().mockResolvedValue(original),findUniqueOrThrow:vi.fn().mockResolvedValue(original),update:vi.fn().mockResolvedValue({...original,assignedToId:manager,status:'CONFIRMED'})},bookingSettings:{findUnique:vi.fn().mockResolvedValue({isDemo:true})},bookingCommand:{findUnique:vi.fn().mockResolvedValue(null),create:vi.fn()},bookingChangeRequest:{findFirst:vi.fn().mockResolvedValue(null)},bookingEvent:{create:vi.fn().mockResolvedValue({id:'event'})},bookingOutbox:{create:vi.fn()},staffUser:{findFirst:vi.fn().mockResolvedValue({id:manager})},staffAuditEvent:{create:vi.fn()}};
 const service=new BookingsService({$transaction:async(fn:(v:typeof tx)=>unknown)=>fn(tx)} as unknown as PrismaService);
 const input={id,version:1,idempotencyKey:randomUUID(),action:'CONFIRM',reason:'Client approved meeting'};
 await service.staffAction(input,manager,'RECEPTIONIST');
 expect(tx.staffUser.findFirst).toHaveBeenCalledWith({where:{email:'mo.khaledmorad@almorad-amc.com',role:'MANAGER',active:true},select:{id:true}});
 expect(tx.booking.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'CONFIRMED',assignedTo:{connect:{id:manager}}})}));
 tx.booking.update.mockClear();tx.staffUser.findFirst.mockResolvedValue(null);
 await expect(service.staffAction({...input,idempotencyKey:randomUUID()},manager,'RECEPTIONIST')).rejects.toMatchObject({status:400});
 expect(tx.booking.update).not.toHaveBeenCalled();
});

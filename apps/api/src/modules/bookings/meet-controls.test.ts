import 'reflect-metadata';
import {afterEach,expect,it,vi} from 'vitest';
import {BookingsService} from './bookings.service.js';
import type {PrismaService} from '../../prisma/prisma.service.js';
import type {GoogleCalendarService} from '../notifications/google-calendar.service.js';

afterEach(()=>vi.unstubAllEnvs());
const id='00000000-0000-4000-8000-000000000001',key='00000000-0000-4000-8000-000000000002';
function fixture(){
 const booking={id,assignedToId:'manager',version:2,meetingType:'ONLINE',status:'CONFIRMED',isDemo:false,deletedAt:null,googleEventId:'event',meetingUrl:'https://meet.google.com/old-link-abc'};
 const tx={$queryRaw:vi.fn(),booking:{findUnique:vi.fn().mockResolvedValue(booking),update:vi.fn()},bookingAssignee:{findUnique:vi.fn().mockResolvedValue(null),findMany:vi.fn().mockResolvedValue([{staffId:'manager'}])},staffUser:{count:vi.fn().mockResolvedValue(1)},bookingCommand:{findUnique:vi.fn().mockResolvedValue(null),create:vi.fn()},bookingEvent:{create:vi.fn().mockResolvedValue({id:'event'})},bookingOutbox:{create:vi.fn()},staffAuditEvent:{create:vi.fn()}};
 const db={$transaction:vi.fn(async(work:(t:typeof tx)=>unknown)=>work(tx))};
 const google={enabled:true,controlsEnabled:true,endConference:vi.fn().mockResolvedValue(undefined),removeConference:vi.fn().mockResolvedValue(undefined),sync:vi.fn().mockResolvedValue({googleEventId:'event',meetingUrl:'https://meet.google.com/new-link-abc'})};
 return {service:new BookingsService(db as unknown as PrismaService,undefined,google as unknown as GoogleCalendarService),tx,google,booking};
}
it('denies unrelated managers and stale versions before any provider mutation',async()=>{
 const {service,google}=fixture();
 await expect(service.meetLink({id,action:'END',version:2,idempotencyKey:key},{id:'other',role:'MANAGER'})).rejects.toMatchObject({status:404});
 await expect(service.meetLink({id,action:'REGENERATE',version:1,idempotencyKey:key},{id:'manager',role:'MANAGER'})).rejects.toMatchObject({status:409});
 expect(google.endConference).not.toHaveBeenCalled();expect(google.sync).not.toHaveBeenCalled();
});
it('replaces with a stable retry key, advances the booking version and queues client and staff mail without inbox configuration',async()=>{
 vi.stubEnv('BOOKING_INBOX_EMAIL','');const {service,tx,google}=fixture();
 await service.meetLink({id,action:'REGENERATE',version:2,idempotencyKey:key},{id:'manager',role:'MANAGER'});
 expect(google.sync).toHaveBeenCalledWith(expect.anything(),key);
 expect(tx.booking.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({version:{increment:1},meetingUrl:'https://meet.google.com/new-link-abc'})}));
 expect(tx.bookingOutbox.create.mock.calls.map(call=>call[0].data.kind)).toEqual(expect.arrayContaining(['BOOKING_UPDATED:EMAIL','BOOKING_UPDATED:OWNER:EMAIL']));
 expect(tx.bookingCommand.create).toHaveBeenCalledWith({data:expect.objectContaining({id:key,resultVersion:3})});
});
it('ends only the active call, audits it and replays a completed command without another provider call',async()=>{
 const {service,tx,google,booking}=fixture();const input={id,action:'END',version:2,idempotencyKey:key};
 await service.meetLink(input,{id:'manager',role:'MANAGER'});
 expect(google.endConference).toHaveBeenCalledWith(booking.meetingUrl);
 expect(tx.booking.update).toHaveBeenCalledWith({where:{id},data:{version:{increment:1}}});
 const command=tx.bookingCommand.create.mock.calls[0]![0].data;
 tx.bookingCommand.findUnique.mockResolvedValue(command);booking.version=3;
 await service.meetLink(input,{id:'manager',role:'MANAGER'});expect(google.endConference).toHaveBeenCalledTimes(1);
});
it('preserves the saved link and notification state when a provider call fails or returns the old link',async()=>{
 const {service,tx,google}=fixture();google.sync.mockRejectedValueOnce(new Error('synthetic failure'));
 await expect(service.meetLink({id,action:'REGENERATE',version:2,idempotencyKey:key},{id:'manager',role:'MANAGER'})).rejects.toThrow('synthetic failure');
 google.sync.mockResolvedValueOnce({googleEventId:'event',meetingUrl:'https://meet.google.com/old-link-abc'});
 await expect(service.meetLink({id,action:'REGENERATE',version:2,idempotencyKey:key},{id:'manager',role:'MANAGER'})).rejects.toMatchObject({code:'GOOGLE_MEET_PENDING'});
 expect(tx.booking.update).not.toHaveBeenCalled();expect(tx.bookingOutbox.create).not.toHaveBeenCalled();
});
it('blocks link generation without an active saved manager and allows receptionists to remove conference details',async()=>{
 const {service,tx,google}=fixture();tx.staffUser.count.mockResolvedValue(0);
 await expect(service.meetLink({id,action:'REGENERATE',version:2,idempotencyKey:key},{id:'reception',role:'RECEPTIONIST'})).rejects.toMatchObject({status:400});expect(google.sync).not.toHaveBeenCalled();
 await expect(service.meetLink({id,action:'REMOVE',version:2,idempotencyKey:key},{id:'reception',role:'RECEPTIONIST'})).resolves.toMatchObject({meetingUrl:null});
 expect(google.removeConference).toHaveBeenCalledWith('event');expect(google.endConference).not.toHaveBeenCalled();
 expect(tx.bookingOutbox.create.mock.calls.map(call=>call[0].data.kind)).toContain('BOOKING_UPDATED:OWNER:EMAIL');
});
it('allows receptionists to remove a manually supplied link without Calendar configuration',async()=>{
 const {service,booking,google}=fixture();Object.assign(booking,{googleEventId:null});google.enabled=false;
 await expect(service.meetLink({id,action:'REMOVE',version:2,idempotencyKey:key},{id:'reception',role:'RECEPTIONIST'})).resolves.toMatchObject({meetingUrl:null,googleEventId:null});expect(google.removeConference).not.toHaveBeenCalled();
});

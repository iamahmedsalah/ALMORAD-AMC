import {afterEach,expect,it,vi} from 'vitest';
import {BookingsService} from './bookings.service.js';
import type {PrismaService} from '../../prisma/prisma.service.js';
import {HubSpotAmbiguousCreateError,type HubSpotClient} from '../contact/hubspot.client.js';
afterEach(()=>vi.unstubAllEnvs());
function fixture(kind='BOOKING_EDIT:HUBSPOT',over:Record<string,unknown>={},intent:Record<string,unknown>={}){
 const booking={id:'booking-fixture',reference:'TEST-ONLY',email:'test@example.invalid',clientName:'Test Visitor',phone:'+1 202 555 0100',company:null,locale:'en',meetingType:'ONLINE',status:'CONFIRMED',timezone:'Africa/Cairo',startsAt:new Date('2026-11-20T10:00:00Z'),endsAt:new Date('2026-11-20T10:30:00Z'),meetingUrl:'https://meet.google.com/abc-defg-hij',hubspotContactId:'42',hubspotMeetingId:'88',calendar:{},...over};
 const db={$queryRaw:vi.fn().mockResolvedValue([{id:'outbox-fixture',bookingId:booking.id,kind,attempts:1,...intent}]),booking:{findUnique:vi.fn().mockResolvedValue(booking),update:vi.fn().mockResolvedValue({})},bookingOutbox:{update:vi.fn().mockResolvedValue({})}};
 const provider={enabled:true,updateBookingContact:vi.fn().mockResolvedValue('42'),upsertBookingContact:vi.fn().mockResolvedValue('42'),createMeeting:vi.fn().mockResolvedValue('88'),updateMeeting:vi.fn().mockResolvedValue(undefined),findMeetingByReference:vi.fn().mockResolvedValue('88')};
 return {booking,db,provider,service:new BookingsService(db as unknown as PrismaService,provider as unknown as HubSpotClient)};
}
it('syncs edited client info and the same meeting URL back to the existing HubSpot meeting',async()=>{
 vi.stubEnv('WEB_ORIGIN','https://studio.example.invalid');const {service,provider}=fixture();
 expect(await service.drainCrm()).toEqual({processed:1,succeeded:1,failed:0});
 expect(provider.updateBookingContact).toHaveBeenCalledWith('42',expect.objectContaining({phone:'+1 202 555 0100'}));
 expect(provider.createMeeting).not.toHaveBeenCalled();
 expect(provider.updateMeeting).toHaveBeenCalledWith('88',expect.objectContaining({location:'https://meet.google.com/abc-defg-hij',externalUrl:'https://studio.example.invalid/en/staff/calendar?appointment=booking-fixture'}));
});
it.each([['BOOKING_COMPLETE:HUBSPOT','COMPLETED'],['BOOKING_NO_SHOW:HUBSPOT','NO_SHOW'],['BOOKING_CANCELLED:HUBSPOT','CANCELLED']])('reflects current state for %s',async(kind,status)=>{
 const {service,provider}=fixture(kind,{status});await service.drainCrm();expect(provider.updateMeeting).toHaveBeenCalledWith('88',expect.objectContaining({outcome:status==='CANCELLED'?'CANCELED':status}));
});
it('updates the committed rescheduled time instead of creating a second meeting',async()=>{
 const startsAt=new Date('2026-11-21T11:00:00Z'),{service,provider}=fixture('BOOKING_RESCHEDULED:HUBSPOT',{startsAt});
 await service.drainCrm();expect(provider.updateMeeting).toHaveBeenCalledWith('88',expect.objectContaining({startsAt,outcome:'RESCHEDULED'}));expect(provider.createMeeting).not.toHaveBeenCalled();
});
it.each(['CHANGE_REQUESTED:HUBSPOT','CHANGE_ALTERNATIVE_PROPOSED:HUBSPOT'])('keeps the confirmed CRM time unchanged for %s',async kind=>{
 const {service,provider,db}=fixture(kind);await service.drainCrm();expect(provider.updateMeeting).not.toHaveBeenCalled();expect(db.bookingOutbox.update).toHaveBeenCalledWith(expect.objectContaining({data:{status:'SKIPPED',lastError:null}}));
});
it('never marks an unlinked reschedule as delivered',async()=>{
 const {service,db,provider}=fixture('BOOKING_RESCHEDULED:HUBSPOT',{hubspotMeetingId:null});await service.drainCrm();
 expect(provider.createMeeting).not.toHaveBeenCalled();expect(db.bookingOutbox.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'FAILED',lastError:expect.stringContaining('CRM_MEETING_NOT_LINKED')})}));
});
it('reuses the persisted meeting ID on a repeated creation intent',async()=>{
 const {service,provider}=fixture('BOOKING_CREATED:HUBSPOT');await service.drainCrm();expect(provider.createMeeting).not.toHaveBeenCalled();expect(provider.updateMeeting).toHaveBeenCalledTimes(1);
});
it('recovers an uncertain remote creation by reference without creating again',async()=>{
 const {service,provider,db}=fixture('BOOKING_CREATED:HUBSPOT',{hubspotMeetingId:null},{attempts:2,lastError:'CRM_MEETING_RECONCILE_REQUIRED'});
 await service.drainCrm();expect(provider.findMeetingByReference).toHaveBeenCalledWith('TEST-ONLY');expect(provider.createMeeting).not.toHaveBeenCalled();expect(db.booking.update).toHaveBeenCalledWith({where:{id:'booking-fixture'},data:{hubspotContactId:'42',hubspotMeetingId:'88'}});
});
it('requires staff reconciliation if an uncertain creation is not yet searchable',async()=>{
 const {service,provider,db}=fixture('BOOKING_CREATED:HUBSPOT',{hubspotMeetingId:null},{attempts:2,lastError:'CRM_MEETING_RECONCILE_REQUIRED'});provider.findMeetingByReference.mockResolvedValue(null as unknown as string);
 await service.drainCrm();expect(provider.createMeeting).not.toHaveBeenCalled();expect(db.bookingOutbox.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'FAILED'})}));
});
it('preserves an uncertain create marker on failures instead of blindly retrying creation',async()=>{
 const {service,provider,db}=fixture('BOOKING_CREATED:HUBSPOT',{hubspotMeetingId:null});provider.createMeeting.mockRejectedValue(new HubSpotAmbiguousCreateError());
 await service.drainCrm();expect(db.bookingOutbox.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'PENDING',lastError:expect.stringContaining('CRM_MEETING_RECONCILE_REQUIRED')})}));
});
it('preserves uncertainty if the reconciliation search itself temporarily fails',async()=>{
 const {service,provider,db}=fixture('BOOKING_CREATED:HUBSPOT',{hubspotMeetingId:null},{attempts:2,lastError:'CRM_MEETING_RECONCILE_REQUIRED'});
 provider.findMeetingByReference.mockRejectedValue(new Error('HubSpot network request failed'));
 await service.drainCrm();expect(provider.createMeeting).not.toHaveBeenCalled();
 expect(db.bookingOutbox.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'PENDING',lastError:expect.stringContaining('CRM_MEETING_RECONCILE_REQUIRED')})}));
});

import {afterEach,describe,expect,it,vi} from 'vitest';
import {NotificationsService} from './notifications.service.js';
import {meetingUrlInput} from '@amc/shared';
import type {PrismaService} from '../../prisma/prisma.service.js';

afterEach(()=>vi.unstubAllEnvs());
function fixture(kind:string) {
 vi.stubEnv('BOOKING_INBOX_EMAIL','bookings@example.invalid');
  const booking={id:'booking-fixture',reference:'TEST-ONLY',version:3,serviceSlug:'branding',clientName:'Test Visitor',email:'visitor@example.invalid',phone:'+20200000000',locale:'en',meetingType:'ONLINE',status:'CONFIRMED',meetingUrl:'https://meet.google.com/abc-defg-hij',startsAt:new Date('2026-11-20T10:00:00Z'),endsAt:new Date('2026-11-20T10:30:00Z'),timezone:'Africa/Cairo',tokenNonce:'fixture',tokenVersion:0,calendar:{},events:[{details:{proposedStartAt:'2026-11-21T10:00:00Z'}}]};
 const db={$queryRaw:vi.fn().mockResolvedValue([{id:'outbox-fixture',bookingId:booking.id,eventId:'event-fixture',kind,attempts:1}]),booking:{findUnique:vi.fn().mockResolvedValue(booking)},bookingOutbox:{update:vi.fn()},bookingEvent:{create:vi.fn()},$transaction:vi.fn(async(p:Promise<unknown>[])=>Promise.all(p))};
 const service=new NotificationsService(db as unknown as PrismaService),send=vi.fn().mockResolvedValue({data:{id:'provider-fixture'},error:null});
 (service as unknown as {resend:unknown}).resend={emails:{send}};
 return {service,send,db};
}
describe('booking lifecycle mail',()=>{
 it.each(['BOOKING_CREATED','BOOKING_RESCHEDULED'])('includes the current calendar revision and meeting link for %s',async kind=>{
  const {service,send}=fixture(kind+':EMAIL');await service.drain();const message=send.mock.calls[0]![0];
  const ics=message.attachments[0].content.toString();
  expect(ics).toContain('SEQUENCE:3');expect(ics).toContain('DTSTART:20261120T100000Z');
  expect(message.html).toContain('https://meet.google.com/abc-defg-hij');
 });
 it.each(['CHANGE_REQUESTED','CHANGE_UNDER_REVIEW','CHANGE_DECLINED','CHANGE_WITHDRAWN','CHANGE_ALTERNATIVE_PROPOSED'])('describes %s without claiming the appointment was cancelled or rescheduled',async kind=>{
  const {service,send}=fixture(kind+':EMAIL');
  expect((await service.drain()).succeeded).toBe(1);
  const message=send.mock.calls[0]![0];
  expect(message.from).toContain('bookings@almorad-amc.com');
  expect(message.subject).not.toContain('Rescheduled');
  expect(message.text).toContain(kind==='CHANGE_ALTERNATIVE_PROPOSED'?'not reserved until accepted':'current appointment stays unchanged');
  expect(message.attachments).toBeUndefined();
 });
 it('includes a real meeting URL in the updated email and calendar attachment',async()=>{
  const {service,send}=fixture('BOOKING_EDIT:EMAIL');await service.drain();
  const message=send.mock.calls[0]![0];
  expect(message.text).toContain('https://meet.google.com/abc-defg-hij');
  expect(message.attachments[0].content.toString()).toContain('LOCATION:https://meet.google.com/abc-defg-hij');
 });
 it('routes change alerts only to staff, without the private client token',async()=>{
  const {service,send}=fixture('CHANGE_REQUESTED:OWNER:EMAIL');await service.drain();
  const message=send.mock.calls[0]![0];expect(message.to).toBe('bookings@example.invalid');
  expect(message.html).not.toContain('token=');expect(message.attachments).toBeUndefined();
 });
 it('sends the cancellation template only after cancellation approval',async()=>{
  const {service,send}=fixture('BOOKING_CANCELLED:EMAIL');await service.drain();
  expect(send.mock.calls[0]![0].subject).toMatch(/cancel/i);
  const ics=send.mock.calls[0]![0].attachments[0].content.toString();
  expect(ics).toContain('STATUS:CANCELLED');expect(ics.match(/SEQUENCE:/g)).toHaveLength(1);expect(ics).toContain('SEQUENCE:3');
 });
 it('rejects unsafe links and accepts supported real provider links',()=>{
  for(const url of ['not a URL','javascript:alert(1)','http://meet.google.com/test','https://meet.google.com.evil.invalid/test','https://user:pass@zoom.us/j/123'])expect(meetingUrlInput.safeParse(url).success).toBe(false);
  expect(meetingUrlInput.safeParse('https://meet.google.com/abc-defg-hij').success).toBe(true);
 });
});

import {afterEach,describe,expect,it,vi} from 'vitest';
import {NotificationsService} from './notifications.service.js';
import type {PrismaService} from '../../prisma/prisma.service.js';
import {renderBookingOwnerEmail} from './templates/booking-owner.template.js';

const booking={id:'booking-fixture',reference:'TEST-ONLY',clientName:'<script>fixture</script>',email:'client@example.invalid',phone:'+1 202 555 0100',serviceSlug:'branding',meetingType:'ONLINE',locale:'en',startsAt:new Date('2026-11-15T09:00:00Z'),endsAt:new Date('2026-11-15T09:30:00Z'),timezone:'Africa/Cairo',tokenNonce:'nonce-fixture',tokenVersion:0,calendar:{}};
function fixture(){
  const db={$queryRaw:vi.fn(),booking:{findUnique:vi.fn().mockResolvedValue(booking)},bookingOutbox:{update:vi.fn().mockResolvedValue({})},bookingEvent:{create:vi.fn().mockResolvedValue({})},$transaction:vi.fn(async(queries:Promise<unknown>[])=>Promise.all(queries))};
  const service=new NotificationsService(db as unknown as PrismaService);
  const send=vi.fn().mockResolvedValue({data:{id:'provider-fixture'},error:null});
  (service as unknown as {resend:unknown}).resend={emails:{send}};
  return {db,service,send};
}
afterEach(()=>vi.unstubAllEnvs());
describe('separate booking inbox',()=>{
  it('delivers a client receipt and a separate staff alert without leaking the client access link',async()=>{
    vi.stubEnv('BOOKING_INBOX_EMAIL','bookings@example.invalid');
    const {db,service,send}=fixture();
    db.$queryRaw.mockResolvedValue([{id:'client-intent',bookingId:booking.id,kind:'BOOKING_CREATED:EMAIL',attempts:1},{id:'owner-intent',bookingId:booking.id,kind:'BOOKING_CREATED:OWNER:EMAIL',attempts:1}]);
    expect(await service.drain()).toEqual({processed:2,succeeded:2,failed:0});
    const client=send.mock.calls[0]![0],owner=send.mock.calls[1]![0];
    expect(client.to).toBe(booking.email);expect(client.replyTo).toBe('bookings@example.invalid');
    expect(owner.to).toBe('bookings@example.invalid');expect(owner.replyTo).toBe(booking.email);
    expect(owner.html).toContain('/en/staff/calendar');expect(owner.html).not.toContain('#id=');expect(owner.html).not.toContain('token=');
    expect(owner.html).toContain('&lt;script&gt;fixture&lt;/script&gt;');expect(owner.attachments).toBeUndefined();
    expect(send.mock.calls[0]![1]).not.toEqual(send.mock.calls[1]![1]);
    expect(db.bookingEvent.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({kind:'OWNER_EMAIL_DELIVERED'})}));
  });
  it('keeps a failed owner alert independent of the successful client receipt',async()=>{
    vi.stubEnv('BOOKING_INBOX_EMAIL','bookings@example.invalid');
    const {db,service,send}=fixture();
    db.$queryRaw.mockResolvedValue([{id:'client-intent',bookingId:booking.id,kind:'BOOKING_CREATED:EMAIL',attempts:1},{id:'owner-intent',bookingId:booking.id,kind:'BOOKING_CREATED:OWNER:EMAIL',attempts:1}]);
    send.mockResolvedValueOnce({data:{id:'client-accepted'},error:null}).mockRejectedValueOnce(new Error('503 provider unavailable'));
    expect(await service.drain()).toEqual({processed:2,succeeded:1,failed:1});
    expect(db.bookingOutbox.update).toHaveBeenCalledWith({where:{id:'client-intent'},data:expect.objectContaining({status:'DELIVERED'})});
    expect(db.bookingOutbox.update).toHaveBeenCalledWith({where:{id:'owner-intent'},data:expect.objectContaining({status:'PENDING'})});
  });
  it('does not accidentally send an owner intent to the client when the inbox is unset',async()=>{
    vi.stubEnv('BOOKING_INBOX_EMAIL','');
    const {db,service,send}=fixture();
    db.$queryRaw.mockResolvedValue([{id:'owner-intent',bookingId:booking.id,kind:'BOOKING_CREATED:OWNER:EMAIL',attempts:1}]);
    expect(await service.drain()).toEqual({processed:1,succeeded:0,failed:1});expect(send).not.toHaveBeenCalled();
    expect(db.bookingOutbox.update).toHaveBeenCalledWith({where:{id:'owner-intent'},data:expect.objectContaining({status:'UNCONFIGURED'})});
  });
  it('escapes internal email fields and keeps the action on the staff portal',()=>{
    const result=renderBookingOwnerEmail({...booking,serviceTitle:'Branding <test>',staffUrl:'https://localhost:4443/en/staff/calendar'});
    expect(result.html).toContain('Branding &lt;test&gt;');expect(result.html).not.toContain('<script>');
    expect(result.text).toContain('TEST-ONLY');expect(result.html).toContain('/en/staff/calendar');
  });
});

import {expect,it} from 'vitest';
import {officeAddress} from '@amc/shared';
import {renderContactVisitorEmail,renderContactOwnerEmail} from '../contact/contact-emails.js';
import {emailArtwork} from './email-artwork.js';
const input={locale:'en',name:'Client fixture',email:'client@example.invalid',phone:'+20 100 123 4567',message:'Private inquiry that must not be quoted to the visitor.'};
it('acknowledges receipt without copying the inquiry into the visitor email',()=>{
 const result=renderContactVisitorEmail(input);
 expect(result.html).not.toContain(input.message);expect(result.text).not.toContain(input.message);
 expect(result.text).toContain('reply soon');expect(result.html).toContain(officeAddress.en);
 expect(result.html).toContain('text-align:center');expect(result.html).toContain('cid:almorad-logo');
});
it('keeps studio inquiry details and actionable phone/email while escaping message HTML',()=>{
 const result=renderContactOwnerEmail({...input,id:'fixture',message:'<script>private</script>'});
 expect(result.html).toContain('tel:+201001234567');expect(result.html).toContain('mailto:client@example.invalid');
 expect(result.html).toContain('&lt;script&gt;private&lt;/script&gt;');expect(result.html).not.toContain('<script>private');
});
it('embeds original PNG artwork with the Content-ID used in every email shell',()=>{
 const artwork=emailArtwork()[0]!;
 expect(artwork.contentId).toBe('almorad-logo');expect(artwork.content.subarray(1,4).toString()).toBe('PNG');
 expect(renderContactVisitorEmail({...input,locale:'ar'}).html).toContain(officeAddress.ar);
});

it('identifies the assigned manager in confirmed client emails and escapes the name',async()=>{
 const {renderBookingConfirmationEmail}=await import('./templates/booking-confirmation.template.js');
 const result=renderBookingConfirmationEmail({managerName:'Mohamed <Khaled>',reference:'FIXTURE',clientName:'Client',serviceTitle:'Branding',locale:'en',meetingType:'ONLINE',startsAt:new Date('2026-11-15T10:00:00Z'),endsAt:new Date('2026-11-15T10:30:00Z'),timezone:'Africa/Cairo',managementUrl:'https://example.invalid/private',status:'CONFIRMED'});
 expect(result.html).toContain('Mohamed &lt;Khaled&gt;');expect(result.html).not.toContain('Mohamed <Khaled>');expect(result.text).toContain('Meeting with: Mohamed <Khaled>');expect(result.subject).toContain('confirmed');
});
it('renders replacement and removal notices in both languages with a safe join link and private client management action',async()=>{
 const {renderBookingUpdateEmail}=await import('./templates/booking-update.template.js');
 const {renderMeetingJoinLink}=await import('./templates/email-layout.js');
 const input={reference:'AMC-FIXTURE',clientName:'Client',managerName:'Manager <Fixture>',serviceTitle:'Branding',meetingType:'ONLINE',startsAt:new Date('2026-12-01T10:00Z'),endsAt:new Date('2026-12-01T10:30Z'),timezone:'Africa/Cairo',managementUrl:'https://example.invalid/private',kind:'BOOKING_UPDATED'};
 for(const locale of ['en','ar']){
  const updated=renderBookingUpdateEmail({...input,locale,meetAction:'REGENERATE',meetingUrl:'https://meet.google.com/new-link-abc'});
  expect(updated.html).toContain('href="https://meet.google.com/new-link-abc"');expect(updated.html).toContain('Manager &lt;Fixture&gt;');expect(updated.html).toContain(input.managementUrl);expect(updated.subject).toContain(locale==='ar'?'تم تغيير رابط':'link has changed');
  const removed=renderBookingUpdateEmail({...input,locale,meetAction:'REMOVE',meetingUrl:null});expect(removed.html).not.toContain('href="https://meet.google.com');expect(removed.subject).toContain(locale==='ar'?'إزالة':'removed');
 }
 expect(renderMeetingJoinLink('javascript:alert(1)','en')).toBe('');
});

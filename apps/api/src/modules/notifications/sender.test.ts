import {expect,it} from 'vitest';
import {emailSender} from './sender.js';
it('replaces missing and stale test senders in production while preserving custom business senders',()=>{
 expect(emailSender(undefined,'booking',true)).toContain('bookings@almorad-amc.com');
 expect(emailSender('ALMORAD AMC <onboarding@resend.dev>','contact',true)).toContain('info@almorad-amc.com');
 expect(emailSender('onboarding@resend.dev','booking',false)).toBe('onboarding@resend.dev');
 expect(emailSender('Studio <appointments@example.invalid>','booking',true)).toBe('Studio <appointments@example.invalid>');
});
it('normalizes copied quote wrappers and refuses malformed sender headers',()=>{
 expect(emailSender('"ALMORAD AMC <bookings@almorad-amc.com>"','booking',true)).toBe('ALMORAD AMC <bookings@almorad-amc.com>');
 for(const value of ['not-an-email','Studio <wrong>','valid@example.invalid>','Studio <valid@example.invalid','Studio\r\nBcc: other@example.invalid'])expect(emailSender(value,'booking',true)).toBe('ALMORAD AMC <bookings@almorad-amc.com>');
});

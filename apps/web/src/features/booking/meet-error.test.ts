import {afterEach,expect,it,vi} from 'vitest';
import {BookingError,bookingFetch} from './helpers';
import {meetErrorMessage} from './meet-error';
afterEach(()=>vi.unstubAllGlobals());
it('preserves the stable provider code through the booking fetch boundary',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({code:'GOOGLE_MEET_PENDING',message:'not rendered'},{status:503})));
 await expect(bookingFetch('staff/appointments/meet-link',{})).rejects.toMatchObject({status:503,code:'GOOGLE_MEET_PENDING'});
});
it('retains generic fallback for non-JSON and unknown errors',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('upstream unavailable',{status:502})));
 await expect(bookingFetch('staff/appointments/meet-link',{})).rejects.toMatchObject({status:502});
 expect(meetErrorMessage(new BookingError(500,'unknown'),'en','fallback')).toBe('fallback');
});
it('gives localized, actionable pending and permission messages',()=>{
 expect(meetErrorMessage(new BookingError(503,'GOOGLE_MEET_PENDING'),'en','fallback')).toContain('Wait a moment');
 expect(meetErrorMessage(new BookingError(503,'GOOGLE_MEET_ACCESS_DENIED'),'en','fallback')).toContain('administrator');
 expect(meetErrorMessage(new BookingError(503,'GOOGLE_MEET_PENDING'),'ar','fallback')).toContain('انتظر');
 expect(meetErrorMessage(new BookingError(503,'GOOGLE_MEET_AUTH_FAILED'),'ar','fallback')).toContain('مسؤول النظام');
});

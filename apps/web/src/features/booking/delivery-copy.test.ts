import {expect,it} from 'vitest';
import {bookingDeliveryCopy} from './copy';

it('reports the client receipt independently of a failed internal booking alert',()=>{
  const notifications=[{kind:'BOOKING_CREATED:OWNER:EMAIL',status:'FAILED'},{kind:'BOOKING_CREATED:EMAIL',status:'DELIVERED'}];
  expect(bookingDeliveryCopy('en',notifications)).toContain('A confirmation email was sent.');
  expect(bookingDeliveryCopy('ar',notifications)).toContain('أُرسلت رسالة التأكيد');
  expect(bookingDeliveryCopy('en',[notifications[0]!])).toContain('Email status is unavailable.');
});

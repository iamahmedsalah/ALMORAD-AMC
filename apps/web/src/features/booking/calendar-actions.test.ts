import {expect,it} from 'vitest';
import type {BookingRow} from '@amc/shared';
import {googleCalendarLink} from './helpers';
it('uses UTC instants, Cairo timezone and location without leaking private management access',()=>{
 const booking={reference:'TEST-ONLY',startsAt:'2026-11-20T10:00:00Z',endsAt:'2026-11-20T10:30:00Z',timezone:'Africa/Cairo',token:'private-fixture',email:'visitor@example.invalid'} as unknown as BookingRow;
 const url=new URL(googleCalendarLink(booking,'https://meet.google.com/abc-defg-hij'));
 expect(url.searchParams.get('dates')).toBe('20261120T100000Z/20261120T103000Z');
 expect(url.searchParams.get('ctz')).toBe('Africa/Cairo');expect(url.searchParams.get('location')).toContain('meet.google.com');
 expect(url.href).not.toContain('private-fixture');expect(url.href).not.toContain('visitor');
});

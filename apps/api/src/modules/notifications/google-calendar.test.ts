import 'reflect-metadata';
import {afterEach,expect,it,vi} from 'vitest';
import {JWT} from 'google-auth-library';
import {GoogleCalendarService,calendarEventId} from './google-calendar.service.js';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
function setup(){for(const key of ['GOOGLE_CALENDAR_ID','GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY','GOOGLE_CALENDAR_IMPERSONATE_EMAIL'])vi.stubEnv(key,'synthetic');vi.spyOn(JWT.prototype,'getAccessToken').mockResolvedValue({token:'synthetic'});return new GoogleCalendarService();}
const booking={id:'fixture-id',reference:'AMC-TEST',startsAt:new Date('2026-12-01T10:00Z'),endsAt:new Date('2026-12-01T10:30Z'),timezone:'Africa/Cairo',googleEventId:null,status:'CONFIRMED',deletedAt:null};
it('requires explicit configuration and uses stable provider event IDs',()=>{vi.stubEnv('GOOGLE_CALENDAR_ID','');expect(new GoogleCalendarService().enabled).toBe(false);expect(calendarEventId(booking.id)).toMatch(/^[a-v0-9]+$/);expect(calendarEventId(booking.id)).not.toBe(calendarEventId('other'));});
it('reconciles duplicate create responses using the same deterministic event instead of creating another',async()=>{
 const service=setup();const fetch=vi.fn().mockResolvedValueOnce(new Response('',{status:409})).mockResolvedValueOnce(Response.json({hangoutLink:'https://meet.google.com/abc-defg-hij'}));vi.stubGlobal('fetch',fetch);
 expect(await service.sync(booking)).toEqual({googleEventId:calendarEventId(booking.id),meetingUrl:'https://meet.google.com/abc-defg-hij'});
 expect(fetch.mock.calls[0]?.[1].method).toBe('POST');expect(fetch.mock.calls[1]?.[1].method).toBe('PATCH');expect(fetch.mock.calls[1]?.[0]).toContain(calendarEventId(booking.id));
 expect(JSON.parse(fetch.mock.calls[0]?.[1].body)).not.toHaveProperty('attendees');
});
it('retries pending conference creation and rejects unsafe provider links',async()=>{
 const service=setup();const fetch=vi.fn().mockResolvedValueOnce(Response.json({})).mockResolvedValueOnce(Response.json({hangoutLink:'https://evil.invalid/meeting'}));vi.stubGlobal('fetch',fetch);
 await expect(service.sync(booking)).rejects.toThrow('pending');await expect(service.sync(booking)).rejects.toThrow('Invalid Google Meet link');
});
it('cancels idempotently even when a previous create response was lost',async()=>{
 const service=setup();const fetch=vi.fn().mockResolvedValue(new Response('',{status:404}));vi.stubGlobal('fetch',fetch);
 expect(await service.sync({...booking,status:'CANCELLED'})).toEqual({googleEventId:calendarEventId(booking.id),meetingUrl:null});expect(fetch.mock.calls[0]?.[1].method).toBe('DELETE');
});

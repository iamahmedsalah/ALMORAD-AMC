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
it('retrieves an asynchronously generated link from the same event',async()=>{
 const service=setup();const fetch=vi.fn().mockResolvedValueOnce(Response.json({conferenceData:{createRequest:{status:{statusCode:'pending'}}}})).mockResolvedValueOnce(Response.json({hangoutLink:'https://meet.google.com/abc-defg-hij'}));vi.stubGlobal('fetch',fetch);
 await expect(service.sync(booking)).resolves.toMatchObject({meetingUrl:'https://meet.google.com/abc-defg-hij'});
 expect(fetch.mock.calls.map(call=>call[1].method)).toEqual(['POST','GET']);expect(fetch.mock.calls[1]?.[0]).toContain(calendarEventId(booking.id));
});
it('returns a retryable pending code without inventing a link',async()=>{
 const service=setup();vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>Promise.resolve(Response.json({conferenceData:{createRequest:{status:{statusCode:'pending'}}}}))));
 await expect(service.sync(booking)).rejects.toMatchObject({status:503,code:'GOOGLE_MEET_PENDING'});
});
it.each(['https://evil.invalid/meeting','not a URL','https://private:password@meet.google.com/abc'])('rejects unsafe provider link %s',async hangoutLink=>{
 const service=setup();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({hangoutLink})));
 await expect(service.sync(booking)).rejects.toMatchObject({status:503,code:'GOOGLE_MEET_INVALID_RESPONSE'});
});
it.each([[400,'GOOGLE_MEET_REJECTED'],[401,'GOOGLE_MEET_ACCESS_DENIED'],[403,'GOOGLE_MEET_ACCESS_DENIED'],[404,'GOOGLE_MEET_CALENDAR_NOT_FOUND'],[429,'GOOGLE_MEET_UNAVAILABLE'],[500,'GOOGLE_MEET_UNAVAILABLE']])('maps Calendar HTTP %s to a safe code',async(status,code)=>{
 const service=setup();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('private provider details',{status:Number(status)})));
 await expect(service.sync(booking)).rejects.toMatchObject({status:503,code,providerStatus:status});
});
it('redacts authorization failures including private key/token request details',async()=>{
 const service=setup();vi.mocked(JWT.prototype.getAccessToken).mockRejectedValue({message:'private-key',config:{headers:{Authorization:'private-token'}},response:{data:{error:'unauthorized_client',error_description:'private-email'}}});
 try{await service.sync(booking);throw new Error('Expected failure');}catch(error){expect(error).toMatchObject({status:503,code:'GOOGLE_MEET_AUTH_FAILED',reason:'unauthorized_client'});expect(JSON.stringify(error)).not.toMatch(/private-key|private-token|private-email/);}
});
it('maps network failures and malformed JSON without exposing raw errors',async()=>{
 const service=setup();const fetch=vi.fn().mockRejectedValueOnce(new Error('private network details')).mockResolvedValueOnce(new Response('invalid JSON'));vi.stubGlobal('fetch',fetch);
 await expect(service.sync(booking)).rejects.toMatchObject({code:'GOOGLE_MEET_UNAVAILABLE'});await expect(service.sync(booking)).rejects.toMatchObject({code:'GOOGLE_MEET_INVALID_RESPONSE'});
});
it('distinguishes conference generation failure from pending',async()=>{
 const service=setup();const fetch=vi.fn().mockResolvedValue(Response.json({conferenceData:{createRequest:{status:{statusCode:'failure'}}}}));vi.stubGlobal('fetch',fetch);
 await expect(service.sync(booking)).rejects.toMatchObject({code:'GOOGLE_MEET_CREATION_FAILED'});expect(fetch).toHaveBeenCalledTimes(1);
});
it('cancels idempotently even when a previous create response was lost',async()=>{
 const service=setup();const fetch=vi.fn().mockResolvedValue(new Response('',{status:404}));vi.stubGlobal('fetch',fetch);
 expect(await service.sync({...booking,status:'CANCELLED'})).toEqual({googleEventId:calendarEventId(booking.id),meetingUrl:null});expect(fetch.mock.calls[0]?.[1].method).toBe('DELETE');
});

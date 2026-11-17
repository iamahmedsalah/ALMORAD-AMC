import 'reflect-metadata';
import {afterEach,expect,it,vi} from 'vitest';
import {JWT} from 'google-auth-library';
import {GoogleCalendarService,calendarEventId} from './google-calendar.service.js';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
function setup(){for(const key of ['GOOGLE_CALENDAR_ID','GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY','GOOGLE_CALENDAR_IMPERSONATE_EMAIL'])vi.stubEnv(key,'synthetic');vi.spyOn(JWT.prototype,'getAccessToken').mockResolvedValue({token:'synthetic'});return new GoogleCalendarService();}
const booking={id:'fixture-id',reference:'AMC-TEST',startsAt:new Date('2026-12-01T10:00Z'),endsAt:new Date('2026-12-01T10:30Z'),timezone:'Africa/Cairo',googleEventId:null,status:'CONFIRMED',deletedAt:null};
it('preserves an existing conference on ordinary calendar sync and uses the command key only for replacement',async()=>{
 const service=setup();const fetch=vi.fn().mockImplementation(()=>Promise.resolve(Response.json({hangoutLink:'https://meet.google.com/abc-defg-hij'})));vi.stubGlobal('fetch',fetch);
 await service.sync({...booking,googleEventId:'existing'});
 expect(JSON.parse(fetch.mock.calls[0]![1].body)).not.toHaveProperty('conferenceData');
 await service.sync({...booking,googleEventId:'existing'},'replacement-command');
 expect(JSON.parse(fetch.mock.calls[1]![1].body).conferenceData.createRequest.requestId).toBe('replacement-command');
});
it('resolves the canonical space before ending the active call and sends no calendar deletion',async()=>{
 const service=setup();vi.stubEnv('GOOGLE_MEET_CONTROLS_ENABLED','true');
 const fetch=vi.fn().mockResolvedValueOnce(Response.json({name:'spaces/realSpace',activeConference:{conferenceRecord:'conferenceRecords/current'}})).mockResolvedValueOnce(Response.json({}));vi.stubGlobal('fetch',fetch);
 await service.endConference('https://meet.google.com/abc-defg-hij');
 expect(fetch.mock.calls[0]![0]).toBe('https://meet.googleapis.com/v2/spaces/abc-defg-hij');
 expect(fetch.mock.calls[1]![0]).toBe('https://meet.googleapis.com/v2/spaces/realSpace:endActiveConference');
 expect(fetch.mock.calls[1]![1].method).toBe('POST');
});
it('does not end an idle call and fails closed when controls are unconfigured or Google denies access',async()=>{
 const service=setup();vi.stubEnv('GOOGLE_MEET_CONTROLS_ENABLED','false');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 await expect(service.endConference('https://meet.google.com/abc-defg-hij')).rejects.toMatchObject({code:'GOOGLE_MEET_NOT_CONFIGURED'});expect(fetch).not.toHaveBeenCalled();
 vi.stubEnv('GOOGLE_MEET_CONTROLS_ENABLED','true');fetch.mockResolvedValueOnce(Response.json({name:'spaces/idle'}));await service.endConference('https://meet.google.com/abc-defg-hij');expect(fetch).toHaveBeenCalledTimes(1);
 fetch.mockResolvedValueOnce(new Response('private details',{status:403}));await expect(service.endConference('https://meet.google.com/abc-defg-hij')).rejects.toMatchObject({code:'GOOGLE_MEET_ACCESS_DENIED'});
});
it('requires explicit configuration and uses stable provider event IDs',()=>{vi.stubEnv('GOOGLE_CALENDAR_ID','');expect(new GoogleCalendarService().enabled).toBe(false);expect(calendarEventId(booking.id)).toMatch(/^[a-v0-9]+$/);expect(calendarEventId(booking.id)).not.toBe(calendarEventId('other'));});
it('removes only Calendar conference details without deleting the event or claiming URL revocation',async()=>{
 const service=setup();const fetch=vi.fn().mockResolvedValue(Response.json({}));vi.stubGlobal('fetch',fetch);await service.removeConference('existing');
 expect(fetch.mock.calls[0]![1].method).toBe('PATCH');expect(JSON.parse(fetch.mock.calls[0]![1].body)).toEqual({conferenceData:null});expect(fetch.mock.calls[0]![0]).toContain('/events/existing?conferenceDataVersion=1');
});
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

import {Injectable} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {JWT} from 'google-auth-library';
import {z} from 'zod';
import {GoogleMeetError} from './google-calendar.error.js';
const calendarEvent=z.object({conflict:z.boolean().optional(),hangoutLink:z.string().optional(),conferenceData:z.object({createRequest:z.object({status:z.object({statusCode:z.string().optional()}).optional()}).optional(),entryPoints:z.array(z.object({entryPointType:z.string(),uri:z.string()})).optional()}).optional()});
type CalendarEvent=z.infer<typeof calendarEvent>;
export interface CalendarBooking {id:string;reference:string;startsAt:Date;endsAt:Date;timezone:string;googleEventId:string|null;status:string;deletedAt:Date|null}
export const calendarEventId=(id:string)=>'amc'+createHash('sha256').update(id).digest('hex');
@Injectable()
export class GoogleCalendarService {
 get controlsEnabled(){return this.enabled&&process.env.GOOGLE_MEET_CONTROLS_ENABLED==='true';}
 async removeConference(googleEventId:string){
  await this.request('PATCH',googleEventId,{conferenceData:null},AbortSignal.timeout(20000));
 }
 async endConference(meetingUrl:string){
  if(!this.controlsEnabled)throw new GoogleMeetError('GOOGLE_MEET_NOT_CONFIGURED','configuration');
  const url=new URL(meetingUrl);
  if(url.protocol!=='https:'||url.hostname!=='meet.google.com'||!/^\/[a-z]+-[a-z]+-[a-z]+$/.test(url.pathname))throw new GoogleMeetError('GOOGLE_MEET_INVALID_RESPONSE','conference');
  const signal=AbortSignal.timeout(20000);
  const key=process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.trim().replace(/^["']|["']$/g,'').replaceAll('\\r\\n','\n').replaceAll('\\n','\n').replaceAll('\r\n','\n');
  const auth=new JWT({email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!.trim(),key,subject:process.env.GOOGLE_CALENDAR_IMPERSONATE_EMAIL!.trim(),scopes:['https://www.googleapis.com/auth/meetings.space.created','https://www.googleapis.com/auth/meetings.space.readonly'],transporterOptions:{signal,retry:false}});
  let token:string;
  try{const access=await auth.getAccessToken();if(!access.token)throw new Error();token=access.token;}catch{throw new GoogleMeetError('GOOGLE_MEET_AUTH_FAILED','authorization');}
  const request=async(path:string,method='GET')=>{
   let response:Response;
   try{response=await fetch('https://meet.googleapis.com/v2/'+path,{method,headers:{Authorization:`Bearer ${token}`},signal});}catch{throw new GoogleMeetError('GOOGLE_MEET_UNAVAILABLE','conference');}
   if(!response.ok)throw new GoogleMeetError([401,403].includes(response.status)?'GOOGLE_MEET_ACCESS_DENIED':'GOOGLE_MEET_UNAVAILABLE','conference',response.status);
   return response;
  };
  const response=await request('spaces/'+encodeURIComponent(url.pathname.slice(1)));
  let space:{name:string;activeConference?:unknown};
  try{space=z.object({name:z.string().regex(/^spaces\/[A-Za-z0-9_-]+$/),activeConference:z.unknown().optional()}).parse(await response.json());}catch{throw new GoogleMeetError('GOOGLE_MEET_INVALID_RESPONSE','conference');}
  if(space.activeConference)await request(space.name+':endActiveConference','POST');
 }
 get enabled(){return Boolean(process.env.GOOGLE_CALENDAR_ID&&process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY&&process.env.GOOGLE_CALENDAR_IMPERSONATE_EMAIL);}
 private async request(method:string,id:string|undefined,body:unknown,signal:AbortSignal):Promise<CalendarEvent>{
  if(!this.enabled)throw new GoogleMeetError('GOOGLE_MEET_NOT_CONFIGURED','configuration');
  const privateKey=process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.trim().replace(/^["']|["']$/g,'').replaceAll('\\r\\n','\n').replaceAll('\\n','\n').replaceAll('\r\n','\n');
  const auth=new JWT({email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!.trim(),key:privateKey,subject:process.env.GOOGLE_CALENDAR_IMPERSONATE_EMAIL!.trim(),scopes:['https://www.googleapis.com/auth/calendar.events'],transporterOptions:{signal,retry:false}});
  let token:string;
  try{const access=await auth.getAccessToken();if(!access.token)throw new Error();token=access.token;}
  catch(error){
   // Gaxios errors include request headers/private JWT assertions; never log them.
   const data=(error as {response?:{data?:{error?:unknown}}})?.response?.data;
   const reason=data?.error;
   throw new GoogleMeetError('GOOGLE_MEET_AUTH_FAILED','authorization',undefined,reason==='invalid_grant'||reason==='unauthorized_client'||reason==='invalid_client'||reason==='access_denied'?reason:undefined);
  }
  const url=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!)}/events${id?'/'+encodeURIComponent(id):''}?conferenceDataVersion=1&sendUpdates=none`;
  let response:Response;
  try{response=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal});}
  catch{throw new GoogleMeetError('GOOGLE_MEET_UNAVAILABLE','calendar');}
  // Never expose provider response bodies (may contain PII or credentials).
  if(method==='POST'&&response.status===409||method==='DELETE'&&[404,410].includes(response.status))return {conflict:response.status===409};
  if(!response.ok)throw new GoogleMeetError([401,403].includes(response.status)?'GOOGLE_MEET_ACCESS_DENIED':response.status===404?'GOOGLE_MEET_CALENDAR_NOT_FOUND':response.status===400?'GOOGLE_MEET_REJECTED':'GOOGLE_MEET_UNAVAILABLE','calendar',response.status);
  if(response.status===204)return {};
  try{return calendarEvent.parse(await response.json());}
  catch{throw new GoogleMeetError('GOOGLE_MEET_INVALID_RESPONSE','calendar');}
 }
 async sync(booking:CalendarBooking,requestId?:string):Promise<{googleEventId:string;meetingUrl:string|null}>{
  // Authorization and all reconciliation calls share a budget below the 30s DB
  // transaction timeout. Outbox/staff retries own retries rather than the SDK.
  const signal=AbortSignal.timeout(20000);
  const request=(method:string,id?:string,body?:unknown)=>this.request(method,id,body,signal);
  const id=booking.googleEventId||calendarEventId(booking.id);
  if(booking.deletedAt||booking.status==='CANCELLED'){
   // Deterministic ID also reconciles a create whose response was lost.
   await request('DELETE',id);return {googleEventId:id,meetingUrl:null};
  }
  const body={summary:`ALMORAD AMC — ${booking.reference}`,start:{dateTime:booking.startsAt.toISOString(),timeZone:booking.timezone},end:{dateTime:booking.endsAt.toISOString(),timeZone:booking.timezone},...(!booking.googleEventId||requestId?{conferenceData:{createRequest:{requestId:requestId||id,conferenceSolutionKey:{type:'hangoutsMeet'}}}}:{})};
  let event:Awaited<ReturnType<GoogleCalendarService['request']>>;
  if(booking.googleEventId)event=await request('PATCH',id,body);
  else{event=await request('POST',undefined,{id,...body});if(event.conflict)event=await request('PATCH',id,body);}
  // Conference creation is asynchronous. Read the same event once before asking
  // staff/the outbox to retry; never create a second event or a second conference.
  if(!event.hangoutLink&&!event.conferenceData?.entryPoints?.some(p=>p.entryPointType==='video')&&event.conferenceData?.createRequest?.status?.statusCode!=='failure')event=await request('GET',id);
  if(event.conferenceData?.createRequest?.status?.statusCode==='failure')throw new GoogleMeetError('GOOGLE_MEET_CREATION_FAILED','conference');
  const value=event.hangoutLink||event.conferenceData?.entryPoints?.find(p=>p.entryPointType==='video')?.uri;
  if(!value)throw new GoogleMeetError('GOOGLE_MEET_PENDING','conference');
  let url:URL;
  try{url=new URL(value);if(url.protocol!=='https:'||url.hostname!=='meet.google.com'||url.username||url.password)throw new Error();}
  catch{throw new GoogleMeetError('GOOGLE_MEET_INVALID_RESPONSE','conference');}
  return {googleEventId:id,meetingUrl:url.href};
 }
}

import {Injectable,ServiceUnavailableException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {JWT} from 'google-auth-library';
export interface CalendarBooking {id:string;reference:string;startsAt:Date;endsAt:Date;timezone:string;googleEventId:string|null;status:string;deletedAt:Date|null}
export const calendarEventId=(id:string)=>'amc'+createHash('sha256').update(id).digest('hex');
@Injectable()
export class GoogleCalendarService {
 get enabled(){return Boolean(process.env.GOOGLE_CALENDAR_ID&&process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY&&process.env.GOOGLE_CALENDAR_IMPERSONATE_EMAIL);}
 private async request(method:string,id?:string,body?:unknown){
  if(!this.enabled)throw new ServiceUnavailableException('Google Meet is not configured');
  const auth=new JWT({email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key:process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replaceAll('\\n','\n'),subject:process.env.GOOGLE_CALENDAR_IMPERSONATE_EMAIL,scopes:['https://www.googleapis.com/auth/calendar.events']});
  const access=await auth.getAccessToken();if(!access.token)throw new Error('Google authorization unavailable');
  const url=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!)}/events${id?'/'+encodeURIComponent(id):''}?conferenceDataVersion=1&sendUpdates=none`;
  const response=await fetch(url,{method,headers:{Authorization:`Bearer ${access.token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
  // Never expose provider response bodies (may contain PII or credentials).
  if(response.status===409||method==='DELETE'&&[404,410].includes(response.status))return {conflict:response.status===409};
  if(!response.ok)throw new Error(`Google Calendar request failed (${response.status})`);
  return response.status===204?{}:await response.json() as {hangoutLink?:string;conferenceData?:{entryPoints?:{entryPointType:string;uri:string}[]}};
 }
 async sync(booking:CalendarBooking):Promise<{googleEventId:string;meetingUrl:string|null}>{
  const id=booking.googleEventId||calendarEventId(booking.id);
  if(booking.deletedAt||booking.status==='CANCELLED'){
   // Deterministic ID also reconciles a create whose response was lost.
   await this.request('DELETE',id);return {googleEventId:id,meetingUrl:null};
  }
  const body={summary:`ALMORAD AMC — ${booking.reference}`,start:{dateTime:booking.startsAt.toISOString(),timeZone:booking.timezone},end:{dateTime:booking.endsAt.toISOString(),timeZone:booking.timezone},conferenceData:{createRequest:{requestId:id,conferenceSolutionKey:{type:'hangoutsMeet'}}}};
  let event:Awaited<ReturnType<GoogleCalendarService['request']>>;
  if(booking.googleEventId)event=await this.request('PATCH',id,body);
  else{event=await this.request('POST',undefined,{id,...body});if('conflict' in event&&event.conflict)event=await this.request('PATCH',id,body);}
  const value=('hangoutLink' in event?event.hangoutLink:undefined)||('conferenceData' in event?event.conferenceData?.entryPoints?.find(p=>p.entryPointType==='video')?.uri:undefined);
  if(!value)throw new Error('Google Meet creation is pending');
  const url=new URL(value);if(url.protocol!=='https:'||url.hostname!=='meet.google.com'||url.username||url.password)throw new Error('Invalid Google Meet link');
  return {googleEventId:id,meetingUrl:url.href};
 }
}

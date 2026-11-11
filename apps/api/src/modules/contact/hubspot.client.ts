import {Injectable} from '@nestjs/common';

export interface HubSpotBookingContactInput {
 email:string;name:string;phone?:string|null;company?:string|null;locale:string;
}
export interface HubSpotContactInput extends HubSpotBookingContactInput {message:string;}
export type HubSpotOutcome='SCHEDULED'|'COMPLETED'|'RESCHEDULED'|'CANCELED'|'NO_SHOW';
export interface HubSpotMeetingUpdate {
 startsAt?:Date;endsAt?:Date;outcome?:HubSpotOutcome;location?:string;externalUrl?:string;description?:string;
}
export interface HubSpotMeetingInput extends HubSpotMeetingUpdate {
 contactId:string;title:string;startsAt:Date;endsAt:Date;reference:string;
}
export class HubSpotRateLimitError extends Error {
 constructor(message:string,public readonly retryAfterSeconds=10){super(message);this.name='HubSpotRateLimitError';}
}
/** Creation may have reached HubSpot. Reconcile before any subsequent creation. */
export class HubSpotAmbiguousCreateError extends Error {
 constructor(){super('CRM_MEETING_RECONCILE_REQUIRED');this.name='HubSpotAmbiguousCreateError';}
}
@Injectable()
export class HubSpotClient {
 get enabled(){return Boolean(process.env.HUBSPOT_ACCESS_TOKEN);}
 private async request(path:string,method:string,body?:unknown,creatingMeeting=false):Promise<Response>{
  const token=process.env.HUBSPOT_ACCESS_TOKEN;if(!token)throw new Error('HubSpot is not configured');
  let response:Response;
  try{response=await fetch('https://api.hubapi.com'+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(5000)});}
  catch{throw creatingMeeting?new HubSpotAmbiguousCreateError():new Error('HubSpot network request failed');}
  if(response.status===429){const seconds=Number(response.headers.get('Retry-After'));throw new HubSpotRateLimitError('HubSpot API rate limit exceeded',Number.isFinite(seconds)&&seconds>0?Math.min(seconds,900):10);}
  if(!response.ok){if(creatingMeeting&&response.status>=500)throw new HubSpotAmbiguousCreateError();throw new Error(`HubSpot request failed (${response.status})`);}
  return response;
 }
 private contactProperties(input:HubSpotBookingContactInput):Record<string,string>{
  const name=input.name.trim(),arabic=/[\u0600-\u06FF]/.test(name),[first='',...rest]=name.split(/\s+/);
  return {email:input.email.trim().toLowerCase(),firstname:arabic?name:first,lastname:arabic?'':rest.join(' '),hs_language:input.locale,...(input.phone?{phone:input.phone}:{}),...(input.company?{company:input.company}:{})};
 }
 private async upsert(properties:Record<string,string>):Promise<string>{
  const response=await this.request('/crm/v3/objects/contacts/batch/upsert','POST',{inputs:[{id:properties.email,idProperty:'email',properties}]});
  const data=await response.json() as {results?:{id?:string}[];errors?:unknown[]};const id=data.results?.[0]?.id;
  if(!id||data.results?.length!==1||data.errors?.length)throw new Error('HubSpot returned no contact ID or a partial contact failure');return String(id);
 }
 async upsertContact(input:HubSpotContactInput){return this.upsert({...this.contactProperties(input),[process.env.HUBSPOT_CONTACT_MESSAGE_PROPERTY||'message']:input.message.slice(0,2000)});}
 async upsertBookingContact(input:HubSpotBookingContactInput){return this.upsert(this.contactProperties(input));}
 async updateBookingContact(id:string,input:HubSpotBookingContactInput){await this.request('/crm/v3/objects/contacts/'+encodeURIComponent(id),'PATCH',{properties:this.contactProperties(input)});return id;}
 private meetingProperties(input:HubSpotMeetingUpdate):Record<string,string>{
  return {...(input.startsAt?{hs_timestamp:input.startsAt.toISOString(),hs_meeting_start_time:input.startsAt.toISOString()}:{}),...(input.endsAt?{hs_meeting_end_time:input.endsAt.toISOString()}:{}),...(input.outcome?{hs_meeting_outcome:input.outcome}:{}),...(input.location!==undefined?{hs_meeting_location:input.location}:{}),...(input.externalUrl!==undefined?{hs_meeting_external_url:input.externalUrl}:{}),...(input.description!==undefined?{hs_meeting_body:input.description}:{})};
 }
 async createMeeting(input:HubSpotMeetingInput):Promise<string>{
  const response=await this.request('/crm/v3/objects/meetings','POST',{properties:{...this.meetingProperties({...input,outcome:input.outcome||'SCHEDULED'}),hs_meeting_title:input.title,hs_internal_meeting_notes:`Booking reference: ${input.reference}`},associations:[{to:{id:input.contactId},types:[{associationCategory:'HUBSPOT_DEFINED',associationTypeId:200}]}]},true);
  try{const data=await response.json() as {id?:string};if(data.id)return String(data.id);}catch{/* Uncertain response must never cause blind recreation. */}
  throw new HubSpotAmbiguousCreateError();
 }
 async findMeetingByReference(reference:string):Promise<string|null>{
  const response=await this.request('/crm/v3/objects/meetings/search','POST',{filterGroups:[{filters:[{propertyName:'hs_internal_meeting_notes',operator:'EQ',value:`Booking reference: ${reference}`}]}],properties:['hs_object_id'],limit:2});
  const data=await response.json() as {results?:{id:string}[]};
  if(!Array.isArray(data.results))throw new Error('HubSpot meeting search returned an invalid response');
  if(data.results.length>1)throw new Error('CRM_MEETING_RECONCILE_REQUIRED: multiple matching meetings');
  return data.results[0]?.id||null;
 }
 async updateMeeting(id:string,input:HubSpotMeetingUpdate){await this.request('/crm/v3/objects/meetings/'+encodeURIComponent(id),'PATCH',{properties:this.meetingProperties(input)});}
}

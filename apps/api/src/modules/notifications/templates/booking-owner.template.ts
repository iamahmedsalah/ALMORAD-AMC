import {escapeHtml,renderEmailLayout,singleLine} from './email-layout.js';
import type {EmailContent} from './booking-confirmation.template.js';

interface BookingOwnerInput {
  reference:string;clientName:string;email:string;phone:string|null;
  serviceTitle:string;meetingType:string;startsAt:Date;endsAt:Date;timezone:string;
  staffUrl:string;eventKind?:string;
  notes?:string|null;company?:string|null;officeAddress?:string|null;
}
/** Internal alert; staff authentication is required instead of a client access token. */
export function renderBookingOwnerEmail(input:BookingOwnerInput):EmailContent {
  const title=input.eventKind&&input.eventKind!=='BOOKING_CREATED'?'Appointment update: '+input.eventKind.replaceAll('_',' ').toLowerCase():'New appointment request';
  const format=new Intl.DateTimeFormat('en-GB',{timeZone:input.timezone,dateStyle:'full',timeStyle:'short'});
  const fields=[['Reference',input.reference],['◉ Client',singleLine(input.clientName)],['✉ Email',input.email],['☎ Phone',input.phone||'Not supplied'],['Company',input.company||'Not supplied'],['Service',input.serviceTitle],['Format',input.meetingType==='ONLINE'?'Online':'In person'],['▦ Starts',format.format(input.startsAt)],['Ends',format.format(input.endsAt)],['Timezone',input.timezone],['⌖ Location',input.meetingType==='ONLINE'?'Online':input.officeAddress||'Agency office'],['Message',input.notes||'No meeting notes supplied']];
  const bodyHtml='<table role="presentation" style="width:100%;border-collapse:collapse;">'+fields.map(([label,value])=>`<tr><td style="padding:12px;text-align:center;border-bottom:1px solid #D9C8B7;"><strong style="display:block;color:#A74200;">${escapeHtml(label!)}</strong><span style="display:block;margin-top:4px;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHtml(value!)}</span></td></tr>`).join('')+'</table><p>Review the appointment in the staff calendar.</p>';
  return {subject:title+` — ${singleLine(input.reference)}`,text:title+'\n\n'+fields.map(([label,value])=>`${label}: ${value}`).join('\n')+`\n\nStaff calendar: ${input.staffUrl}`,html:renderEmailLayout({locale:'en',heading:title,bodyHtml,cta:{label:'Open staff calendar',url:input.staffUrl},footerNote:'Reply to contact the client. Staff review and authentication are required.'})};
}

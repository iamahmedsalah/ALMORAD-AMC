import {escapeHtml,renderEmailLayout,singleLine} from './email-layout.js';
import type {EmailContent} from './booking-confirmation.template.js';

interface BookingOwnerInput {
  reference:string;clientName:string;email:string;phone:string|null;
  serviceTitle:string;meetingType:string;startsAt:Date;endsAt:Date;timezone:string;
  staffUrl:string;
}
/** Internal alert; staff authentication is required instead of a client access token. */
export function renderBookingOwnerEmail(input:BookingOwnerInput):EmailContent {
  const format=new Intl.DateTimeFormat('en-GB',{timeZone:input.timezone,dateStyle:'full',timeStyle:'short'});
  const fields=[['Reference',input.reference],['Client',singleLine(input.clientName)],['Email',input.email],['Phone',input.phone||'Not supplied'],['Service',input.serviceTitle],['Format',input.meetingType==='ONLINE'?'Online':'In person'],['Starts',format.format(input.startsAt)],['Ends',format.format(input.endsAt)],['Timezone',input.timezone]];
  const bodyHtml='<table role="presentation" style="width:100%;border-collapse:collapse;">'+fields.map(([label,value])=>`<tr><td style="padding:8px;color:#354A78;font-weight:700;">${escapeHtml(label!)}</td><td style="padding:8px;overflow-wrap:anywhere;">${escapeHtml(value!)}</td></tr>`).join('')+'</table><p>Review the appointment in the staff calendar.</p>';
  return {subject:`New appointment request — ${singleLine(input.reference)}`,text:'New appointment request\n\n'+fields.map(([label,value])=>`${label}: ${value}`).join('\n')+`\n\nStaff calendar: ${input.staffUrl}`,html:renderEmailLayout({locale:'en',heading:'New appointment request',bodyHtml,cta:{label:'Open staff calendar',url:input.staffUrl},footerNote:'Reply to contact the client. Staff review and authentication are required.'})};
}

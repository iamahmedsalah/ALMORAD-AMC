/** Staff-only CRM link. IDs are never accepted as an arbitrary URL. */
export function hubspotContactUrl(contactId:string|null|undefined):string|null {
 const portal=process.env.HUBSPOT_PORTAL_ID;
 return portal&&/^\d+$/.test(portal)&&contactId&&/^\d+$/.test(contactId)
  ? `https://app.hubspot.com/contacts/${portal}/record/0-1/${contactId}`:null;
}

export function hubspotMeetingUrl(meetingId:string|null|undefined):string|null {
 const portal=process.env.HUBSPOT_PORTAL_ID;
 return portal&&/^\d+$/.test(portal)&&meetingId&&/^\d+$/.test(meetingId)?`https://app.hubspot.com/contacts/${portal}/record/0-47/${meetingId}`:null;
}

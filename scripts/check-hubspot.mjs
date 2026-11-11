// Read-only provider readiness: never writes contacts, meetings or database rows.
try {process.loadEnvFile('.env');} catch {/* Environment variables may be supplied by the host. */}
const token=process.env.HUBSPOT_ACCESS_TOKEN;
if(!token){console.log(JSON.stringify({configured:false}));process.exitCode=1;}
else {
 const checks=[['contacts','/crm/v3/objects/contacts?limit=1&properties=hs_object_id'],['meetings','/crm/v3/objects/meetings?limit=1&properties=hs_object_id'],['contactProperties','/crm/v3/properties/contacts'],['meetingProperties','/crm/v3/properties/meetings']];
 const result={configured:true};
 for(const [name,path] of checks){
  try {
   const response=await fetch('https://api.hubapi.com'+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
   result[name]={httpStatus:response.status};
   if(response.ok&&name.endsWith('Properties')){
    const data=await response.json();const properties=new Map((data.results||[]).map(property=>[property.name,property]));
    const fields=name==='contactProperties'?['email','firstname','lastname','phone','company','hs_language',process.env.HUBSPOT_CONTACT_MESSAGE_PROPERTY||'message']:['hs_timestamp','hs_meeting_start_time','hs_meeting_end_time','hs_meeting_location','hs_meeting_external_url','hs_internal_meeting_notes'];
    result[name].supported=Object.fromEntries(fields.map(field=>[field,properties.has(field)]));
    if(name==='meetingProperties')result[name].outcomes=properties.get('hs_meeting_outcome')?.options?.map(option=>option.value)||[];
   }
  }catch{result[name]={error:'network_or_timeout'};}
 }
 console.log(JSON.stringify(result,null,2));
 if(Object.values(result).some(value=>value&&typeof value==='object'&&('error' in value||value.httpStatus!==200||Object.values(value.supported||{}).includes(false))))process.exitCode=1;
}

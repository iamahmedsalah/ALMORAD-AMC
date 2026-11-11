import type {Locale} from '@amc/shared';
export function hubspotStatusLabel(locale:Locale,status?:string){
 const copy:Record<string,[string,string]>={SENT:['Synced','تمت المزامنة'],DELIVERED:['Synced','تمت المزامنة'],PENDING:['Sync queued','المزامنة في الانتظار'],PROCESSING:['Sync in progress','جارٍ المزامنة'],FAILED:['Sync failed','فشلت المزامنة'],UNCONFIGURED:['Not configured','غير مهيأ'],SKIPPED:['Sync skipped','تم تجاوز المزامنة']};
 return copy[status||'']?.[locale==='ar'?1:0]||(locale==='ar'?'حالة المزامنة غير متاحة':'Sync status unavailable');
}
export function HubSpotStatus({locale,notifications,contactUrl,meetingId,onRefresh,busy}:{locale:Locale;notifications:{kind:string;status:string}[];contactUrl?:string|null;meetingId?:string|null;onRefresh?:()=>void;busy?:boolean}){
 const latest=notifications.find(item=>item.kind.endsWith(':HUBSPOT')&&!item.kind.startsWith('CHANGE_'));
 return <section className="booking-ticket"><h3>HubSpot</h3><p>{hubspotStatusLabel(locale,latest?.status)}</p>{meetingId&&<p>{locale==='ar'?'مرجع الاجتماع في HubSpot':'HubSpot meeting ID'}: <bdi>{meetingId}</bdi></p>}<div className="booking-actions">{contactUrl&&<a className="button button-secondary" href={contactUrl} target="_blank" rel="noopener noreferrer">{locale==='ar'?'فتح جهة الاتصال في HubSpot':'Open contact in HubSpot'}</a>}{onRefresh&&<button type="button" className="button button-secondary" disabled={busy} onClick={onRefresh}>{locale==='ar'?'تحديث حالة HubSpot':'Refresh HubSpot status'}</button>}</div></section>;
}

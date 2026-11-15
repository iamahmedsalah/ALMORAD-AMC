import type {Locale} from '@amc/shared';
import {SolarIcon, type SolarName} from '@/components/ui/solar-icon';
export function hubspotStatusLabel(locale:Locale,status?:string){
 const copy:Record<string,[string,string]>={SENT:['Synced','تمت المزامنة'],DELIVERED:['Synced','تمت المزامنة'],PENDING:['Sync queued','المزامنة في الانتظار'],PROCESSING:['Sync in progress','جارٍ المزامنة'],FAILED:['Sync failed','فشلت المزامنة'],UNCONFIGURED:['Not configured','غير مهيأ'],SKIPPED:['Sync skipped','تم تجاوز المزامنة']};
 return copy[status||'']?.[locale==='ar'?1:0]||(locale==='ar'?'حالة المزامنة غير متاحة':'Sync status unavailable');
}
export function HubSpotStatus({locale,notifications,contactUrl,meetingUrl,meetingId,onRefresh,busy}:{locale:Locale;notifications:{kind:string;status:string}[];contactUrl?:string|null;meetingUrl?:string|null;meetingId?:string|null;onRefresh?:()=>void;busy?:boolean}){
 const latest=notifications.find(item=>item.kind.endsWith(':HUBSPOT')&&!item.kind.startsWith('CHANGE_'));
 const state=latest?.status||'UNKNOWN';
 const statusIcon:SolarName=state==='SENT'||state==='DELIVERED'?'check-circle-linear':state==='PROCESSING'?'refresh-linear':state==='PENDING'?'clock-circle-linear':state==='FAILED'?'danger-triangle-linear':'link-round-linear';
 return <section className="booking-ticket hubspot-sync" data-sync={state} aria-busy={Boolean(busy)}>
  <div className="hubspot-sync-heading"><span className="hubspot-sync-emblem"><SolarIcon name="link-round-linear"/></span><h3>HubSpot</h3></div>
  <p className="hubspot-sync-status" role="status"><SolarIcon name={statusIcon}/><span>{hubspotStatusLabel(locale,latest?.status)}</span></p>
  <p className="hubspot-sync-hint">{locale==='ar'?'المزامنة مع نظام العملاء مستقلة عن إرسال البريد. التحديث يتحقق من الحالة الحالية ولا يعيد الإرسال.':'CRM sync is separate from email delivery. Refresh checks the current status without resending.'}</p>
  {meetingId&&<p>{locale==='ar'?'مرجع الاجتماع في HubSpot':'HubSpot meeting ID'}: <bdi>{meetingId}</bdi></p>}
  <div className="booking-actions">{contactUrl&&<a className="button button-secondary" href={contactUrl} target="_blank" rel="noopener noreferrer"><SolarIcon name="arrow-right-up-linear"/>{locale==='ar'?'فتح جهة الاتصال في HubSpot':'Open contact in HubSpot'}</a>}
  {meetingUrl&&<a className="button button-secondary" href={meetingUrl} target="_blank" rel="noopener noreferrer">{locale==='ar'?'\u0641\u062a\u062d \u0627\u0644\u0627\u062c\u062a\u0645\u0627\u0639 \u0641\u064a HubSpot':'Open meeting in HubSpot'}</a>}
  {onRefresh&&<button type="button" className="button button-secondary" disabled={busy} aria-busy={Boolean(busy)} onClick={onRefresh}><SolarIcon name="refresh-linear" className={busy?'booking-spinner':''}/>{locale==='ar'?'تحديث حالة HubSpot':'Refresh HubSpot status'}</button>}</div>
 </section>;
}

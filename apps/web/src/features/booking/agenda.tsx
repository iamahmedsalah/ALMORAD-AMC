import {toast} from 'sonner';
import {services, activeChanges, type BookingList, type Locale} from '@amc/shared';
import {SolarIcon} from '@/components/ui/solar-icon';
import {bookingCopy,bookingLabel} from './copy';
import {businessDate} from './helpers';

export type AgendaViewMode='day'|'week'|'month';

function formatTime(iso:string,locale:Locale,timezone:string){
 return new Intl.DateTimeFormat(locale,{timeZone:timezone,hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
}

function formatDateShort(iso:string,locale:Locale,timezone:string){
 return new Intl.DateTimeFormat(locale,{timeZone:timezone,month:'short',day:'numeric'}).format(new Date(iso));
}

/** Responsive Box/Card Grid for administrative scanning, bulk selection, and quick actions. */
export function AppointmentAgenda({list,locale,busy,selectedId,onSelect,checkedIds,onCheck}: {
  list:BookingList;locale:Locale;busy:boolean;selectedId?:string;onSelect:(id:string)=>void;checkedIds?:string[];onCheck?:(id:string,checked:boolean)=>void;
}) {
 const b=bookingCopy(locale);
 const ar=locale==='ar';
 const rows=[...list.items].sort((a,z)=>a.startsAt.localeCompare(z.startsAt)||a.id.localeCompare(z.id));

 return (
  <div className="dash-card-grid" role="list">
   {rows.map(row=>{
    const hasRequest=row.changes.some(change=>activeChanges.some(status=>status===change.status));
    const serviceTitle=services.find(service=>service.slug===row.serviceSlug)?.[locale]||row.serviceSlug;
    const assigneeLabel=row.assignees?.length
     ?row.assignees.map(({staff})=>[staff.firstName,staff.lastName].filter(Boolean).join(' ')||staff.email).join(', ')
     :row.assignedToId
      ?([row.assignedTo?.firstName,row.assignedTo?.lastName].filter(Boolean).join(' ')||(ar?'مدير معيّن':'Assigned manager'))
      :(ar?'بانتظار التعيين':'Awaiting assignment');

    return (
     <article key={row.id} role="listitem" className="dash-booking-card" data-status={row.status} data-selected={selectedId===row.id||undefined}>
      <div className="dash-booking-card-top">
       <div className="dash-booking-card-id">
        {onCheck&&(
         <input
          type="checkbox"
          className="dash-card-checkbox"
          checked={checkedIds?.includes(row.id)||false}
          disabled={busy}
          aria-label={`${ar?'تحديد':'Select'} ${row.reference}`}
          onChange={event=>onCheck(row.id,event.target.checked)}
         />
        )}
        <span className="dash-ref-pill"><bdi>{row.reference}</bdi></span>
       </div>
       <span className="appointment-status" data-status={row.status}>{bookingLabel(locale,row.status)}</span>
      </div>

      <button type="button" className="dash-booking-card-body" disabled={busy} onClick={()=>onSelect(row.id)}>
       <strong className="dash-booking-client">{row.clientName}</strong>
       <span className="dash-booking-service">{serviceTitle}</span>
       <div className="dash-time-pill">
        <SolarIcon name="clock-circle-linear"/>
        <time dateTime={row.startsAt}>{formatTime(row.startsAt,locale,row.timezone)}</time>
        <span aria-hidden="true">–</span>
        <time dateTime={row.endsAt}>{formatTime(row.endsAt,locale,row.timezone)}</time>
        <span className="dash-time-sep" aria-hidden="true">·</span>
        <span>{formatDateShort(row.startsAt,locale,row.timezone)}</span>
       </div>
      </button>

      <div className="dash-booking-card-foot">
       <div className="dash-booking-assignee" title={assigneeLabel}>
        <SolarIcon name="user-linear"/>
        <span>{assigneeLabel}</span>
        {hasRequest&&<SolarIcon name="chat-round-line-linear" className="dash-card-req-icon"/>}
       </div>
       <div className="dash-booking-quick-actions">
        {row.meetingUrl&&(
         <a href={row.meetingUrl} target="_blank" rel="noopener noreferrer" className="button button-secondary dash-icon-btn" aria-label={ar?'الانضمام للاجتماع':'Join meeting'} title={ar?'الانضمام للاجتماع':'Join meeting'}>
          <SolarIcon name="videocamera-record-linear"/>
         </a>
        )}
        {row.meetingUrl&&(
         <button
          type="button"
          className="button button-secondary dash-icon-btn"
          aria-label={ar?'نسخ رابط الاجتماع':'Copy meeting link'}
          title={ar?'نسخ رابط الاجتماع':'Copy meeting link'}
          onClick={()=>void navigator.clipboard.writeText(row.meetingUrl!).then(()=>toast.success(ar?'تم نسخ الرابط':'Link copied')).catch(()=>toast.error(b.error))}
         >
          <SolarIcon name="link-round-linear"/>
         </button>
        )}
        <button type="button" className="button button-secondary dash-icon-btn" disabled={busy} aria-label={ar?'فتح التفاصيل':'Open details'} title={ar?'فتح التفاصيل':'Open details'} onClick={()=>onSelect(row.id)}>
         <SolarIcon name="arrow-right-linear" className="directional-icon"/>
        </button>
       </div>
      </div>
     </article>
    );
   })}
  </div>
 );
}

export {businessDate};

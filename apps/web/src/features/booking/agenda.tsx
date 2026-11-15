import {services, activeChanges, type BookingList, type Locale} from '@amc/shared';
import {SolarIcon} from '@/components/ui/solar-icon';
import {bookingCopy,bookingLabel} from './copy';
import {businessDate} from './helpers';

/** Both views use the same ordered records and keyboard-operable appointment buttons. */
export function AppointmentAgenda({list,locale,mode,busy,selectedId,onSelect,checkedIds,onCheck}: {
  list:BookingList;locale:Locale;mode:'agenda'|'week';busy:boolean;selectedId?:string;onSelect:(id:string)=>void;checkedIds?:string[];onCheck?:(id:string,checked:boolean)=>void;
}) {
  const b=bookingCopy(locale);
  const rows=[...list.items].sort((a,z)=>a.startsAt.localeCompare(z.startsAt)||a.id.localeCompare(z.id));
  const days=Array.from(new Set(rows.map(row=>businessDate(row.timezone,new Date(row.startsAt)))));
  return <div className={`booking-week appointment-agenda ${mode==='agenda'?'appointment-agenda-list':''}`}>
    {days.map(date=><section key={date} className="agenda-day">
      <h2><SolarIcon name="calendar-linear"/><time dateTime={date}>{new Intl.DateTimeFormat(locale,{dateStyle:'full',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'))}</time></h2>
      {rows.filter(row=>businessDate(row.timezone,new Date(row.startsAt))===date).map(row=><div key={row.id} className="agenda-selectable-card">{onCheck&&<label className="agenda-select-record"><input type="checkbox" checked={checkedIds?.includes(row.id)||false} disabled={busy} onChange={event=>onCheck(row.id,event.target.checked)}/><span>{locale==='ar'?'\u062a\u062d\u062f\u064a\u062f':'Select'} <bdi>{row.reference}</bdi></span></label>}<button
        type="button" className="calendar-appointment" data-status={row.status} aria-pressed={selectedId===row.id} disabled={busy} onClick={()=>onSelect(row.id)}>
        <span className="agenda-time"><SolarIcon name="clock-circle-linear"/><time dateTime={row.startsAt}>{new Intl.DateTimeFormat(locale,{timeZone:row.timezone,hour:'2-digit',minute:'2-digit'}).format(new Date(row.startsAt))}</time>
          <span aria-hidden="true">–</span><time dateTime={row.endsAt}>{new Intl.DateTimeFormat(locale,{timeZone:row.timezone,hour:'2-digit',minute:'2-digit'}).format(new Date(row.endsAt))}</time></span>
        <strong>{row.clientName}</strong><span className="agenda-assignees">{row.assignees?.length?row.assignees.map(({staff})=><small key={staff.id} className="agenda-assignee-chip">{[staff.firstName,staff.lastName].filter(Boolean).join(' ')||staff.email}</small>):<small className="agenda-manager"><SolarIcon name="user-linear"/>{row.assignedToId?([row.assignedTo?.firstName,row.assignedTo?.lastName].filter(Boolean).join(' ')||(locale==='ar'?'\u0645\u062f\u064a\u0631 \u0645\u0639\u064a\u0646':'Assigned manager')):(locale==='ar'?'\u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062a\u0639\u064a\u064a\u0646':'Awaiting assignment')}</small>}</span>
        <span>{services.find(service=>service.slug===row.serviceSlug)?.[locale]||row.serviceSlug}</span>
        <span className="meeting-format"><SolarIcon name={row.meetingType==='ONLINE'?'videocamera-record-linear':'map-point-linear'}/>{row.meetingType==='ONLINE'?b.ONLINE:b.IN_PERSON}</span>
        <span className="agenda-card-footer"><span className="appointment-status" data-status={row.status}>{bookingLabel(locale,row.status)}</span><SolarIcon name="arrow-right-linear" className="directional-icon"/></span>
        {row.changes.some(change=>activeChanges.some(status=>status===change.status))&&<small className="agenda-request"><SolarIcon name="chat-round-line-linear"/>{locale==='ar'?'طلب تغيير يحتاج المراجعة':'Change request needs review'}</small>}
      </button></div>)}
    </section>)}
  </div>;
}

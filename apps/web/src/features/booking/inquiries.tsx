'use client';
import {useEffect,useState} from 'react';
import type {Locale} from '@amc/shared';
import {StaffBookingShell} from './staff-shell';
import {appointmentDate,bookingFetch} from './helpers';
import {SolarIcon} from '@/components/ui/solar-icon';

type Inquiry={id:string;name:string;email:string;phone:string|null;message:string;createdAt:string;ownerEmailStatus:string;visitorEmailStatus:string};
type Result={items:Inquiry[];total:number;page:number};
export function MeetingInquiries({locale}:{locale:Locale}) {
 return <StaffBookingShell locale={locale} view="inquiries">{()=> <Inbox locale={locale}/>}</StaffBookingShell>;
}
function Inbox({locale}:{locale:Locale}) {
 const ar=locale==='ar';
 const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(0),[refresh,setRefresh]=useState(0);
 const [result,setResult]=useState<Result|null>(null),[error,setError]=useState('');
 useEffect(()=>{let stop=false;void bookingFetch<Result>('staff/inquiries?'+new URLSearchParams({search:query,page:String(page)})).then(data=>{if(!stop){setResult(data);setError('');}}).catch(()=>{if(!stop)setError(ar?'تعذر تحميل الاستفسارات. حاول مرة أخرى.':'Could not load inquiries. Please try again.');});return()=>{stop=true;};},[query,page,refresh,ar]);
 const delivery=(status:string)=>status==='SENT'?(ar?'قبله مزود البريد':'Accepted by provider'):status==='FAILED'?(ar?'فشل الإرسال':'Delivery failed'):status==='PENDING'?(ar?'في الانتظار':'Queued'):(ar?'غير مهيأ':'Not configured');
 return <>
  <p className="staff-note">{ar?'رسائل نموذج التواصل. الاستفسار لا يحجز موعداً؛ استخدم الأجندة لتحديد موعد متاح.':'Messages from the contact form. An inquiry does not reserve a time; use the agenda to book an available slot.'}</p>
  <form className="inquiry-search" onSubmit={e=>{e.preventDefault();setPage(0);setQuery(search);}}><label>{ar?'الاسم أو البريد أو الهاتف':'Name, email or phone'}<input type="search" value={search} maxLength={120} onChange={e=>setSearch(e.target.value)}/></label><button className="button button-primary">{ar?'بحث':'Search'}</button><button type="button" className="button button-secondary" onClick={()=>setRefresh(v=>v+1)}>{ar?'تحديث':'Refresh'}</button></form>
  {error&&<p role="alert">{error}</p>}
  {!result&&!error&&<p role="status">{ar?'جارٍ التحميل…':'Loading…'}</p>}
  {result&&<><p role="status">{result.total} {ar?'استفسار':'inquiries'}</p><div className="inquiry-grid">{result.items.map(row=><article className="staff-panel inquiry-card" key={row.id}>
   <div className="staff-heading"><h2>{row.name}</h2><time dateTime={row.createdAt}>{appointmentDate(row.createdAt,locale,'Africa/Cairo')}</time></div>
   <div className="inquiry-contact"><a href={'mailto:'+row.email}><SolarIcon name="letter-linear"/><bdi>{row.email}</bdi></a>{row.phone?<a href={'tel:'+row.phone.replace(/[^+0-9]/g,'')}><SolarIcon name="phone-linear"/><bdi>{row.phone}</bdi></a>:<span>{ar?'لم يترك رقم هاتف':'No phone supplied'}</span>}</div>
   <p className="inquiry-message">{row.message}</p><dl className="inquiry-delivery"><div><dt>{ar?'إشعار الاستوديو':'Studio alert'}</dt><dd>{delivery(row.ownerEmailStatus)}</dd></div><div><dt>{ar?'إيصال العميل':'Visitor receipt'}</dt><dd>{delivery(row.visitorEmailStatus)}</dd></div></dl>
  </article>)}</div>{!result.items.length&&<p>{ar?'لا توجد استفسارات مطابقة.':'No matching inquiries.'}</p>}
  <div className="staff-pagination"><button className="button button-secondary" disabled={page===0} onClick={()=>setPage(p=>p-1)}>{ar?'السابق':'Previous'}</button><span>{page+1}</span><button className="button button-secondary" disabled={(page+1)*25>=result.total} onClick={()=>setPage(p=>p+1)}>{ar?'التالي':'Next'}</button></div></>}
 </>;
}

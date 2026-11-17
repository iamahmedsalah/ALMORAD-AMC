'use client';
import {useEffect,useState} from 'react';
import type {Locale} from '@amc/shared';
import {hubspotStatusLabel} from './hubspot-status';
import {StaffBookingShell,type StaffIdentity} from './staff-shell';
import {Dialog,DialogContent} from '@/components/ui/dialog';
import {appointmentDate,bookingFetch} from './helpers';
import {SolarIcon} from '@/components/ui/solar-icon';
import {IconButton} from '@/components/ui/animated-icon';
import {EmptyState,PageHeader,SideDrawer,SkeletonList,StatCard} from '@/components/ui/staff-primitives';

type Inquiry={id:string;name:string;email:string;phone:string|null;message:string;createdAt:string;source?:string;ownerEmailStatus:string;visitorEmailStatus:string;hubspotStatus?:string;hubspotContactUrl?:string|null};
type Result={items:Inquiry[];total:number;page:number};

export function ContactInquiries({locale}:{locale:Locale}) {
 return <StaffBookingShell locale={locale} view="inquiries">{identity=> <Inbox locale={locale} identity={identity}/>}</StaffBookingShell>;
}

function Inbox({locale,identity}:{locale:Locale;identity:StaffIdentity}) {
 const ar=locale==='ar';
 const admin=identity.staff.role==='ADMIN';
 const [createOpen,setCreateOpen]=useState(false),[deleteOpen,setDeleteOpen]=useState(false),[reason,setReason]=useState(''),[busy,setBusy]=useState(false);
 const [search,setSearch]=useState('');
 const [query,setQuery]=useState('');
 const [page,setPage]=useState(0);
 const [refresh,setRefresh]=useState(0);
 const [result,setResult]=useState<Result|null>(null);
 const [selected,setSelected]=useState<Inquiry|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 async function mutate(endpoint:'create'|'delete',data:unknown){
  if(busy)return;setBusy(true);setError('');
  try{await bookingFetch('staff/inquiries/'+endpoint,data,identity.csrfToken);setCreateOpen(false);setDeleteOpen(false);setSelected(null);setReason('');setPage(0);setRefresh(v=>v+1);}catch{setError(ar?'تعذر حفظ التغيير. تحقق من البيانات وحاول مجددًا.':'Could not save the change. Check the details and try again.');}finally{setBusy(false);}
 }

 useEffect(()=>{
  const param=new URLSearchParams(window.location.search).get('search');
  if(param){
   const id=window.requestAnimationFrame(()=>{setSearch(param);setQuery(param);});
   return()=>window.cancelAnimationFrame(id);
  }
 },[]);

 useEffect(()=>{
  let stop=false;
  const startId=window.requestAnimationFrame(()=>setLoading(true));
  void bookingFetch<Result>('staff/inquiries?'+new URLSearchParams({search:query,page:String(page)}))
   .then(data=>{if(!stop){setResult(data);setError('');}})
   .catch(()=>{if(!stop)setError(ar?'تعذر تحميل الاستفسارات. حاول مرة أخرى.':'Could not load inquiries. Please try again.');})
   .finally(()=>{if(!stop)setLoading(false);});
  return()=>{stop=true;window.cancelAnimationFrame(startId);};
 },[query,page,refresh,ar]);

 const delivery=(status:string)=>status==='SENT'?(ar?'قبله مزود البريد':'Provider accepted'):status==='FAILED'?(ar?'فشل':'Failed'):status==='PENDING'?(ar?'قيد الانتظار':'Queued'):status==='SKIPPED'?(ar?'لم يُرسل':'Not sent'):(ar?'غير مهيأ':'Unconfigured');
 const deliveryIcon=(status:string)=>status==='SENT'?'check-circle-linear':status==='FAILED'?'danger-triangle-linear':'clock-circle-linear';
 const initials=(name:string)=>name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'?';

 const deliveredCount=result?result.items.filter(item=>item.ownerEmailStatus==='SENT'||item.visitorEmailStatus==='SENT').length:0;
 const hubspotCount=result?result.items.filter(item=>['SYNCED','SENT'].includes(item.hubspotStatus||'')).length:0;

 return (
  <>
   <PageHeader
    icon="chat-round-line-linear"
    title={ar?'استفسارات التواصل':'Contact inquiries'}
    description={ar?'رسائل الموقع وسجلات التواصل التي يضيفها الفريق. لا تُنشئ موعدًا تلقائيًا.':'Website messages and staff-entered contact records. These do not automatically create appointments.'}
    action={
     admin?<button type="button" className="button button-primary" onClick={()=>setCreateOpen(true)}><SolarIcon name="add-circle-linear"/>{ar?'إضافة استفسار':'Add contact inquiry'}</button>:undefined
    }
   />

   <div className="dash-stat-grid">
    <StatCard icon="chat-round-line-linear" value={result?.total??0} label={ar?'إجمالي الاستفسارات':'Total inquiries'} tone="accent"/>
    <StatCard icon="letter-linear" value={deliveredCount} label={ar?'بريد مقبول · الصفحة الحالية':'Email accepted · loaded page'} tone="success"/>
    <StatCard icon="link-round-linear" value={hubspotCount} label={ar?'مزامنة HubSpot · الصفحة الحالية':'HubSpot synced · loaded page'}/>
   </div>

   <form className="dash-toolbar" onSubmit={e=>{e.preventDefault();setPage(0);setQuery(search);}}>
    <label className="dash-toolbar-search">
     <SolarIcon name="filter-linear"/>
     <input type="search" value={search} maxLength={120} placeholder={ar?'بحث بالاسم أو البريد أو الهاتف…':'Search name, email or phone…'} aria-label={ar?'الاسم أو البريد أو الهاتف':'Name, email or phone'} onChange={e=>setSearch(e.target.value)}/>
    </label>
    <IconButton type="submit" name="arrow-right-linear" label={ar?'بحث':'Search'} className="button button-primary directional-control"/>
    <IconButton type="button" name="refresh-linear" label={ar?'تحديث':'Refresh'} className={`button button-secondary ${loading?'is-spinning':''}`} disabled={loading} aria-busy={loading} onClick={()=>setRefresh(v=>v+1)}/>
   </form>

   {error&&<p role="alert" className="staff-alert">{error}</p>}

   {!result&&loading?<SkeletonList rows={5}/>:result&&(
    <>
     {!result.items.length?(
      <EmptyState
       icon="chat-round-line-linear"
       title={ar?'لا توجد استفسارات مطابقة':'No matching inquiries'}
       description={ar?'جرّب تغيير كلمات البحث أو تحديث القائمة.':'Try adjusting your search or refreshing the list.'}
      />
     ):(
      <div className="dash-compact-list" role="list">
       {result.items.map((row,index)=>(
        <div key={row.id} role="listitem" className="dash-compact-row" style={{animationDelay:`${Math.min(index,8)*35}ms`}} data-selected={selected?.id===row.id||undefined}>
         <button type="button" className="dash-compact-row-main" onClick={()=>setSelected(row)}>
          <span className="dash-row-avatar" aria-hidden="true">{initials(row.name)}</span>
          <span className="dash-row-body">
           <span className="dash-row-top">
            <strong>{row.name}</strong>
            <time dateTime={row.createdAt}>{appointmentDate(row.createdAt,locale,'Africa/Cairo')}</time>
           </span>
           <span className="dash-row-preview">{row.message}</span>
          </span>
          <span className="dash-status-pill" data-status={row.ownerEmailStatus}>
           <SolarIcon name={deliveryIcon(row.ownerEmailStatus)}/>
           <span>{delivery(row.ownerEmailStatus)}</span>
          </span>
         </button>
         <div className="dash-row-actions">
          <a href={'mailto:'+row.email} className="button button-secondary dash-icon-btn" aria-label={ar?'إرسال بريد':'Email'} title={row.email}>
           <SolarIcon name="letter-linear"/>
          </a>
          {row.phone&&(
           <a href={'tel:'+row.phone.replace(/[^+0-9]/g,'')} className="button button-secondary dash-icon-btn" aria-label={ar?'اتصال':'Call'} title={row.phone}>
            <SolarIcon name="phone-linear"/>
           </a>
          )}
          {row.hubspotContactUrl&&(
           <a href={row.hubspotContactUrl} target="_blank" rel="noopener noreferrer" className="button button-secondary dash-icon-btn" aria-label={ar?'فتح في HubSpot':'Open in HubSpot'} title="HubSpot">
            <SolarIcon name="link-round-linear"/>
           </a>
          )}
         </div>
        </div>
       ))}
      </div>
     )}

     <div className="staff-pagination">
      <button className="button button-secondary" disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}><SolarIcon name="alt-arrow-left-linear" className="directional-icon"/>{ar?'السابق':'Previous'}</button>
      <span>{page+1}</span>
      <button className="button button-secondary" disabled={loading||(page+1)*25>=result.total} onClick={()=>setPage(p=>p+1)}>{ar?'التالي':'Next'}<SolarIcon name="alt-arrow-right-linear" className="directional-icon"/></button>
     </div>
    </>
   )}

   <SideDrawer open={Boolean(selected)} onOpenChange={open=>{if(!open)setSelected(null);}} locale={locale} title={selected?.name||''} description={selected?appointmentDate(selected.createdAt,locale,'Africa/Cairo'):undefined}>
    {selected&&(
     <div className="dash-drawer-body">
      <p className="eyebrow">{selected.source==='STAFF'?(ar?'سجل أضافه الفريق':'Staff-entered contact'):(ar?'نموذج التواصل بالموقع':'Website contact form')}</p>
      <div className="inquiry-contact">
       <a href={'mailto:'+selected.email}><SolarIcon name="letter-linear"/><bdi>{selected.email}</bdi></a>
       {selected.phone?<a href={'tel:'+selected.phone.replace(/[^+0-9]/g,'')}><SolarIcon name="phone-linear"/><bdi>{selected.phone}</bdi></a>:<span>{ar?'لم يترك رقم هاتف':'No phone supplied'}</span>}
      </div>
      <p className="inquiry-message">{selected.message}</p>
      <dl className="inquiry-delivery">
       <div><dt>{ar?'إشعار الاستوديو':'Studio alert'}</dt><dd>{delivery(selected.ownerEmailStatus)}</dd></div>
       <div><dt>{ar?'إيصال العميل':'Visitor receipt'}</dt><dd>{delivery(selected.visitorEmailStatus)}</dd></div>
       <div><dt>HubSpot</dt><dd>{hubspotStatusLabel(locale,selected.hubspotStatus)}</dd></div>
      </dl>
      <div className="booking-actions">
       {admin&&<button type="button" className="button button-secondary" onClick={()=>setDeleteOpen(true)}><SolarIcon name="trash-bin-trash-linear"/>{ar?'حذف الاستفسار':'Delete inquiry'}</button>}
       <a href={'/'+locale+'/staff/calendar'} className="button button-primary"><SolarIcon name="calendar-linear"/>{ar?'حجز موعد':'Book appointment'}</a>
       {selected.hubspotContactUrl&&<a href={selected.hubspotContactUrl} target="_blank" rel="noopener noreferrer" className="button button-secondary"><SolarIcon name="link-round-linear"/>{ar?'فتح في HubSpot':'Open in HubSpot'}</a>}
      </div>
     </div>
    )}
   </SideDrawer>
   <Dialog open={createOpen} onOpenChange={value=>{if(!busy)setCreateOpen(value);}}><DialogContent locale={locale} title={ar?'إضافة استفسار تواصل':'Add contact inquiry'}>
    <p>{ar?'سجل تواصل داخلي؛ لا ينشئ موعدًا ولا يرسل بريدًا تلقائيًا.':'Internal contact record. This does not book a meeting or send an automatic email.'}</p>
    <form className="staff-form inquiry-create" onSubmit={event=>{event.preventDefault();const form=event.currentTarget;form.dataset.commandKey||=crypto.randomUUID();const data=new FormData(form);void mutate('create',{name:data.get('name'),email:data.get('email'),phone:data.get('phone'),message:data.get('message'),locale,idempotencyKey:form.dataset.commandKey});}}>
     <label>{ar?'الاسم':'Name'}<input name="name" required minLength={2} maxLength={120}/></label>
     <label>{ar?'البريد الإلكتروني':'Email'}<input name="email" type="email" dir="ltr" required maxLength={254}/></label>
     <label>{ar?'الهاتف (اختياري)':'Phone (optional)'}<input name="phone" type="tel" dir="ltr" maxLength={40}/></label>
     <label>{ar?'تفاصيل الاستفسار':'Inquiry details'}<textarea name="message" required minLength={10} maxLength={2000}/></label>
     {error&&<p role="alert">{error}</p>}
     <div className="inquiry-dialog-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={()=>setCreateOpen(false)}>{ar?'تراجع':'Cancel'}</button><button type="submit" className="button button-primary" disabled={busy} aria-busy={busy}>{busy?(ar?'جارٍ الحفظ…':'Saving…'):(ar?'حفظ الاستفسار':'Save inquiry')}</button></div>
    </form>
   </DialogContent></Dialog>
   <Dialog open={deleteOpen} onOpenChange={value=>{if(!busy)setDeleteOpen(value);}}><DialogContent locale={locale} title={ar?'حذف الاستفسار؟':'Delete contact inquiry?'}>
    <p>{ar?'سيُزال من صندوق الاستفسارات مع الاحتفاظ بسجل التدقيق. لا يتأثر أي موعد.':'This archives the contact inquiry and retains its audit history. Appointments are unaffected.'}</p>
    <form className="staff-form" onSubmit={event=>{event.preventDefault();if(selected)void mutate('delete',{id:selected.id,reason});}}>
     <label>{ar?'سبب الحذف':'Deletion reason'}<textarea required minLength={3} maxLength={1000} value={reason} onChange={event=>setReason(event.target.value)}/></label>
     {error&&<p role="alert">{error}</p>}
     <div className="inquiry-dialog-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={()=>setDeleteOpen(false)}>{ar?'تراجع':'Cancel'}</button><button className="button button-primary" disabled={busy} aria-busy={busy}>{ar?'تأكيد الحذف':'Confirm deletion'}</button></div>
    </form>
   </DialogContent></Dialog>
  </>
 );
}

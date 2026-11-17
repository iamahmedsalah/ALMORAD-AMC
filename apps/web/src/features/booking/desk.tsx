'use client';
import dynamic from 'next/dynamic';
import {toast} from 'sonner';
import {Dialog,DialogTrigger,DialogContent} from '@/components/ui/dialog';
import {Popover,PopoverTrigger,PopoverContent} from '@/components/ui/popover';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Switch} from '@/components/ui/switch';
import {EmptyState,PageHeader,SideDrawer,SkeletonList,StatCard} from '@/components/ui/staff-primitives';
import {AssigneePicker} from './assignee-picker';
import {useCallback,useEffect,useRef,useState} from 'react';
import {can,activeChanges,bookingStatuses,type BookingDetail,type BookingList,type BookingRow,type Locale,type Schedule} from '@amc/shared';
import {SolarIcon} from '@/components/ui/solar-icon';
import {IconButton} from '@/components/ui/animated-icon';
import {AppointmentAgenda,type AgendaViewMode} from './agenda';
import {HubSpotStatus} from './hubspot-status';
import {AppSelect} from '@/components/ui/app-select';
import {bookingCopy,bookingDeliveryCopy,bookingLabel} from './copy';
import {deskCopy} from './desk-copy';
import {addDays,appointmentDate,businessDate,BookingError,bookingFetch} from './helpers';
import {meetErrorMessage} from './meet-error';
import {StaffBookingShell,type StaffIdentity} from './staff-shell';
import {SlotPicker} from './slot-picker';
import {BookingWizard} from './wizard';

const FullCalendarAgenda=dynamic(()=>import('./fullcalendar-agenda').then(m=>m.FullCalendarAgenda),{ssr:false,loading:()=><SkeletonList rows={4}/>});

function filterQuery(input:Record<string,string>){return new URLSearchParams(Object.fromEntries(Object.entries(input).filter(([,value])=>value!==''))).toString();}
type StaffBookingDetail=BookingDetail&{hubspotContactUrl?:string|null;hubspotMeetingId?:string|null};

export function BookingDesk({locale}:{locale:Locale}){return <StaffBookingShell locale={locale} view="calendar">{identity=><Desk locale={locale} identity={identity}/>}</StaffBookingShell>;}

function Desk({locale,identity}:{locale:Locale;identity:StaffIdentity}){
 const ar=locale==='ar';
 const canAssign=can(identity.staff.role,'appointments:assign');
 const canWrite=can(identity.staff.role,'appointments:write');
 const [assignees,setAssignees]=useState<{id:string;email:string;firstName?:string;lastName?:string}[]>([]);
 useEffect(()=>{if(canAssign)void bookingFetch<{id:string;email:string;firstName?:string;lastName?:string}[]>('staff/appointments/assignees').then(setAssignees).catch(()=>{});},[canAssign]);

 const [createOpen,setCreateOpen]=useState(false);
 const [confirmForm,setConfirmForm]=useState<HTMLFormElement|null>(null);
 const [detailTab,setDetailTab]=useState('details');
 const [meetingDraft,setMeetingDraft]=useState('');
 const [meetAction,setMeetAction]=useState<'END'|'REGENERATE'|'REMOVE'|null>(null);
 const [assignmentDirty,setAssignmentDirty]=useState(false);
 const meetCommand=useRef<{scope:string;key:string}|null>(null);
 const [checkedIds,setCheckedIds]=useState<string[]>([]);
 const [bulkAction,setBulkAction]=useState<'CONFIRM'|'CANCEL'|'DELETE'>('CONFIRM');
 const [bulkReviewed,setBulkReviewed]=useState(false);

 const c=deskCopy(locale),b=bookingCopy(locale);
 const [filter,setFilter]=useState(()=>({from:businessDate(),to:addDays(businessDate(),identity.staff.role==='MANAGER'?30:6),search:'',status:'ALL',changes:'all',assignment:'all',format:''}));
 const [query,setQuery]=useState(()=>filterQuery(filter));
 const [list,setList]=useState<BookingList|null>(null);
 const [page,setPage]=useState(0);
 const [mode,setMode]=useState<AgendaViewMode>('week');
 const [selected,setSelected]=useState<StaffBookingDetail|null>(null);
 const [rules,setRules]=useState<Schedule|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [action,setAction]=useState('EDIT');
 const [slot,setSlot]=useState('');
 const [refreshing,setRefreshing]=useState(false);
 const [loadedKey,setLoadedKey]=useState('');
 const requestKey=query+'&page='+page;
 const listLoading=refreshing||loadedKey!==requestKey;
 const requestId=useRef(0);
 const selectedTrigger=useRef<HTMLElement|null>(null);

 useEffect(()=>{
  if(typeof window!=='undefined'&&window.innerWidth<768){
   const id=window.requestAnimationFrame(()=>setMode('day'));
   return()=>window.cancelAnimationFrame(id);
  }
 },[]);

 const retrieve=useCallback(()=>bookingFetch<BookingList>('staff/appointments?'+query+'&page='+page),[query,page]);
 const load=useCallback(async()=>{
  const request=++requestId.current;
  setRefreshing(true);setError('');
  try{const result=await retrieve();if(request===requestId.current)setList(result);}
  catch{if(request===requestId.current)setError(b.error);}
  finally{if(request===requestId.current){setRefreshing(false);setLoadedKey(requestKey);}}
 },[retrieve,b.error,requestKey]);

 useEffect(()=>{
  const control=requestId;const request=++control.current;
  void retrieve().then(result=>{if(request===control.current){setList(result);setError('');}})
   .catch(()=>{if(request===control.current)setError(b.error);})
   .finally(()=>{if(request===control.current){setLoadedKey(requestKey);setRefreshing(false);}});
  return()=>{control.current++;};
 },[retrieve,requestKey,b.error]);

 useEffect(()=>{void bookingFetch<{schedule:Schedule|null}>('booking/config').then(data=>setRules(data.schedule)).catch(()=>setError(b.error));},[b.error]);

 const select=useCallback(async(id:string)=>{
  selectedTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  setBusy(true);setError('');
  try{
   const result=await bookingFetch<{booking:StaffBookingDetail}>('staff/appointments/detail?id='+id);
   setSelected(result.booking);setMeetingDraft(result.booking.meetingUrl||'');setDetailTab('details');setAction('EDIT');setSlot('');
   setAssignmentDirty(false);
  }catch{toast.error(b.error);}
  finally{setBusy(false);}
 },[b.error]);

 useEffect(()=>{
  const id=new URLSearchParams(window.location.search).get('appointment');
  if(!id||!/^[a-f0-9-]{36}$/i.test(id))return;
  let stopped=false;
  void bookingFetch<{booking:StaffBookingDetail}>('staff/appointments/detail?id='+id)
   .then(result=>{if(!stopped){setSelected(result.booking);setMeetingDraft(result.booking.meetingUrl||'');}})
   .catch(()=>{if(!stopped)toast.error(b.error);});
  return()=>{stopped=true;};
 },[b.error]);

 async function executeSave(form:HTMLFormElement){
  if(!selected||busy)return;
  setBusy(true);setError('');
  const fields=new FormData(form);
  const data={
   id:selected.id,version:selected.version,idempotencyKey:crypto.randomUUID(),action,reason:fields.get('reason'),
   ...((action==='RESCHEDULE'||action==='PROPOSE')?{startsAt:slot}:{}),
   ...(action==='EDIT'?{meetingUrl:String(fields.get('meetingUrl')||'').trim()||null,...(canAssign?{assigneeIds:fields.getAll('assigneeIds').map(String)}:{})}:{}),
   ...(action==='EDIT'?Object.fromEntries(['clientName','email','phone','company','notes'].map(key=>[key,fields.get(key)])):{})
  };
  try{
   const result=await bookingFetch<{booking:BookingDetail}>('staff/appointments/action',data,identity.csrfToken);
   if(action==='DELETE')setSelected(null);
   else setSelected(previous=>({...result.booking,hubspotContactUrl:previous?.hubspotContactUrl,hubspotMeetingId:previous?.hubspotMeetingId}));
   setAssignmentDirty(false);toast.success(c.actionSaved);
   setAction('EDIT');setSlot('');await load();
  }catch(e){
   const msg=e instanceof BookingError&&e.status===409?b.conflict:e instanceof BookingError&&e.status===400?b.invalid:b.error;
   setError(msg);toast.error(msg);
  }finally{setBusy(false);}
 }

 async function handleRescheduleDrop(booking:BookingRow,newStartIso:string){
  if(!canWrite){toast.error(c.permission);return false;}
  try{
   await bookingFetch('staff/appointments/action',{
    id:booking.id,version:booking.version,idempotencyKey:crypto.randomUUID(),
    action:'RESCHEDULE',startsAt:newStartIso,reason:ar?'إعادة جدولة من التقويم':'Rescheduled via calendar'
   },identity.csrfToken);
   setAssignmentDirty(false);toast.success(c.actionSaved);
   await load();
   return true;
  }catch(e){
   const msg=e instanceof BookingError&&e.status===409?b.conflict:e instanceof BookingError&&e.status===400?b.invalid:b.error;
   toast.error(msg);
   return false;
  }
 }

 async function generateMeet(action:'CREATE'|'END'|'REGENERATE'|'REMOVE'='CREATE'){
  if(!selected||busy)return;
  if(['CREATE','REGENERATE'].includes(action)&&(!(selected.assignees?.length||selected.assignedToId)||assignmentDirty)){toast.error(ar?'اختر مديرًا واحفظ التعيين أولًا.':'Choose a manager and save the assignment first.');return;}
  setBusy(true);setError('');
  try{
   const scope=`${selected.id}:${selected.version}:${action}`;
   if(meetCommand.current?.scope!==scope)meetCommand.current={scope,key:crypto.randomUUID()};
   await bookingFetch('staff/appointments/meet-link',{id:selected.id,action,...(action!=='CREATE'?{version:selected.version,idempotencyKey:meetCommand.current.key}:{})},identity.csrfToken);
   const result=await bookingFetch<{booking:StaffBookingDetail}>('staff/appointments/detail?id='+selected.id);
   setSelected(result.booking);setMeetingDraft(result.booking.meetingUrl||'');
   meetCommand.current=null;setMeetAction(null);
   toast.success(action==='END'?(ar?'تم إنهاء المكالمة الحالية':'Active call ended'):action==='REMOVE'?(ar?'تمت إزالة رابط الموعد':'Appointment link removed'):(ar?'تم حفظ رابط Google Meet':'Google Meet link saved'));
   await load();
  }catch(err){
   const msg=meetErrorMessage(err,locale,b.error);
   setError(msg);toast.error(msg);
  }finally{setBusy(false);}
 }

 async function bulk(form:HTMLFormElement){
  if(busy||!list||identity.staff.role!=='ADMIN')return;
  const reason=String(new FormData(form).get('bulkReason')||'');
  if(reason.trim().length<3)return;
  const records=list.items.filter(row=>checkedIds.includes(row.id));
  if(!records.length)return;
  setBusy(true);setError('');
  let completed=0;let failure='';
  try{
   for(const row of records){
    await bookingFetch('staff/appointments/action',{id:row.id,version:row.version,idempotencyKey:crypto.randomUUID(),action:bulkAction,reason},identity.csrfToken);
    completed++;
   }
   setCheckedIds([]);setSelected(null);
   toast.success(ar?'\u062a\u0645 \u062a\u062d\u062f\u064a\u062b '+completed+' \u0645\u0648\u0627\u0639\u064a\u062f':completed+' appointments updated');
  }catch{
   failure=ar?'\u062a\u0645 \u062a\u062d\u062f\u064a\u062b '+completed+'. \u062a\u0648\u0642\u0641 \u0627\u0644\u0628\u0627\u0642\u064a. \u0631\u0627\u062c\u0639 \u0627\u0644\u0646\u062a\u0627\u0626\u062c.':completed+' appointments updated; remaining actions stopped. Review refreshed records before retrying.';
   setCheckedIds([]);
  }finally{await load();setBusy(false);if(failure){setError(failure);toast.error(failure);}}
 }

 const ticket=selected?.changes.find(v=>activeChanges.some(s=>s===v.status));
 const scope=identity.staff.role==='MANAGER'?(ar?'مواعيدي المعيّنة':'My assigned meetings'):(ar?'أجندة الفريق':'Team agenda');

 function shiftRange(direction:number){
  const params=new URLSearchParams(query);
  const applied={from:params.get('from')||businessDate(),to:params.get('to')||businessDate()};
  const span=Math.max(1,Math.min(31,Math.round((Date.parse(applied.to)-Date.parse(applied.from))/86400000)+1));
  const next={...filter,from:addDays(applied.from,direction*span),to:addDays(applied.to,direction*span)};
  setFilter(next);setPage(0);setQuery(filterQuery(next));
 }

 function applyStatFilter(kind:'today'|'all'|'pending'|'requests'|'unassigned'){
  const today=businessDate(list?.timezone);
  const next={
   ...filter,
   ...(kind==='today'?{from:today,to:today,status:'ALL',changes:'all',assignment:'all'}:
   kind==='pending'?{status:'PENDING',changes:'all',assignment:'all'}:
   kind==='requests'?{status:'ALL',changes:'open',assignment:'all'}:
   kind==='unassigned'?{status:'ALL',changes:'all',assignment:'unassigned'}:
   {status:'ALL',changes:'all',assignment:'all'})
  };
  setFilter(next);setPage(0);setQuery(filterQuery(next));
 }

 const todayKey=businessDate(list?.timezone);
 const todayCount=list?list.items.filter(item=>businessDate(item.timezone,new Date(item.startsAt))===todayKey).length:0;
 const pendingCount=list?list.items.filter(item=>item.status==='PENDING').length:0;
 const requestCount=list?list.items.filter(item=>item.changes.some(ch=>activeChanges.some(st=>st===ch.status))).length:0;
 const unassignedCount=list?list.items.filter(item=>!item.assignedToId&&(!item.assignees||item.assignees.length===0)).length:0;

 return (
  <>
   {list?.isDemo&&<p className="demo-banner">{b.demo}</p>}

   <PageHeader
    icon={identity.staff.role==='MANAGER'?'user-linear':'calendar-linear'}
    title={scope}
    description={c.reviewRequired}
    action={canWrite&&(
     <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
       <button type="button" className="button button-primary"><SolarIcon name="add-circle-linear"/>{c.newBooking}</button>
      </DialogTrigger>
      <DialogContent locale={locale} title={c.newBooking}>
       <BookingWizard locale={locale} staffCsrf={identity.csrfToken} assignees={canAssign?assignees:undefined} onCreated={()=>{setCreateOpen(false);toast.success(b.saved);void load();}}/>
      </DialogContent>
     </Dialog>
    )}
   />

   <div className="dash-stat-grid dash-stat-interactive">
    <button type="button" className="dash-stat-btn" onClick={()=>applyStatFilter('today')}><StatCard icon="clock-circle-linear" value={todayCount} label={c.today} tone="accent"/></button>
    <button type="button" className="dash-stat-btn" onClick={()=>applyStatFilter('all')}><StatCard icon="calendar-linear" value={list?.total??0} label={c.total}/></button>
    <button type="button" className="dash-stat-btn" onClick={()=>applyStatFilter('pending')}><StatCard icon="danger-triangle-linear" value={pendingCount} label={bookingLabel(locale,'PENDING')} tone="warn"/></button>
    <button type="button" className="dash-stat-btn" onClick={()=>applyStatFilter('requests')}><StatCard icon="chat-round-line-linear" value={requestCount} label={c.requests}/></button>
    {canAssign&&<button type="button" className="dash-stat-btn" onClick={()=>applyStatFilter('unassigned')}><StatCard icon="users-group-rounded-linear" value={unassignedCount} label={ar?'غير معين':'Unassigned'}/></button>}
   </div>

   {error&&<p role="alert" className="staff-alert">{error}</p>}

   <div className="dash-desk-controls">
    <div className="booking-actions agenda-toolbar" aria-label={c.agenda}>
     <IconButton label={c.previous+' · '+c.dateRange} name="alt-arrow-left-linear" className="button button-secondary directional-control" disabled={listLoading} onClick={()=>shiftRange(-1)}/>
     <button type="button" className="button button-secondary" onClick={()=>{const today=businessDate(list?.timezone);const next={...filter,from:today,to:mode==='day'?today:mode==='month'?addDays(today.slice(0,7)+'-01',34):addDays(today,6)};setFilter(next);setQuery(filterQuery(next));setPage(0);}}>{c.today}</button>
     <IconButton label={c.next+' · '+c.dateRange} name="alt-arrow-right-linear" className="button button-secondary directional-control" disabled={listLoading} onClick={()=>shiftRange(1)}/>
     <span className="dash-date-range-pill"><SolarIcon name="calendar-linear"/><bdi>{new URLSearchParams(query).get('from')} — {new URLSearchParams(query).get('to')}</bdi></span>
    </div>

    <div className="booking-actions agenda-toolbar">
     <IconButton className="button button-secondary" label={c.day} name="clock-circle-linear" aria-pressed={mode==='day'} onClick={()=>{const today=businessDate(list?.timezone);const next={...filter,from:today,to:today};setFilter(next);setQuery(filterQuery(next));setPage(0);setMode('day');}}/>
     <IconButton className="button button-secondary" label={c.week} name="calendar-linear" aria-pressed={mode==='week'} onClick={()=>{const today=businessDate(list?.timezone);const next={...filter,from:today,to:addDays(today,6)};setFilter(next);setQuery(filterQuery(next));setPage(0);setMode('week');}}/>
     <IconButton className="button button-secondary" label={ar?'الشهر':'Month'} name="widget-2-linear" aria-pressed={mode==='month'} onClick={()=>{const today=businessDate(list?.timezone);const start=today.slice(0,7)+'-01';const next={...filter,from:start,to:addDays(start,34)};setFilter(next);setQuery(filterQuery(next));setPage(0);setMode('month');}}/>
     <Popover>
      <PopoverTrigger asChild>
       <IconButton type="button" className="button button-secondary" name="filter-linear" label={ar?'تصفية المواعيد':'Filter appointments'}/>
      </PopoverTrigger>
      <PopoverContent locale={locale} className="desk-filter-popover" aria-label={c.filter}>
       <form className="booking-filters" onSubmit={e=>{e.preventDefault();setPage(0);setQuery(filterQuery(filter));if(filterQuery(filter)===query)void load();setError('');}}>
        <label>{c.from}<input type="date" value={filter.from} onChange={e=>setFilter(v=>({...v,from:e.target.value}))} required/></label>
        <label>{c.to}<input type="date" value={filter.to} onChange={e=>setFilter(v=>({...v,to:e.target.value}))} required/></label>
        <label>{c.search}<input type="search" value={filter.search} maxLength={120} onChange={e=>setFilter(v=>({...v,search:e.target.value}))}/></label>
        <label>{c.status}<AppSelect label={c.status} locale={locale} value={filter.status} onChange={value=>setFilter(v=>({...v,status:value}))} options={[{value:'ALL',label:c.all},...bookingStatuses.map(status=>({value:status,label:bookingLabel(locale,status)}))]}/></label>
        <label>{b.format}<AppSelect label={b.format} locale={locale} value={filter.format||'ALL'} onChange={value=>setFilter(v=>({...v,format:value==='ALL'?'':value}))} options={[{value:'ALL',label:c.all},{value:'ONLINE',label:b.ONLINE},{value:'IN_PERSON',label:b.IN_PERSON}]}/></label>
        {canAssign&&<label className="booking-check"><Switch checked={filter.assignment==='unassigned'} onCheckedChange={checked=>setFilter(previous=>({...previous,assignment:checked?'unassigned':'all'}))}/><span>{ar?'\u063a\u064a\u0631 \u0645\u0639\u064a\u0646 \u0641\u0642\u0637':'Unassigned only'}</span></label>}
        <label className="booking-check"><Switch checked={filter.changes==='open'} onCheckedChange={checked=>setFilter(v=>({...v,changes:checked?'open':'all'}))}/><span>{c.openOnly}</span></label>
        <div className="booking-actions">
         <button type="submit" className="button button-primary" disabled={listLoading}><SolarIcon name="filter-linear"/>{c.filter}</button>
         <button type="button" className="button button-secondary" onClick={()=>applyStatFilter('all')}>{ar?'مسح':'Clear'}</button>
        </div>
       </form>
      </PopoverContent>
     </Popover>
     <IconButton className={`button button-secondary agenda-refresh ${listLoading?'is-spinning':''}`} label={b.refresh} name="refresh-linear" disabled={listLoading} aria-busy={listLoading} onClick={()=>void load()}/>
    </div>
   </div>

   {!list?<SkeletonList rows={5}/>:(
    <section className="staff-panel agenda-results" aria-busy={listLoading} aria-label={c.agenda}>
     <FullCalendarAgenda
      list={list}
      locale={locale}
      mode={mode}
      currentDate={filter.from}
      editable={canWrite}
      onSelect={id=>void select(id)}
      onRangeChange={(from,to)=>{
       if(from===filter.from&&to===filter.to)return;
       const next={...filter,from,to};
       setFilter(next);setQuery(filterQuery(next));setPage(0);
      }}
      onRescheduleDrop={handleRescheduleDrop}
     />

     {identity.staff.role==='ADMIN'&&(
      <form className="agenda-bulk staff-form" onSubmit={event=>{event.preventDefault();if(!bulkReviewed)return;void bulk(event.currentTarget);setBulkReviewed(false);}}>
       <label className="booking-check"><input type="checkbox" className="dash-card-checkbox" disabled={busy||listLoading||!list.items.length} checked={list.items.length>0&&list.items.every(row=>checkedIds.includes(row.id))} onChange={event=>setCheckedIds(event.target.checked?list.items.map(row=>row.id):[])}/><span>{ar?'\u062a\u062d\u062f\u064a\u062f \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629':'Select all'}</span></label>
       <span>{list.items.filter(row=>checkedIds.includes(row.id)).length} {ar?'\u0645\u062d\u062f\u062f':'selected'}</span>
       {list.items.some(row=>checkedIds.includes(row.id))&&<>
        <label>{c.action}<AppSelect locale={locale} label={c.action} value={bulkAction} onChange={value=>setBulkAction(value as typeof bulkAction)} options={['CONFIRM','CANCEL','DELETE'].map(value=>({value,label:value==='DELETE'?(ar?'\u062d\u0630\u0641 \u0627\u0644\u0645\u0648\u0627\u0639\u064a\u062f':'Delete appointments'):c[value as 'CONFIRM'|'CANCEL']}))}/></label>
        <label>{c.reason}<input name="bulkReason" minLength={3} maxLength={1000} required/></label>
        <label className="booking-check"><Switch checked={bulkReviewed} onCheckedChange={setBulkReviewed}/><span>{ar?'\u0631\u0627\u062c\u0639\u062a \u0627\u0644\u0645\u0648\u0627\u0639\u064a\u062f \u0648\u0623\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621':'I reviewed these appointments and their client notifications.'}</span></label>
        <button disabled={busy||listLoading||!bulkReviewed} className="button button-primary">{busy?b.loading:c.save}</button>
       </>}
      </form>
     )}

     {!list.items.length?(
      <EmptyState icon="calendar-linear" title={c.none} description={ar?'جرّب توسيع النطاق الزمني أو إزالة بعض المرشحات.':'Try widening the date range or clearing filters.'}/>
     ):(
      <AppointmentAgenda list={list} locale={locale} busy={busy||listLoading} selectedId={selected?.id} checkedIds={checkedIds} onCheck={identity.staff.role==='ADMIN'?(id,checked)=>setCheckedIds(previous=>checked?[...previous,id]:previous.filter(value=>value!==id)):undefined} onSelect={id=>void select(id)}/>
     )}

     <div className="staff-pagination">
      <button className="button button-secondary" disabled={page===0||listLoading} onClick={()=>setPage(v=>v-1)}><SolarIcon name="alt-arrow-left-linear" className="directional-icon"/>{c.previous}</button>
      <span>{page+1}</span>
      <button className="button button-secondary" disabled={listLoading||(page+1)*25>=list.total} onClick={()=>setPage(v=>v+1)}>{c.next}<SolarIcon name="alt-arrow-right-linear" className="directional-icon"/></button>
     </div>
    </section>
   )}

   <SideDrawer
    open={Boolean(selected)}
    onOpenChange={open=>{if(!open){setSelected(null);selectedTrigger.current?.focus();}}}
    locale={locale}
    title={selected?.clientName||c.detail}
    description={selected?`${selected.reference} · ${bookingLabel(locale,selected.status)}`:undefined}
   >
    {selected&&(
     <div key={selected.id+':'+selected.version} className="dash-drawer-body">
      <div className="appointment-detail-meta">
       <bdi>{selected.reference}</bdi>
       <span className="appointment-status" data-status={selected.status}>{bookingLabel(locale,selected.status)}</span>
      </div>
      {identity.staff.role==='ADMIN'&&<button type="button" className="button button-secondary" disabled={busy} onClick={()=>{setDetailTab('details');setAction('DELETE');}}><SolarIcon name="trash-bin-trash-linear"/>{ar?'حذف الموعد':'Delete appointment'}</button>}
      <Tabs value={detailTab} onValueChange={setDetailTab} dir={ar?'rtl':'ltr'}>
       <TabsList className="desk-detail-tabs" aria-label={c.detail}>
        <TabsTrigger value="details">{c.detail}</TabsTrigger>
        <TabsTrigger value="links">{ar?'\u0627\u0644\u062a\u0639\u064a\u064a\u0646 \u0648\u0627\u0644\u0631\u0648\u0627\u0628\u0637':'Assign & Meet/HubSpot'}</TabsTrigger>
        <TabsTrigger value="activity">{c.history}</TabsTrigger>
       </TabsList>

       <TabsContent value="details" forceMount hidden={detailTab!=='details'}>
        <dl className="appointment-detail-facts">
         <div><dt><SolarIcon name="clock-circle-linear"/>{c.time}</dt><dd>{appointmentDate(selected.startsAt,locale,selected.timezone)} · <bdi>{selected.timezone}</bdi></dd></div>
         <div><dt><SolarIcon name="user-linear"/>{b.name}</dt><dd>{selected.clientName}</dd></div>
         <div><dt><SolarIcon name="letter-linear"/>{b.email}</dt><dd className="dash-email-cell"><a href={'mailto:'+selected.email}><bdi>{selected.email}</bdi></a><button type="button" className="button button-secondary dash-copy-btn" aria-label={ar?'نسخ البريد':'Copy email'} onClick={()=>void navigator.clipboard.writeText(selected.email).then(()=>toast.success(ar?'تم نسخ البريد':'Email copied')).catch(()=>toast.error(b.error))}><SolarIcon name="link-round-linear"/></button></dd></div>
         {selected.phone&&<div><dt><SolarIcon name="phone-linear"/>{b.phone}</dt><dd><a href={'tel:'+selected.phone.replace(/[^+0-9]/g,'')}><bdi>{selected.phone}</bdi></a></dd></div>}
         {selected.company&&<div><dt><SolarIcon name="case-round-linear"/>{b.company}</dt><dd>{selected.company}</dd></div>}
         {selected.notes&&<div className="appointment-detail-notes"><dt><SolarIcon name="chat-round-line-linear"/>{b.notes}</dt><dd>{selected.notes}</dd></div>}
        </dl>
        {ticket&&<div className="booking-ticket"><h3>{c.requests}</h3><p>{bookingLabel(locale,ticket.kind)} · {bookingLabel(locale,ticket.status)}</p><p>{ticket.reason}</p>{ticket.requestedStartAt&&<p>{b.requested}: {appointmentDate(ticket.requestedStartAt,locale,selected.timezone)}</p>}{ticket.proposedStartAt&&<p>{b.alternative}: {appointmentDate(ticket.proposedStartAt,locale,selected.timezone)}</p>}</div>}
        {canWrite&&(['PENDING','CONFIRMED'].includes(selected.status)||identity.staff.role==='ADMIN')&&(
         <form className="staff-form" id="appointment-edit-form" method="post" action="/api/staff/appointments/action" onSubmit={e=>{e.preventDefault();if(action==='DELETE'||action==='CANCEL'){setConfirmForm(e.currentTarget);return;}void executeSave(e.currentTarget);}}>
          <label>{c.action}<AppSelect label={c.action} locale={locale} value={action} onChange={value=>{setAction(value);setSlot('');}} options={['EDIT',...(identity.staff.role==='ADMIN'?['DELETE']:[]),...(selected.status==='PENDING'?['CONFIRM']:[]),'CANCEL','RESCHEDULE','COMPLETE','NO_SHOW',...(ticket?[...(ticket.status==='OPEN'?['REVIEW']:[]),...(ticket.status!=='ALTERNATIVE_PROPOSED'?['APPROVE']:[]),'DECLINE',...(ticket.kind==='RESCHEDULE'?['PROPOSE']:[])]:[])].map(value=>({value,label:value==='DELETE'?(ar?'حذف الموعد':'Delete appointment'):c[value as keyof typeof c] as string}))}/></label>
          {action==='EDIT'&&(['clientName','email','phone','company','notes'] as const).map(name=><label key={name}>{b[name==='clientName'?'name':name]}<input name={name} defaultValue={selected[name]||''} required={name==='email'||name==='clientName'} type={name==='email'?'email':'text'} maxLength={name==='email'?254:name==='phone'?40:name==='notes'?1500:120} dir={name==='email'||name==='phone'?'ltr':undefined}/></label>)}
          {action==='DELETE'&&<p role="note">{ar?'سيُزال الموعد من الأجندة مع الاحتفاظ بسجل التغييرات. ستُلغى المواعيد النشطة ويُبلغ العميل.':'This removes the appointment from the agenda while retaining its audit history. Active appointments are cancelled and the client is notified.'}</p>}
          {(action==='RESCHEDULE'||action==='PROPOSE')&&rules&&<SlotPicker locale={locale} durationMinutes={(new Date(selected.endsAt).getTime()-new Date(selected.startsAt).getTime())/60000} service={selected.serviceSlug} format={selected.meetingType} timezone={rules.timezone} value={slot} onChange={setSlot}/>}
          <label>{c.reason}<textarea name="reason" minLength={3} maxLength={1000} required disabled={busy}/></label>
          <div className="dash-drawer-sticky-footer">
           <button className="button button-primary" disabled={busy||((action==='RESCHEDULE'||action==='PROPOSE')&&!slot)}>{busy&&<SolarIcon name="refresh-linear" className="booking-spinner"/>}{action==='DELETE'&&<SolarIcon name="trash-bin-trash-linear"/>}{busy?b.loading:c.save}</button>
          </div>
         </form>
        )}
       </TabsContent>

       <TabsContent value="links" forceMount hidden={detailTab!=='links'}>
        {canAssign&&action==='EDIT'&&<AssigneePicker key={selected.id+':'+selected.version} locale={locale} options={assignees} defaultValue={selected.assignees?.map(a=>a.staff.id)??(selected.assignedToId?[selected.assignedToId]:[])} form="appointment-edit-form" disabled={busy} onChange={()=>setAssignmentDirty(true)}/>}
        {action==='EDIT'&&selected.meetingType==='ONLINE'&&<label className="dash-drawer-field">{ar?'رابط الاجتماع (Google Meet أو Zoom أو Teams)':'Meeting link (Google Meet, Zoom or Teams)'}<input type="url" name="meetingUrl" form="appointment-edit-form" dir="ltr" maxLength={1000} value={meetingDraft} onChange={event=>setMeetingDraft(event.target.value)}/><small>{ar?'أضف رابط الاجتماع الحقيقي لإرساله إلى العميل.':'Add the real meeting link to send it to the client.'}</small></label>}
        {selected.meetingUrl&&<div className="booking-actions"><a className="button button-secondary" href={selected.meetingUrl} target="_blank" rel="noopener noreferrer">{ar?'\u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0644\u0644\u0627\u062c\u062a\u0645\u0627\u0639':'Join meeting'}</a><button type="button" className="button button-secondary" onClick={()=>void navigator.clipboard.writeText(selected.meetingUrl!).then(()=>toast.success(ar?'\u062a\u0645 \u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637':'Link copied')).catch(()=>toast.error(b.error))}>{ar?'\u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637':'Copy link'}</button></div>}
        {selected.meetingType==='ONLINE'&&canWrite&&!selected.meetingUrl&&['PENDING','CONFIRMED'].includes(selected.status)&&(
         <div className="dash-meet-generate">
          {(!(selected.assignees?.length||selected.assignedToId)||assignmentDirty)&&<p role="status" className="staff-note">{ar?'اختر مديرًا واحفظ التعيين من تفاصيل الموعد قبل إنشاء الرابط.':'Choose a manager and save the assignment in Appointment details before generating a link.'}</p>}
          <button type="button" className="button button-primary" disabled={busy||!list?.googleMeetEnabled||selected.isDemo||assignmentDirty||!(selected.assignees?.length||selected.assignedToId)} aria-busy={busy} onClick={()=>void generateMeet()}>
           <SolarIcon name="videocamera-record-linear"/>{ar?'\u0625\u0646\u0634\u0627\u0621 \u0631\u0627\u0628\u0637 Google Meet':'Generate Google Meet link'}
          </button>
          {(!list?.googleMeetEnabled||selected.isDemo)&&<small className="staff-note">{selected.isDemo?(ar?'حجوزات العرض التجريبي لا تنشئ روابط Google Meet تلقائيًا.':'Demo bookings do not auto-create Google Meet links.'):(ar?'تكامل Google Calendar/Meet غير مهيأ في الخادم بعد.':'Google Calendar/Meet integration is not configured on the server yet.')}</small>}
         </div>
        )}
        {canAssign&&action==='EDIT'&&<p className="staff-note">{ar?'\u0627\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u064a\u064a\u0646 \u0648\u0627\u0644\u0631\u0627\u0628\u0637 \u0645\u0646 \u062a\u0628\u0648\u064a\u0628 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644.':'Save assignments and link from the Details tab.'}</p>}
        <HubSpotStatus locale={locale} notifications={selected.notifications} contactUrl={selected.hubspotContactUrl} meetingUrl={selected.hubspotMeetingUrl} meetingId={selected.hubspotMeetingId} busy={busy} onRefresh={()=>void select(selected.id)}/>
        {canWrite&&selected.meetingUrl&&['PENDING','CONFIRMED'].includes(selected.status)&&!selected.isDemo&&<div className="booking-actions">
         <button type="button" className="button button-secondary" disabled={busy||Boolean(selected.googleEventId&&!list?.googleMeetEnabled)} onClick={()=>setMeetAction('REMOVE')}><SolarIcon name="trash-bin-trash-linear"/>{ar?'إزالة رابط الموعد':'Remove appointment link'}</button>
         {selected.googleEventId&&<><button type="button" className="button button-secondary" disabled={busy||!list?.googleMeetControlsEnabled} onClick={()=>setMeetAction('END')}>{ar?'إنهاء المكالمة الحالية':'End active call'}</button>
         <button type="button" className="button button-secondary" disabled={busy||!list?.googleMeetEnabled||assignmentDirty||!(selected.assignees?.length||selected.assignedToId)} onClick={()=>setMeetAction('REGENERATE')}>{ar?'إنشاء رابط بديل':'Generate replacement link'}</button></>}
        </div>}
        {canWrite&&selected.googleEventId&&<p className="staff-note">{ar?'إنهاء المكالمة يتطلب صلاحيات Google Meet إضافية. إنهاء المكالمة أو استبدال الرابط لا يضمن تعطيل الرابط القديم نهائيًا.':'Ending a call requires additional Google Meet permissions. Ending or replacing a call does not permanently disable the old URL.'}</p>}
        <h3>{ar?'إشعارات البريد':'Email notifications'}</h3>
        {(['client','staff'] as const).map(target=>{
         const notice=selected.notifications.find(item=>item.kind.endsWith(':EMAIL')&&(target==='staff'?item.kind.includes(':OWNER:'):!item.kind.includes(':OWNER:')));
         const status=notice?.status;
         const label=status==='DELIVERED'?(ar?'قبله مزود البريد؛ وصوله إلى صندوق الوارد غير مؤكد':'Accepted by email provider; inbox receipt unverified'):status==='FAILED'?(ar?'فشل الإرسال':'Sending failed'):status==='UNCONFIGURED'?(ar?'البريد غير مهيأ':'Email not configured'):status==='SKIPPED'?(ar?'لم يُرسل':'Not sent'):status?(ar?'قيد الإرسال':'Queued / processing'):(ar?'الحالة غير متاحة':'Status unavailable');
         return <p key={target}>{target==='client'?(ar?'العميل':'Client'):(ar?'المديرون المعينون وصندوق الحجوزات':'Assigned managers / booking inbox')}: {label}</p>;
        })}
        <button type="button" className="button button-secondary" disabled={busy} onClick={()=>void select(selected.id)}>{ar?'تحديث حالة البريد':'Refresh email status'}</button>
       </TabsContent>

       <TabsContent value="activity" forceMount hidden={detailTab!=='activity'}>
        <h3>{c.history}</h3>
        <ul className="booking-history">{selected.events.map(event=><li key={event.id}><time>{appointmentDate(event.createdAt,locale,selected.timezone)}</time><span>{bookingLabel(locale,event.kind)}</span>{typeof event.details.reason==='string'&&<p>{event.details.reason}</p>}</li>)}</ul>
        <h3>{c.delivery}</h3><p>{bookingDeliveryCopy(locale,selected.notifications)}</p>
        <ul>{selected.changes.map(change=><li key={change.id}>{bookingLabel(locale,change.kind)} · {bookingLabel(locale,change.status)} · {change.staffResponse||change.reason}</li>)}</ul>
       </TabsContent>
      </Tabs>
     </div>
    )}
   </SideDrawer>

   <Dialog open={Boolean(meetAction)} onOpenChange={open=>{if(!open&&!busy)setMeetAction(null);}}>
    <DialogContent locale={locale} title={meetAction==='END'?(ar?'إنهاء المكالمة الحالية؟':'End active call?'):meetAction==='REMOVE'?(ar?'إزالة رابط الموعد؟':'Remove appointment link?'):(ar?'إنشاء رابط بديل؟':'Generate replacement link?')}>
     <p>{meetAction==='END'?(ar?'سيتم إنهاء المكالمة الحالية لجميع المشاركين. هذا لا يحذف رابط Google Meet نهائيًا.':'This ends the current call for everyone. It does not permanently delete the Google Meet URL.'):meetAction==='REMOVE'?(ar?'سيُزال الرابط وأي تفاصيل مؤتمر يديرها النظام في Google Calendar وسيتم إشعار العميل والمديرين المعينين. قد يظل الرابط القديم صالحًا ولا يتم إنهاء المكالمة الحالية.':'This removes the saved link and any managed Calendar conference details, and queues client/manager notifications. It does not end an active call or permanently disable the old URL.'):(ar?'سيتم استبدال رابط الموعد وإضافة إشعارات للعميل والمديرين المعينين إلى قائمة الإرسال. الرابط القديم قد يظل صالحًا.':'This replaces the appointment link and queues notifications for the client and assigned managers. The old URL may remain usable.')}</p>
     <div className="booking-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={()=>setMeetAction(null)}>{ar?'تراجع':'Cancel'}</button><button type="button" className="button button-primary" disabled={busy} aria-busy={busy} onClick={()=>{if(meetAction)void generateMeet(meetAction);}}>{busy?(ar?'جارٍ التنفيذ…':'Working…'):(ar?'تأكيد':'Confirm')}</button></div>
    </DialogContent>
   </Dialog>
   <Dialog open={Boolean(confirmForm)} onOpenChange={open=>{if(!open)setConfirmForm(null);}}>
    <DialogContent locale={locale} title={action==='DELETE'?(ar?'تأكيد حذف الموعد':'Confirm deletion'):(ar?'تأكيد إلغاء الموعد':'Confirm cancellation')}>
     <p>{ar?'هل أنت متأكد من تنفيذ هذا الإجراء؟ قد يتم إشعار العميل بذلك.':'Are you sure you want to proceed with this action? The client may be notified.'}</p>
     <div className="booking-actions">
      <button type="button" className="button button-secondary" onClick={()=>setConfirmForm(null)}>{ar?'تراجع':'Cancel'}</button>
      <button type="button" className="button button-primary" disabled={busy} onClick={()=>{const f=confirmForm;setConfirmForm(null);if(f)void executeSave(f);}}>{ar?'تأكيد':'Confirm'}</button>
     </div>
    </DialogContent>
   </Dialog>
  </>
 );
}

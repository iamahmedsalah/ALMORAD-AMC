'use client';
import {useEffect,useState} from 'react';
import {services,settingsInput,type Locale,type Schedule} from '@amc/shared';
import {SolarIcon} from '@/components/ui/solar-icon';
import {PageHeader,SkeletonList} from '@/components/ui/staff-primitives';
import {Switch} from '@/components/ui/switch';
import {bookingCopy} from './copy';
import {deskCopy} from './desk-copy';
import {BookingError,bookingFetch} from './helpers';
import {StaffBookingShell,type StaffIdentity} from './staff-shell';

export function BookingSettings({locale}:{locale:Locale}){
 return <StaffBookingShell locale={locale} view="settings">{identity=><Settings locale={locale} identity={identity}/>}</StaffBookingShell>;
}

function Settings({locale,identity}:{locale:Locale;identity:StaffIdentity}){
 const c=deskCopy(locale),b=bookingCopy(locale);
 const [data,setData]=useState<Schedule|null>(null);
 const [loaded,setLoaded]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);

 useEffect(()=>{
  let stop=false;
  void bookingFetch<Schedule|null>('staff/booking-settings')
   .then(result=>{if(!stop){setData(result);setLoaded(true);}})
   .catch(()=>{if(!stop)setError(b.error);});
  return()=>{stop=true;};
 },[b.error]);

 async function save(form:HTMLFormElement){
  const f=new FormData(form);
  const numeric=['durationMinutes','stepMinutes','bufferBeforeMinutes','bufferAfterMinutes','leadMinutes','lookaheadDays','changeCutoffMinutes'];
  const numbers=Object.fromEntries(numeric.map(key=>[key,Number(f.get(key))]));
  const input={
   version:data?.version||0,
   timezone:f.get('timezone'),
   ...numbers,
   enabled:f.has('enabled'),
   onlineEnabled:f.has('onlineEnabled'),
   inPersonEnabled:f.has('inPersonEnabled'),
   officeAddressEn:String(f.get('officeAddressEn')||'').trim()||null,
   officeAddressAr:String(f.get('officeAddressAr')||'').trim()||null,
   directionsUrl:String(f.get('directionsUrl')||'').trim()||null,
   weeklyHours:Array.from({length:7},(_,i)=>i+1).filter(day=>f.has('day'+day)).map(day=>({day,open:f.get('open'+day),close:f.get('close'+day)})),
   blackoutDates:String(f.get('blackoutDates')||'').split(/[\s,]+/).filter(Boolean),
   serviceSlugs:f.getAll('serviceSlugs')
  };
  const parsed=settingsInput.safeParse(input);
  if(!parsed.success){setError(b.invalid);return;}
  setBusy(true);setError('');setMessage('');
  try{
   setData(await bookingFetch<Schedule>('staff/booking-settings',parsed.data,identity.csrfToken));
   setMessage(c.settingsSaved);
  }catch(e){
   setError(e instanceof BookingError&&e.status===409?b.conflict:e instanceof BookingError&&e.status===400?b.invalid:b.error);
  }finally{setBusy(false);}
 }

 if(!loaded)return error?<p role="alert" className="staff-alert">{error}</p>:<SkeletonList rows={4}/>;

 return (
  <>
   <PageHeader
    icon="widget-2-linear"
    title={c.settings}
    description={c.singleCalendar}
   />
   {data?.isDemo&&<p className="demo-banner">{b.demo}</p>}
   <p className="staff-note">{c.productionGate}</p>
   {error&&<p role="alert" className="staff-alert">{error}</p>}
   {message&&<p role="status">{message}</p>}

   <form className="booking-settings" key={data?.version||0} method="post" action="/api/staff/booking-settings" onSubmit={e=>{e.preventDefault();void save(e.currentTarget);}}>
    <fieldset disabled={busy} className="dash-settings-stack">
     <section className="staff-panel">
      <h2 className="dash-card-heading"><SolarIcon name="global-linear"/>{locale==='ar'?'التفعيل والمنطقة الزمنية':'Availability & timezone'}</h2>
      <label className="booking-check"><Switch name="enabled" defaultChecked={data?.enabled}/><span>{c.enabled}</span></label>
      <label>{c.timezone}<input name="timezone" defaultValue={data?.timezone||'Africa/Cairo'} required maxLength={80} dir="ltr"/></label>
     </section>

     <section className="staff-panel">
      <h2 className="dash-card-heading"><SolarIcon name="clock-circle-linear"/>{locale==='ar'?'قواعد المواعيد والفواصل':'Slot rules & buffers'}</h2>
      <div className="booking-form-grid">
       {([['durationMinutes','duration',5,240],['stepMinutes','step',5,120],['bufferBeforeMinutes','before',0,240],['bufferAfterMinutes','after',0,240],['leadMinutes','lead',0,10080],['lookaheadDays','lookahead',1,90],['changeCutoffMinutes','cutoff',0,10080]] as const).map(([name,label,min,max])=>(
        <label key={name}>{c[label]}<input type="number" name={name} min={min} max={max} step={1} defaultValue={data?.[name]??''} required/></label>
       ))}
      </div>
      <p className="staff-note">{locale==='ar'?'تُطبق الفواصل على المواعيد الحضورية وعبر الإنترنت لمنع التداخل.':'Buffers apply to both onsite and online appointments to prevent overlaps.'}</p>
     </section>

     <section className="staff-panel">
      <h2 className="dash-card-heading"><SolarIcon name="map-point-linear"/>{locale==='ar'?'نوع الاجتماع والموقع':'Meeting formats & location'}</h2>
      <label className="booking-check"><Switch name="onlineEnabled" defaultChecked={data?.onlineEnabled}/><span>{c.online}</span></label>
      <label className="booking-check"><Switch name="inPersonEnabled" defaultChecked={data?.inPersonEnabled}/><span>{c.inPerson}</span></label>
      {([['officeAddressEn','addressEn'],['officeAddressAr','addressAr'],['directionsUrl','directions']] as const).map(([name,label])=>(
       <label key={name}>{c[label]}<input name={name} type={name==='directionsUrl'?'url':'text'} maxLength={name==='directionsUrl'?1000:500} dir={name==='officeAddressAr'?'rtl':'ltr'} defaultValue={data?.[name]||''}/></label>
      ))}
     </section>

     <section className="staff-panel">
      <h2 className="dash-card-heading"><SolarIcon name="calendar-linear"/>{c.hours}</h2>
      <div className="hours-grid">
       {c.weekdays.map((day,i)=>{
        const hours=data?.weeklyHours.find(v=>v.day===i+1);
        return (
         <div key={day}>
          <label className="booking-check"><Switch name={'day'+(i+1)} defaultChecked={Boolean(hours)}/><span>{day}</span></label>
          <label>{c.open}<input type="time" name={'open'+(i+1)} defaultValue={hours?.open||''}/></label>
          <label>{c.end}<input type="time" name={'close'+(i+1)} defaultValue={hours?.close||''}/></label>
         </div>
        );
       })}
      </div>
     </section>

     <section className="staff-panel">
      <h2 className="dash-card-heading"><SolarIcon name="danger-triangle-linear"/>{c.closedDates}</h2>
      <label><textarea name="blackoutDates" dir="ltr" defaultValue={data?.blackoutDates.join('\n')||''}/></label>
     </section>

     <section className="staff-panel">
      <h2 className="dash-card-heading"><SolarIcon name="case-round-linear"/>{c.services}</h2>
      <div className="dash-services-grid">
       {services.map(service=>(
        <label className="booking-check" key={service.slug}>
         <Switch name="serviceSlugs" value={service.slug} defaultChecked={data?data.serviceSlugs.includes(service.slug):false}/>
         <span>{service[locale]}</span>
        </label>
       ))}
      </div>
     </section>

     <div className="dash-sticky-save">
      <span className="staff-note">{locale==='ar'?'احفظ التغييرات لتطبيقها على صفحة الحجز.':'Save changes to update the public booking schedule.'}</span>
      <button className="button button-primary" disabled={busy} aria-busy={busy}>
       {busy&&<SolarIcon name="refresh-linear" className="booking-spinner"/>}
       {busy?b.loading:c.saveSettings}
      </button>
     </div>
    </fieldset>
   </form>
  </>
 );
}

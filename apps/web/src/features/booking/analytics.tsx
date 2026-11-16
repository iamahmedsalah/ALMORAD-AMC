'use client';
import {useEffect,useState} from 'react';
import {services,type Analytics,type Locale} from '@amc/shared';
import {AppSelect} from '@/components/ui/app-select';
import {SolarIcon} from '@/components/ui/solar-icon';
import {PageHeader,SkeletonList,StatCard} from '@/components/ui/staff-primitives';
import {bookingCopy,bookingLabel} from './copy';
import {deskCopy} from './desk-copy';
import {bookingFetch,businessDate} from './helpers';
import {StaffBookingShell} from './staff-shell';

export function BookingAnalytics({locale}:{locale:Locale}){
 return <StaffBookingShell locale={locale} view="analytics">{()=> <AnalyticsView locale={locale}/>}</StaffBookingShell>;
}

function AnalyticsView({locale}:{locale:Locale}){
 const c=deskCopy(locale),b=bookingCopy(locale);
 const [filters,setFilters]=useState(()=>({from:businessDate().slice(0,8)+'01',to:businessDate(),service:'',format:''}));
 const [query,setQuery]=useState(()=>new URLSearchParams({from:filters.from,to:filters.to}).toString());
 const [data,setData]=useState<Analytics|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
  let stop=false;
  async function load(){
   setLoading(true);
   await bookingFetch<Analytics>('staff/booking-analytics?'+query)
    .then(result=>{if(!stop){setData(result);setError('');}})
    .catch(()=>{if(!stop)setError(b.error);})
    .finally(()=>{if(!stop)setLoading(false);});
  }
  void load();
  return()=>{stop=true;};
 },[query,b.error]);

 const percent=(v:number|null)=>v===null?'\u2014':new Intl.NumberFormat(locale,{style:'percent',maximumFractionDigits:1}).format(v);
 const count=(v:number)=>new Intl.NumberFormat(locale).format(v);
 const blocks=data?[[c.byService,data.byService],[c.byType,data.byType],[c.byStatus,data.byStatus]] as const:[];

 return (
  <>
   <PageHeader
    icon="chart-2-linear"
    title={c.analytics}
    description={data?`${b.timezone} ${data.timezone}`:c.definitions}
   />
   {data?.isDemo&&<p className="demo-banner">{b.demo}</p>}

   <form className="booking-filters dash-analytics-filters" onSubmit={e=>{e.preventDefault();setQuery(new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=>Boolean(v)))).toString());}}>
    <label>{c.from}<input type="date" required value={filters.from} onChange={e=>setFilters(v=>({...v,from:e.target.value}))}/></label>
    <label>{c.to}<input type="date" required value={filters.to} onChange={e=>setFilters(v=>({...v,to:e.target.value}))}/></label>
    <label>{b.service}<AppSelect label={b.service} locale={locale} value={filters.service||'ALL'} onChange={value=>setFilters(v=>({...v,service:value==='ALL'?'':value}))} options={[{value:'ALL',label:c.all},...services.map(service=>({value:service.slug,label:service[locale]}))]}/></label>
    <label>{b.format}<AppSelect label={b.format} locale={locale} value={filters.format||'ALL'} onChange={value=>setFilters(v=>({...v,format:value==='ALL'?'':value}))} options={[{value:'ALL',label:c.all},{value:'ONLINE',label:b.ONLINE},{value:'IN_PERSON',label:b.IN_PERSON}]}/></label>
    <button className="button button-primary" disabled={loading}><SolarIcon name="filter-linear"/>{c.filter}</button>
   </form>

   {error&&<p role="alert" className="staff-alert">{error}</p>}
   {loading&&!data?<SkeletonList rows={4}/>:data&&(
    <>
     <div className="dash-stat-grid">
      <StatCard icon="calendar-linear" value={data.total} label={c.created} tone="accent"/>
      <StatCard icon="clock-circle-linear" value={data.today} label={c.today}/>
      <StatCard icon="arrow-right-up-linear" value={data.upcoming} label={c.upcoming} tone="success"/>
      <StatCard icon="chat-round-line-linear" value={data.pendingChanges} label={c.pending} tone="warn"/>
      <StatCard icon="check-circle-linear" value={data.completed} label={c.completed} tone="success"/>
      <StatCard icon="danger-triangle-linear" value={data.cancelled} label={c.cancelled} trend={percent(data.cancellationRate)}/>
      <StatCard icon="close-linear" value={data.noShow} label={c.noShow} trend={percent(data.noShowRate)}/>
      <StatCard icon="clock-circle-linear" value={data.averageResolutionHours===null?'\u2014':new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(data.averageResolutionHours)+'h'} label={c.resolution}/>
     </div>
     <p className="staff-note">{c.definitions}</p>

     <section className="staff-panel">
      <h2 className="dash-card-heading"><SolarIcon name="chart-2-linear"/>{c.trend}</h2>
      {!data.trend.length?<p>{c.none}</p>:(
       <>
        <div className="booking-chart" aria-hidden="true">
         {data.trend.map(row=><div key={row.date}><span style={{height:Math.max(3,100*row.count/Math.max(...data.trend.map(v=>v.count)))+'%'}}/><small>{row.date.slice(5)}</small></div>)}
        </div>
        <div className="staff-table-wrap" tabIndex={0}>
         <table><thead><tr><th>{c.date}</th><th>{c.count}</th></tr></thead><tbody>{data.trend.map(row=><tr key={row.date}><td>{row.date}</td><td>{count(row.count)}</td></tr>)}</tbody></table>
        </div>
       </>
      )}
     </section>

     <div className="booking-breakdowns">
      {blocks.map(([title,rows])=>(
       <section className="staff-panel" key={title}>
        <h2>{title}</h2>
        <table><thead><tr><th>{b.kind}</th><th>{c.count}</th></tr></thead><tbody>{rows.map(row=><tr key={row.key}><td>{services.find(s=>s.slug===row.key)?.[locale]||bookingLabel(locale,row.key)}</td><td>{count(row.count)}</td></tr>)}</tbody></table>
       </section>
      ))}
     </div>
    </>
   )}
  </>
 );
}

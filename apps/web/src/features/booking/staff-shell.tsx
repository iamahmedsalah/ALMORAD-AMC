'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {can,type Locale,type StaffRole} from '@amc/shared';
import {bookingCopy} from './copy';
import {deskCopy} from './desk-copy';
import {BookingError,bookingFetch} from './helpers';
import {SolarIcon} from '@/components/ui/solar-icon';
export type StaffIdentity={staff:{id:string;email:string;role:StaffRole};csrfToken:string};
export function OperationsNavigation({locale,role,view}:{locale:Locale;role?:StaffRole;view:'calendar'|'analytics'|'settings'|'account'}) {
 const c=deskCopy(locale);
 return <nav className="staff-tabs operations-nav" aria-label={c.title}>
  <a href={'/'+locale+'/staff/calendar'} aria-current={view==='calendar'?'page':undefined}><SolarIcon name="calendar-linear"/>{c.agenda}</a>
  {role&&can(role,'analytics:read')&&<a href={'/'+locale+'/staff/analytics'} aria-current={view==='analytics'?'page':undefined}><SolarIcon name="chart-2-linear"/>{c.analytics}</a>}
  {role&&can(role,'settings:write')&&<a href={'/'+locale+'/staff/settings'} aria-current={view==='settings'?'page':undefined}><SolarIcon name="widget-2-linear"/>{c.settings}</a>}
  <a href={'/'+locale+'/staff'} aria-current={view==='account'?'page':undefined}><SolarIcon name="users-group-rounded-linear"/>{c.account}</a>
 </nav>;
}
export function StaffBookingShell({locale,view,children}:{locale:Locale;view:'calendar'|'analytics'|'settings';children:(identity:StaffIdentity)=>React.ReactNode}){
 const c=deskCopy(locale),b=bookingCopy(locale);const router=useRouter();const [identity,setIdentity]=useState<StaffIdentity|null>(null);const [error,setError]=useState('');
 useEffect(()=>{let stop=false;void bookingFetch<StaffIdentity>('staff/auth/session').then(data=>{if(!stop)setIdentity(data);}).catch(e=>{if(e instanceof BookingError&&e.status===401)router.replace('/'+locale+'/staff/login');else if(!stop)setError(b.error);});return()=>{stop=true;};},[locale,router,b.error]);
 return <section className="container staff-workspace operations-workspace">
  <header className="operations-heading"><p className="eyebrow">ALMORAD AMC</p><h1>{view==='calendar'?c.title:view==='analytics'?c.analytics:c.settings}</h1></header>
  <div className="operations-layout">
   <OperationsNavigation locale={locale} role={identity?.staff.role} view={view}/>
   <div className="operations-content">
    {!identity?<p role={error?'alert':'status'}>{error||b.loading}</p>:(view==='analytics'&&!can(identity.staff.role,'analytics:read'))||(view==='settings'&&!can(identity.staff.role,'settings:write'))?<p role="alert">{c.permission}</p>:children(identity)}
   </div>
  </div>
 </section>;
}

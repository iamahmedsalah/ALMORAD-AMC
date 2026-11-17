'use client';
import Image from 'next/image';
import {staffCopy} from '@/features/staff/copy';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {useRouter} from 'next/navigation';
import {can,type Locale,type StaffRole} from '@amc/shared';
import {bookingCopy} from './copy';
import {deskCopy} from './desk-copy';
import {BookingError,bookingFetch} from './helpers';
import {SolarIcon} from '@/components/ui/solar-icon';
import {MenuToggle} from '@/components/ui/animated-icon';
import {Dialog,DialogContent} from '@/components/ui/dialog';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Tooltip} from '@/components/ui/tooltip';
import {BookingLoading} from './loading-state';
import {Controls} from '@/components/layout/controls';

export type StaffIdentity={
 staff:{id:string;email:string;firstName?:string;lastName?:string;role:StaffRole;googleEmail?:string|null;googleLinkedAt?:string|null;hasPassword?:boolean};
 csrfToken:string;
};

type NavView='calendar'|'inquiries'|'analytics'|'settings'|'account';

function subscribeSidebar(callback:()=>void){
 window.addEventListener('storage',callback);
 window.addEventListener('amc-sidebar-change',callback);
 return()=>{window.removeEventListener('storage',callback);window.removeEventListener('amc-sidebar-change',callback);};
}
function readSidebarCollapsed(){try{return localStorage.getItem('amc-staff-sidebar')==='1';}catch{return false;}}
const serverSidebarCollapsed=()=>false;

export function OperationsNavigation({locale,role,view,collapsed=false,inquiriesCount,onNavigate}:{locale:Locale;role?:StaffRole;view:NavView;collapsed?:boolean;inquiriesCount?:number|null;onNavigate?:()=>void}) {
 const c=deskCopy(locale);
 const groups:{section:string;items:{href:string;key:NavView;icon:Parameters<typeof SolarIcon>[0]['name'];label:string;badge?:number|null;visible:boolean}[]}[]=[
  {
   section:locale==='ar'?'العمليات':'Operations',
   items:[
    {href:'/'+locale+'/staff/calendar',key:'calendar',icon:'calendar-linear',label:c.agenda,visible:true},
    {href:'/'+locale+'/staff/inquiries',key:'inquiries',icon:'chat-round-line-linear',label:locale==='ar'?'الاستفسارات':'Contact inquiries',badge:inquiriesCount,visible:Boolean(role&&can(role,'inquiries:read'))},
    {href:'/'+locale+'/staff/analytics',key:'analytics',icon:'chart-2-linear',label:c.analytics,visible:Boolean(role&&can(role,'analytics:read'))},
   ]
  },
  {
   section:locale==='ar'?'النظام':'System',
   items:[
    {href:'/'+locale+'/staff/settings',key:'settings',icon:'widget-2-linear',label:c.settings,visible:Boolean(role&&can(role,'settings:write'))},
    {href:'/'+locale+'/staff',key:'account',icon:'user-linear',label:c.account,visible:true},
   ]
  }
 ];

 return (
  <nav className="staff-tabs operations-nav" aria-label={c.title} data-collapsed={collapsed||undefined}>
   {groups.map(group=>{
    const visibleItems=group.items.filter(item=>item.visible);
    if(!visibleItems.length)return null;
    return (
     <div key={group.section} className="operations-nav-group">
      {!collapsed&&<span className="operations-nav-section">{group.section}</span>}
      {visibleItems.map(item=>{
       const link=(
        <a key={item.key} href={item.href} aria-current={view===item.key?'page':undefined} onClick={onNavigate}>
         <SolarIcon name={item.icon}/>
         <span className="operations-nav-label">{item.label}</span>
         {typeof item.badge==='number'&&item.badge>0&&!collapsed&&<span className="operations-nav-badge">{item.badge}</span>}
        </a>
       );
       return collapsed?<Tooltip key={item.key} label={item.label} locale={locale}>{link}</Tooltip>:link;
      })}
     </div>
    );
   })}
  </nav>
 );
}

function HeaderUserMenu({identity,locale}:{identity:StaffIdentity;locale:Locale}){
 const [busy,setBusy]=useState(false);
 const name=[identity.staff.firstName,identity.staff.lastName].filter(Boolean).join(' ')||identity.staff.email;
 const hasName=Boolean(identity.staff.firstName||identity.staff.lastName);
 const initials=name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'A';
 const roleLabel=staffCopy(locale).roleNames[identity.staff.role];

 async function logout(){
  if(busy)return;
  setBusy(true);
  try{
   await fetch('/api/staff/auth/logout',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':identity.csrfToken},body:'{}',cache:'no-store'});
   window.location.replace('/'+locale+'/staff/login');
  }catch{setBusy(false);}
 }

 return (
  <Popover>
   <PopoverTrigger asChild>
    <button type="button" className="topbar-user-trigger" aria-label={name} title={name}>
     <span className="staff-avatar dash-topbar-avatar" aria-hidden="true">{hasName?initials:<SolarIcon name="user-linear"/>}</span>
     <span className="topbar-user-info">
      <strong>{name}</strong>
      <small>{roleLabel}</small>
     </span>
     <SolarIcon name="alt-arrow-down-linear" className="sidebar-user-chevron"/>
    </button>
   </PopoverTrigger>
   <PopoverContent locale={locale} className="sidebar-user-popover">
    <div className="sidebar-user-popover-head">
     <strong>{hasName?name:roleLabel}</strong>
     <small dir="ltr">{identity.staff.email}</small>
    </div>
    <a className="button button-secondary" href={'/'+locale+'/staff'}>
     <SolarIcon name="user-linear"/>{locale==='ar'?'الحساب والأمان':'Account & security'}
    </a>
    <button type="button" className="button button-secondary" disabled={busy} aria-busy={busy} onClick={()=>void logout()}>
     <SolarIcon name="arrow-right-linear" className="directional-icon"/>{locale==='ar'?'تسجيل الخروج':'Sign out'}
    </button>
   </PopoverContent>
  </Popover>
 );
}

export function StaffWorkspaceShell({locale,view,children}:{locale:Locale;view:NavView;children:(identity:StaffIdentity,setIdentity:React.Dispatch<React.SetStateAction<StaffIdentity|null>>)=>React.ReactNode}){
 const c=deskCopy(locale),b=bookingCopy(locale);
 const router=useRouter();
 const [identity,setIdentity]=useState<StaffIdentity|null>(null);
 const [error,setError]=useState('');
 const [inquiriesCount,setInquiriesCount]=useState<number|null>(null);
 const [topSearch,setTopSearch]=useState('');
 const collapsed=useSyncExternalStore(subscribeSidebar,readSidebarCollapsed,serverSidebarCollapsed);
 const [mobileOpen,setMobileOpen]=useState(false);

 useEffect(()=>{
  let stop=false;
  void bookingFetch<StaffIdentity>('staff/auth/session')
   .then(data=>{
    if(stop)return;
    setIdentity(data);
    if(can(data.staff.role,'inquiries:read')){
     void bookingFetch<{total:number}>('staff/inquiries?page=0').then(res=>{if(!stop)setInquiriesCount(res.total);}).catch(()=>{});
    }
   })
   .catch(e=>{if(e instanceof BookingError&&e.status===401)router.replace('/'+locale+'/staff/login');else if(!stop)setError(b.error);});
  return()=>{stop=true;};
 },[locale,router,b.error]);

 function toggleDesktopSidebar(){
  const next=!collapsed;
  try{localStorage.setItem('amc-staff-sidebar',next?'1':'0');}catch{}
  window.dispatchEvent(new Event('amc-sidebar-change'));
 }

 const pageTitle=view==='inquiries'?(locale==='ar'?'الاستفسارات':'Contact inquiries'):view==='calendar'?c.title:view==='analytics'?c.analytics:view==='settings'?c.settings:c.account;
 const collapseLabel=collapsed?(locale==='ar'?'توسيع القائمة الجانبية':'Expand sidebar'):(locale==='ar'?'طي القائمة الجانبية':'Collapse sidebar');
 const menuLabel=mobileOpen?(locale==='ar'?'إغلاق القائمة':'Close menu'):(locale==='ar'?'فتح القائمة':'Open menu');

 const permissionDenied=identity&&(
  (view==='inquiries'&&!can(identity.staff.role,'inquiries:read'))||
  (view==='analytics'&&!can(identity.staff.role,'analytics:read'))||
  (view==='settings'&&!can(identity.staff.role,'settings:write'))
 );

 return (
  <div className="staff-workspace operations-workspace dash-shell" data-sidebar-collapsed={collapsed||undefined}>
   <aside className="operations-sidebar" aria-label={c.title}>
    <div className="operations-sidebar-head">
     {!collapsed&&<span className="operations-sidebar-brand"><Image className="operations-logo-light" src="/brand/amc-mark.svg" alt="" width={32} height={20} unoptimized/><Image className="operations-logo-dark" src="/brand/amc-mark-on-dark.svg" alt="" width={32} height={20} unoptimized/><span>ALMORAD AMC</span></span>}
     <Tooltip label={collapseLabel} locale={locale}>
      <button
       type="button"
       aria-label={collapseLabel}
       aria-expanded={!collapsed}
       data-collapsed={collapsed||undefined}
       className="button button-secondary operations-collapse-btn"
       onClick={toggleDesktopSidebar}
      >
       <SolarIcon name="alt-arrow-left-linear" className="directional-icon"/>
      </button>
     </Tooltip>
    </div>
    <OperationsNavigation locale={locale} role={identity?.staff.role} view={view} collapsed={collapsed} inquiriesCount={inquiriesCount}/>
    <div className="operations-sidebar-controls"><Controls/></div>
   </aside>

   <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
    <DialogContent locale={locale} title={c.title} className="operations-mobile-drawer">
     <div id="staff-mobile-sidebar" className="operations-mobile-drawer-body">
      <OperationsNavigation locale={locale} role={identity?.staff.role} view={view} inquiriesCount={inquiriesCount} onNavigate={()=>setMobileOpen(false)}/>
      <div className="operations-sidebar-controls"><Controls/></div>
     </div>
    </DialogContent>
   </Dialog>

   <div className="dash-main-column">
    <header className="dash-topbar">
     <div className="dash-topbar-left">
      <MenuToggle open={mobileOpen} label={menuLabel} controls="staff-mobile-sidebar" onClick={()=>setMobileOpen(v=>!v)} className="button button-secondary operations-mobile-trigger"/>
      <h1 className="dash-topbar-title">{pageTitle}</h1>
     </div>
     <div className="dash-topbar-right">
      <form className="dash-topbar-search" onSubmit={e=>{e.preventDefault();const q=topSearch.trim();router.push(`/${locale}/staff/${view==='inquiries'?'inquiries':'calendar'}${q?'?search='+encodeURIComponent(q):''}`);}}>
       <SolarIcon name="filter-linear"/>
       <input type="search" value={topSearch} onChange={e=>setTopSearch(e.target.value)} placeholder={locale==='ar'?'بحث سريع…':'Quick search…'} aria-label={c.search}/>
      </form>
      <Tooltip label={locale==='ar'?'الاستفسارات':'Contact inquiries'} locale={locale}>
       <a href={'/'+locale+'/staff/inquiries'} className="button button-secondary dash-topbar-icon" aria-label={locale==='ar'?'الاستفسارات':'Contact inquiries'}>
        <SolarIcon name="chat-round-line-linear"/>
        {typeof inquiriesCount==='number'&&inquiriesCount>0&&<span className="dash-topbar-dot" aria-hidden="true"/>}
       </a>
      </Tooltip>
      {identity&&<HeaderUserMenu identity={identity} locale={locale}/>}
     </div>
    </header>

    <main className="operations-content dash-page-enter" id="staff-main">
     {!identity?(error?<div className="staff-panel" role="alert"><p>{error}</p><div className="booking-actions"><button type="button" className="button button-primary" onClick={()=>window.location.reload()}>{locale==='ar'?'إعادة المحاولة':'Retry'}</button><a href={'/'+locale+'/staff/login'} className="button button-secondary">{locale==='ar'?'تسجيل الدخول':'Sign in'}</a></div></div>:<BookingLoading label={b.loading}/>):permissionDenied?<p role="alert">{c.permission}</p>:children(identity,setIdentity)}
    </main>
   </div>
  </div>
 );
}

export function StaffBookingShell({locale,view,children}:{locale:Locale;view:'calendar'|'inquiries'|'analytics'|'settings';children:(identity:StaffIdentity)=>React.ReactNode}){
 return <StaffWorkspaceShell locale={locale} view={view}>{identity=>children(identity)}</StaffWorkspaceShell>;
}

'use client';
import {authCopy} from './auth-copy';
import {GoogleSignInButton} from './google-signin-button';
import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {can,type Locale} from '@amc/shared';
import {StaffWorkspaceShell,type StaffIdentity} from '@/features/booking/staff-shell';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {SolarIcon} from '@/components/ui/solar-icon';
import {PageHeader} from '@/components/ui/staff-primitives';
import {staffCopy} from './copy';
import {StaffAccountsPanel} from './accounts-panel';

type Session={id:string;createdAt:string;expiresAt:string;current:boolean};
type Audit={items:{id:string;action:string;createdAt:string;actor:{email:string}|null}[];total:number;page:number};

export function StaffPortal({locale}:{locale:Locale}){
 return (
  <StaffWorkspaceShell locale={locale} view="account">
   {(identity,setIdentity)=><AccountSettingsContent locale={locale} identity={identity} setIdentity={setIdentity}/>}
  </StaffWorkspaceShell>
 );
}

function AccountSettingsContent({locale,identity,setIdentity}:{locale:Locale;identity:StaffIdentity;setIdentity:React.Dispatch<React.SetStateAction<StaffIdentity|null>>}){
 const a=authCopy(locale);
 const c=staffCopy(locale);
 const router=useRouter();
 const [tab,setTab]=useState('account');
 const [sessions,setSessions]=useState<Session[]>([]);
 const [overview,setOverview]=useState<{activeStaff:number;activeSessions:number;failedSignIns:number}|null>(null);
 const [audit,setAudit]=useState<Audit|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);

 const leave=useCallback(()=>{setIdentity(null);router.replace(`/${locale}/staff/login`);},[locale,router,setIdentity]);

 useEffect(()=>{
  let cancelled=false;
  async function loadSecurity(){
   try{
    const own=await fetch('/api/staff/security/sessions',{cache:'no-store'});
    if(own.status===401){leave();return;}
    if(!own.ok)throw new Error();
    const rows:Session[]=await own.json();
    if(!cancelled)setSessions(rows);
    if(can(identity.staff.role,'settings:write')){
     const [summary,events]=await Promise.all([
      fetch('/api/staff/security/overview',{cache:'no-store'}),
      fetch('/api/staff/security/audit',{cache:'no-store'})
     ]);
     if(!summary.ok||!events.ok)throw new Error();
     const totals=await summary.json();
     const logs:Audit=await events.json();
     if(!cancelled){setOverview(totals);setAudit(logs);}
    }
   }catch{if(!cancelled)setError(c.unavailable);}
  }
  void loadSecurity();
  return()=>{cancelled=true;};
 },[identity.staff.role,leave,c.unavailable]);

 async function mutate(path:string,body:unknown){
  setBusy(true);setError('');
  try{
   const response=await fetch(`/api/staff/${path}`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':identity.csrfToken},body:JSON.stringify(body),cache:'no-store'});
   if(response.status===401){leave();return;}
   if(!response.ok)throw new Error();
   const result=await response.json();
   if(result.signedOut)leave();
   else{
    const rows=await fetch('/api/staff/security/sessions',{cache:'no-store'});
    if(!rows.ok)throw new Error();
    setSessions(await rows.json());
   }
  }catch{setError(c.error);}
  finally{setBusy(false);}
 }

 async function googleAccount(action:'link'|'unlink',credential?:string){
  if(busy)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/staff/auth/google/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':identity.csrfToken},body:JSON.stringify(credential?{credential}:{}),cache:'no-store'});
   if(response.status===401){leave();return;}
   if(!response.ok)throw new Error();
   const data=await response.json();
   setIdentity(previous=>previous?{...previous,staff:data.staff}:previous);
  }catch{setError(a.googleError);}
  finally{setBusy(false);}
 }

 async function changePage(page:number){
  setBusy(true);setError('');
  try{
   const response=await fetch(`/api/staff/security/audit?page=${page}`,{cache:'no-store'});
   if(response.status===401){leave();return;}
   if(!response.ok)throw new Error();
   setAudit(await response.json());
  }catch{setError(c.error);}
  finally{setBusy(false);}
 }

 const date=(value:string)=>new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
 const accountTabLabel=locale==='ar'?'الحساب':'Account';
 const securityTabLabel=locale==='ar'?'الأمان':'Security';

 return (
  <>
   <PageHeader icon="user-linear" title={c.title} description={identity.staff.email}/>
   {error&&<p role="alert" className="staff-alert">{error}</p>}
   <Tabs value={tab} onValueChange={setTab} dir={locale==='ar'?'rtl':'ltr'}>
    <TabsList className="desk-detail-tabs portal-tabs" aria-label={c.title}>
     <TabsTrigger value="account"><SolarIcon name="user-linear"/>{accountTabLabel}</TabsTrigger>
     <TabsTrigger value="security"><SolarIcon name="lock-keyhole-linear"/>{securityTabLabel}</TabsTrigger>
    </TabsList>

    <TabsContent value="account">
     <section className="staff-panel">
      <h2>{c.welcome}</h2>
      <p dir="ltr">{identity.staff.email}</p>
      <p>{c.role}: {c.roleNames[identity.staff.role]}</p>
     </section>

     <section className="staff-panel">
      <h2>{a.google}</h2>
      {identity.staff.googleEmail?(
       <>
        <p dir="ltr">{identity.staff.googleEmail}</p>
        <button type="button" className="button button-secondary" disabled={busy||!identity.staff.hasPassword} onClick={()=>void googleAccount('unlink')}>{a.unlink}</button>
        {!identity.staff.hasPassword&&<p>{a.noPassword}</p>}
       </>
      ):process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?(
       <GoogleSignInButton locale={locale} link disabled={busy} onCredential={credential=>googleAccount('link',credential)}/>
      ):(
       <p role="status">{locale==='ar'?'تسجيل الدخول بحساب Google غير متاح حاليًا.':'Google sign-in is currently unavailable.'}</p>
      )}
     </section>

     {can(identity.staff.role,'staff:manage')&&<StaffAccountsPanel locale={locale} csrfToken={identity.csrfToken}/>}
    </TabsContent>

    <TabsContent value="security">
     <section className="staff-panel">
      <h2>{c.change}</h2>
      <form className="staff-form" onSubmit={event=>{event.preventDefault();const form=event.currentTarget;const fields=new FormData(form);void mutate('auth/password',{currentPassword:fields.get('currentPassword'),newPassword:fields.get('newPassword')});form.reset();}}>
       <input className="sr-only" name="username" autoComplete="username" value={identity.staff.email} readOnly tabIndex={-1} aria-label={c.email}/>
       <label>{c.currentPassword}<input type="password" name="currentPassword" autoComplete="current-password" required maxLength={128} dir="ltr"/></label>
       <label>{c.newPassword}<input type="password" name="newPassword" autoComplete="new-password" required minLength={12} maxLength={128} dir="ltr"/></label>
       <button className="button button-primary" disabled={busy} type="submit">{busy?c.pending:c.save}</button>
      </form>
     </section>

     {overview&&(
      <section className="staff-panel">
       <h2>{c.security}</h2>
       <dl className="staff-metrics">
        {[[c.activeStaff,overview.activeStaff],[c.activeSessions,overview.activeSessions],[c.failures,overview.failedSignIns]].map(([label,value])=>(
         <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
       </dl>
      </section>
     )}

     <section className="staff-panel">
      <h2>{c.sessions}</h2>
      <div className="staff-table-wrap" tabIndex={0} role="region" aria-label={locale==='ar'?'جدول سجلات الفريق':'Staff records table'}>
       <table>
        <thead><tr><th>{c.created}</th><th>{c.expires}</th><th>{c.action}</th></tr></thead>
        <tbody>
         {sessions.map(session=>(
          <tr key={session.id}>
           <td>{date(session.createdAt)}{session.current&&<small> · {c.current}</small>}</td>
           <td>{date(session.expiresAt)}</td>
           <td><button className="button button-secondary" disabled={busy} onClick={()=>void mutate('security/revoke',{id:session.id})}>{c.revoke}</button></td>
          </tr>
         ))}
        </tbody>
       </table>
       {!sessions.length&&<p>{c.empty}</p>}
      </div>
     </section>

     {audit&&(
      <section className="staff-panel">
       <h2>{c.audit}</h2>
       <div className="staff-table-wrap" tabIndex={0} role="region" aria-label={locale==='ar'?'جدول سجلات الفريق':'Staff records table'}>
        <table>
         <thead><tr><th>{c.time}</th><th>{c.action}</th><th>{c.actor}</th></tr></thead>
         <tbody>
          {audit.items.map(event=>(
           <tr key={event.id}>
            <td>{date(event.createdAt)}</td>
            <td>{c.events[event.action as keyof typeof c.events]||event.action}</td>
            <td dir="ltr">{event.actor?.email||c.system}</td>
           </tr>
          ))}
         </tbody>
        </table>
        {!audit.items.length&&<p>{c.empty}</p>}
       </div>
       <div className="staff-pagination">
        <button className="button button-secondary" disabled={busy||audit.page===0} onClick={()=>void changePage(audit.page-1)}>{c.previous}</button>
        <span>{audit.page+1}</span>
        <button className="button button-secondary" disabled={busy||(audit.page+1)*25>=audit.total} onClick={()=>void changePage(audit.page+1)}>{c.next}</button>
       </div>
      </section>
     )}
    </TabsContent>
   </Tabs>
  </>
 );
}

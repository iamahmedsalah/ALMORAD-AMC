'use client';
import {useState,useSyncExternalStore} from 'react';
import {useRouter} from 'next/navigation';
import type {Locale} from '@amc/shared';
import {staffCopy} from './copy';
import {SolarIcon} from '@/components/ui/solar-icon';
const subscribe=()=>()=>{};
const ready=()=>true;
const notReady=()=>false;
export function StaffLogin({locale}:{locale:Locale}){
 const hydrated=useSyncExternalStore(subscribe,ready,notReady);
 const c=staffCopy(locale);const router=useRouter();const [pending,setPending]=useState(false);const [error,setError]=useState('');
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;setError('');setPending(true);const data=new FormData(form);try{const response=await fetch('/api/staff/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:data.get('email'),password:data.get('password')}),cache:'no-store'});if(response.ok){form.reset();router.replace(`/${locale}/staff`);}else setError(response.status===503?c.unavailable:c.failed);}catch{setError(c.unavailable);}finally{setPending(false);}}
 return <section className="staff-login container"><div className="staff-login-emblem"><SolarIcon name="users-group-rounded-linear"/></div><p className="eyebrow">ALMORAD AMC</p><h1>{c.signIn}</h1><p>{c.intro}</p><form method="post" action="/api/staff/auth/login" onSubmit={submit} className="staff-form"><label>{c.email}<input disabled={!hydrated||pending} name="email" type="email" autoComplete="username" dir="ltr" required maxLength={254}/></label><label>{c.password}<input disabled={!hydrated||pending} name="password" type="password" autoComplete="current-password" dir="ltr" required maxLength={128}/></label>{error&&<p role="alert">{error}</p>}<button className="button button-primary" disabled={!hydrated||pending} type="submit">{pending?c.pending:c.submit}</button></form><noscript>{locale==='ar'?'يلزم تفعيل جافاسكريبت لتسجيل الدخول الآمن.':'JavaScript is required for secure sign in.'}</noscript></section>;
}

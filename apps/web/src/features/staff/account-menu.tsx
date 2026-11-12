'use client';
import {useState} from 'react';import type {Locale} from '@amc/shared';import {SolarIcon} from '@/components/ui/solar-icon';
export type MenuIdentity={staff:{email:string;firstName?:string;lastName?:string;role:string};csrfToken:string};
export function StaffAccountMenu({identity,locale}:{identity:MenuIdentity;locale:Locale}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState(false);
 const name=[identity.staff.firstName,identity.staff.lastName].filter(Boolean).join(' ')||identity.staff.email;
 async function logout(){if(busy)return;setBusy(true);setError(false);try{const response=await fetch('/api/staff/auth/logout',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':identity.csrfToken},body:'{}',cache:'no-store'});if(!response.ok&&response.status!==401)throw Error();window.location.replace('/'+locale+'/staff/login');}catch{setError(true);setBusy(false);}}
 return <div className="staff-identity"><span className="staff-avatar" aria-hidden="true">{name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</span><div className="staff-identity-name"><strong>{name}</strong><small>{identity.staff.role}</small></div><a className="button button-secondary" href={'/'+locale+'/staff'}><SolarIcon name="user-linear"/>{locale==='ar'?'\u0627\u0644\u062d\u0633\u0627\u0628':'Account'}</a><button className="button button-secondary" onClick={()=>void logout()} disabled={busy} aria-busy={busy}><SolarIcon name="arrow-right-linear"/>{locale==='ar'?'\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c':'Sign out'}</button>{error&&<p role="alert">{locale==='ar'?'\u062a\u0639\u0630\u0631 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c':'Could not sign out. Try again.'}</p>}</div>;
}

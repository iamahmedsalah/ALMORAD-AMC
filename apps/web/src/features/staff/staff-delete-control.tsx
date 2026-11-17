'use client';
import {useState} from 'react';
import type {Locale} from '@amc/shared';
import {Dialog,DialogContent} from '@/components/ui/dialog';
import {SolarIcon} from '@/components/ui/solar-icon';

export function StaffDeleteControl({id,email,locale,busy,onDelete}:{id:string;email:string;locale:Locale;busy:boolean;onDelete:(body:{id:string;reason:string},done:()=>void)=>Promise<void>}){
 const [open,setOpen]=useState(false),[reason,setReason]=useState('');const ar=locale==='ar';
 return <><button className="button button-secondary" type="button" disabled={busy} onClick={()=>setOpen(true)}><SolarIcon name="trash-bin-trash-linear"/>{ar?'حذف الموظف':'Delete staff account'}</button>
  <Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><DialogContent locale={locale} title={ar?'حذف حساب الموظف؟':'Delete staff account?'}>
   <p><bdi>{email}</bdi></p><p>{ar?'سيتم إلغاء الوصول والجلسات وإخفاء الحساب من القائمة مع الاحتفاظ بسجل المواعيد والتدقيق. لا يمكنك حذف حسابك أو آخر مسؤول نشط.':'Access and sessions will be revoked and the account removed from this list. Meeting and audit history are retained. You cannot delete yourself or the last active admin.'}</p>
   <form className="staff-form" onSubmit={event=>{event.preventDefault();event.stopPropagation();if(!busy)void onDelete({id,reason},()=>{setOpen(false);setReason('');});}}>
    <label>{ar?'سبب الحذف':'Deletion reason'}<textarea value={reason} minLength={3} maxLength={1000} required onChange={event=>setReason(event.target.value)}/></label>
    <div className="booking-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={()=>setOpen(false)}>{ar?'تراجع':'Cancel'}</button><button type="submit" className="button button-primary" disabled={busy} aria-busy={busy}>{ar?'تأكيد الحذف':'Confirm deletion'}</button></div>
   </form>
  </DialogContent></Dialog>
 </>;
}

'use client';
import {useState} from 'react';
import type {Locale} from '@amc/shared';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {SolarIcon} from '@/components/ui/solar-icon';
import {Switch} from '@/components/ui/switch';
export type AssigneeOption={id:string;email:string;firstName?:string;lastName?:string};
export function AssigneePicker({locale,options,value,defaultValue=[],onChange,form,disabled=false}:{locale:Locale;options:AssigneeOption[];value?:string[];defaultValue?:string[];onChange?:(ids:string[])=>void;form?:string;disabled?:boolean}){
 const [local,setLocal]=useState(defaultValue);const selected=value??local;const label=locale==='ar'?'مديرو الاجتماع':'Meeting managers';
 const available:AssigneeOption[]=[...options,...selected.filter(id=>!options.some(option=>option.id===id)).map(id=>({id,email:locale==='ar'?'مدير غير متاح — أزل التعيين':'Unavailable manager — remove assignment'}))];
 return <div className="assignee-picker"><span>{label}</span>{selected.map(id=><input key={id} type="hidden" name="assigneeIds" value={id} form={form}/>)}<Popover><PopoverTrigger asChild><button className="button button-secondary" type="button" disabled={disabled} aria-label={label}><SolarIcon name="users-group-rounded-linear"/>{selected.length?`${selected.length} · ${label}`:locale==='ar'?'اختيار المديرين':'Choose managers'}<SolarIcon name="alt-arrow-down-linear"/></button></PopoverTrigger><PopoverContent locale={locale} aria-label={label}><p>{locale==='ar'?'يمكن اختيار أكثر من مدير.':'You can choose more than one manager.'}</p>{available.map(staff=><label className="booking-check" key={staff.id}><Switch checked={selected.includes(staff.id)} disabled={disabled} onCheckedChange={checked=>{const next=checked?[...selected,staff.id]:selected.filter(id=>id!==staff.id);setLocal(next);onChange?.(next);}}/><span>{[staff.firstName,staff.lastName].filter(Boolean).join(' ')||staff.email}</span></label>)}</PopoverContent></Popover></div>;
}

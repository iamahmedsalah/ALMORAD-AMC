'use client';
import {useEffect,useState,useId} from 'react';
import type {Locale,SlotResponse} from '@amc/shared';
import {BookingLoading} from './loading-state';
import {DatePicker} from '@/components/ui/date-picker';
import {bookingCopy} from './copy';
import {bookingFetch,businessDate} from './helpers';
export function SlotPicker({locale,service,format,timezone,durationMinutes,value,onChange,refresh=0}:{locale:Locale;service:string;format:string;timezone:string;durationMinutes:number;value:string;onChange:(value:string)=>void;refresh?:number}){
 const group=useId();const c=bookingCopy(locale);const [date,setDate]=useState(()=>businessDate(timezone));const [data,setData]=useState<SlotResponse|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{let stopped=false;async function load(){setLoading(true);setError('');try{const result=await bookingFetch<SlotResponse>('booking/slots?'+new URLSearchParams({date,service,format,duration:String(durationMinutes)}));if(!stopped)setData(result);}catch{if(!stopped){setError(c.error);setData(null);}}finally{if(!stopped)setLoading(false);}}void load();return()=>{stopped=true;};},[date,service,format,durationMinutes,refresh,c.error]);
 return <div className="slot-picker"><DatePicker label={c.date} locale={locale} value={date} min={businessDate(timezone)} onChange={value=>{setDate(value);onChange('');}}/><p>{c.timezone} <bdi>{timezone}</bdi></p>{loading?<BookingLoading label={c.loading}/>:error?<p role="alert">{error}</p>:!data?.slots.length?<p role="status">{c.none}</p>:<fieldset><legend>{c.time}</legend><div className="booking-slots">{data.slots.map(slot=><label key={slot.startsAt} className={value===slot.startsAt?'slot selected':'slot'}><input type="radio" name={group} checked={value===slot.startsAt} onChange={()=>onChange(slot.startsAt)}/><span>{new Intl.DateTimeFormat(locale,{timeZone:timezone,hour:'2-digit',minute:'2-digit'}).format(new Date(slot.startsAt))}</span></label>)}</div></fieldset>}</div>;
}

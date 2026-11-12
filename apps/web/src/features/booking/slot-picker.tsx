'use client';
import {useState,useId} from 'react';
import {useQuery} from '@tanstack/react-query';
import type {Locale,SlotResponse} from '@amc/shared';
import {BookingLoading} from './loading-state';
import {DatePicker} from '@/components/ui/date-picker';
import {bookingCopy} from './copy';
import {bookingFetch,businessDate} from './helpers';
export function SlotPicker({locale,service,format,timezone,durationMinutes,value,onChange,refresh=0}:{locale:Locale;service:string;format:string;timezone:string;durationMinutes:number;value:string;onChange:(value:string)=>void;refresh?:number}){
 const group=useId();const c=bookingCopy(locale);const [date,setDate]=useState(()=>businessDate(timezone));const {data,isFetching:loading,isError,refetch} = useQuery({queryKey:['booking-slots',date,service,format,durationMinutes,refresh],queryFn:()=>bookingFetch<SlotResponse>('booking/slots?'+new URLSearchParams({date,service,format,duration:String(durationMinutes)})),staleTime:0});
 const error=isError?c.error:'';
 return <div className="slot-picker"><DatePicker label={c.date} locale={locale} value={date} min={businessDate(timezone)} onChange={value=>{setDate(value);onChange('');}}/><p>{c.timezone} <bdi>{timezone}</bdi></p>{loading?<BookingLoading label={c.loading}/>:error?<div><p role="alert">{error}</p><button type="button" className="button button-secondary" onClick={()=>void refetch()}>{locale==='ar'?'\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629':'Try again'}</button></div>:!data?.slots.length?<p role="status">{c.none}</p>:<fieldset><legend>{c.time}</legend><div className="booking-slots">{data.slots.map(slot=><label key={slot.startsAt} className={value===slot.startsAt?'slot selected':'slot'}><input type="radio" name={group} checked={value===slot.startsAt} onChange={()=>onChange(slot.startsAt)}/><span>{new Intl.DateTimeFormat(locale,{timeZone:timezone,hour:'2-digit',minute:'2-digit'}).format(new Date(slot.startsAt))}</span></label>)}</div></fieldset>}</div>;
}

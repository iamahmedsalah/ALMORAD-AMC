import {Temporal} from '@js-temporal/polyfill';
import type {ScheduleInput} from '@amc/shared';
export function localDate(instant:Date,timezone:string){return Temporal.Instant.from(instant.toISOString()).toZonedDateTimeISO(timezone).toPlainDate().toString();}
export function dayBounds(date:string,timezone:string){const d=Temporal.PlainDate.from(date);return {from:new Date(d.toZonedDateTime(timezone).toInstant().toString()),to:new Date(d.add({days:1}).toZonedDateTime(timezone).toInstant().toString())};}
function wall(date:string,time:string,timezone:string){return Temporal.ZonedDateTime.from(date+'T'+time+'['+timezone+']',{disambiguation:'reject'}).toInstant();}
export function calendarSlots(settings:ScheduleInput,date:string,now=new Date(),durationMinutes=settings.durationMinutes){
 const day=Temporal.PlainDate.from(date);const today=Temporal.PlainDate.from(localDate(now,settings.timezone));
 if(Temporal.PlainDate.compare(day,today)<0||Temporal.PlainDate.compare(day,today.add({days:settings.lookaheadDays}))>0||settings.blackoutDates.includes(date))return [];
 const slots:{startsAt:Date;endsAt:Date;blockedStartsAt:Date;blockedEndsAt:Date}[]=[];
 for(const hours of settings.weeklyHours.filter(h=>h.day===day.dayOfWeek)){
  let start:Temporal.Instant,end:Temporal.Instant;try{start=wall(date,hours.open,settings.timezone);end=wall(date,hours.close,settings.timezone);}catch{continue;}
  for(let current=start;Temporal.Instant.compare(current,end)<0;current=current.add({minutes:settings.stepMinutes})){
   const finish=current.add({minutes:durationMinutes});const blockedStart=current.subtract({minutes:settings.bufferBeforeMinutes});const blockedEnd=finish.add({minutes:settings.bufferAfterMinutes});
   if(current.epochMilliseconds<now.getTime()+settings.leadMinutes*60000||Temporal.Instant.compare(blockedStart,start)<0||Temporal.Instant.compare(blockedEnd,end)>0)continue;
   slots.push({startsAt:new Date(current.toString()),endsAt:new Date(finish.toString()),blockedStartsAt:new Date(blockedStart.toString()),blockedEndsAt:new Date(blockedEnd.toString())});
  }
 }
 return slots.filter((v,i,a)=>a.findIndex(x=>x.startsAt.getTime()===v.startsAt.getTime())===i);
}
export function overlaps(a:{blockedStartsAt:Date;blockedEndsAt:Date},b:{blockedStartsAt:Date;blockedEndsAt:Date}){return a.blockedStartsAt<b.blockedEndsAt&&a.blockedEndsAt>b.blockedStartsAt;}
export function analyticsBounds(from:string,to:string,timezone:string){const first=Temporal.PlainDate.from(from),last=Temporal.PlainDate.from(to);if(Temporal.PlainDate.compare(first,last)>0||first.until(last).days>366)throw new Error('Invalid date range');return {gte:dayBounds(from,timezone).from,lt:dayBounds(to,timezone).to};}

'use client';
import {useEffect,useMemo,useRef,type ComponentProps} from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import {activeChanges,services,type BookingList,type BookingRow,type Locale} from '@amc/shared';
import {SolarIcon} from '@/components/ui/solar-icon';
import type {AgendaViewMode} from './agenda';

type FcProps=ComponentProps<typeof FullCalendar>;
type DatesSetArg=Parameters<NonNullable<FcProps['datesSet']>>[0];
type EventClickArg=Parameters<NonNullable<FcProps['eventClick']>>[0];
type EventDropArg=Parameters<NonNullable<FcProps['eventDrop']>>[0];
type EventContentArg=Parameters<Extract<FcProps['eventContent'],(...args:never[])=>unknown>>[0];

const FC_VIEW_MAP:Record<AgendaViewMode,string>={
 day:'timeGridDay',
 week:'timeGridWeek',
 month:'dayGridMonth',
};

function toFullCalendarEvents(items:BookingRow[]){
 return items.map(row=>({
  id:row.id,
  title:row.clientName,
  start:row.startsAt,
  end:row.endsAt,
  editable:['PENDING','CONFIRMED'].includes(row.status),
  extendedProps:{booking:row},
 }));
}

export function FullCalendarAgenda({
 list,
 locale,
 mode,
 currentDate,
 editable,
 onSelect,
 onRangeChange,
 onRescheduleDrop,
}:{
 list:BookingList;
 locale:Locale;
 mode:AgendaViewMode;
 currentDate:string;
 editable:boolean;
 onSelect:(id:string)=>void;
 onRangeChange:(from:string,to:string)=>void;
 onRescheduleDrop:(booking:BookingRow,newStartIso:string)=>Promise<boolean>;
}){
 const calendarRef=useRef<FullCalendar>(null);
 const lastRange=useRef('');
 const events=useMemo(()=>toFullCalendarEvents(list.items),[list.items]);
 const fcView=FC_VIEW_MAP[mode];

 useEffect(()=>{
  const api=calendarRef.current?.getApi();
  if(!api)return;
  if(api.view.type!==fcView)api.changeView(fcView);
 },[fcView]);

 useEffect(()=>{
  const api=calendarRef.current?.getApi();
  if(!api||!currentDate)return;
  const current=api.getDate().toISOString().slice(0,10);
  if(current!==currentDate)api.gotoDate(currentDate);
 },[currentDate]);

 function handleDatesSet(arg:DatesSetArg){
  const from=arg.startStr.slice(0,10);
  const endDate=new Date(arg.end.getTime()-86400000);
  const to=endDate.toISOString().slice(0,10);
  const key=`${from}:${to}`;
  if(lastRange.current===key)return;
  lastRange.current=key;
  onRangeChange(from,to);
 }

 function handleEventClick(arg:EventClickArg){
  const booking=arg.event.extendedProps?.booking as BookingRow|undefined;
  if(booking)onSelect(booking.id);
 }

 async function handleEventDrop(arg:EventDropArg){
  const booking=arg.event.extendedProps?.booking as BookingRow|undefined;
  if(!booking||!arg.event.start){arg.revert();return;}
  const ok=await onRescheduleDrop(booking,arg.event.start.toISOString());
  if(!ok)arg.revert();
 }

 function renderEventContent(arg:EventContentArg){
  const booking=arg.event.extendedProps?.booking as BookingRow|undefined;
  if(!booking)return <span>{arg.event.title}</span>;
  const hasRequest=booking.changes.some(ch=>activeChanges.some(st=>st===ch.status));
  const serviceName=services.find(s=>s.slug===booking.serviceSlug)?.[locale]||booking.serviceSlug;
  return (
   <div className="fc-amc-event" data-status={booking.status}>
    <div className="fc-amc-event-top">
     <span className="fc-amc-time">{arg.timeText}</span>
     <SolarIcon name={booking.meetingType==='ONLINE'?'videocamera-record-linear':'map-point-linear'} className="fc-amc-format"/>
     {hasRequest&&<SolarIcon name="chat-round-line-linear" className="fc-amc-alert"/>}
    </div>
    <strong className="fc-amc-title">{booking.clientName}</strong>
    <span className="fc-amc-service">{serviceName}</span>
   </div>
  );
 }

 return (
  <div className="fc-amc-wrap" dir={locale==='ar'?'rtl':'ltr'}>
   <FullCalendar
    ref={calendarRef}
    plugins={[dayGridPlugin,timeGridPlugin,listPlugin,interactionPlugin]}
    initialView={fcView}
    initialDate={currentDate}
    headerToolbar={false}
    direction={locale==='ar'?'rtl':'ltr'}
    locale={locale}
    events={events}
    editable={editable}
    eventDurationEditable={false}
    nowIndicator
    height="auto"
    dayMaxEvents={3}
    slotMinTime="08:00:00"
    slotMaxTime="21:00:00"
    allDaySlot={false}
    datesSet={handleDatesSet}
    eventClick={handleEventClick}
    eventDrop={arg=>{void handleEventDrop(arg);}}
    eventContent={renderEventContent}
   />
  </div>
 );
}

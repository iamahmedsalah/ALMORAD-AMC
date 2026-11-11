'use client';
import type {BookingRow,Locale,Schedule} from '@amc/shared';
import {SolarIcon} from '@/components/ui/solar-icon';
import {downloadCalendar,googleCalendarLink} from './helpers';
export function CalendarActions({booking,locale,schedule}:{booking:BookingRow;locale:Locale;schedule?:Schedule}) {
 if(booking.status!=='CONFIRMED'&&booking.status!=='PENDING')return null;
 const ar=locale==='ar',location=booking.meetingType==='ONLINE'?booking.meetingUrl||'':(ar?schedule?.officeAddressAr:schedule?.officeAddressEn)||'';
 return <div className="booking-actions calendar-actions"><a className="button button-secondary" href={googleCalendarLink(booking,location)} target="_blank" rel="noopener noreferrer"><SolarIcon name="calendar-linear"/>{ar?'إضافة إلى تقويم Google':'Add to Google Calendar'}</a><button type="button" className="button button-secondary" onClick={()=>downloadCalendar(booking,location)}>{ar?'Apple / Outlook (.ics)':'Apple / Outlook (.ics)'}</button></div>;
}

'use client';
import {useReducer,useState} from 'react';
import {recoverBookingInput,type Locale} from '@amc/shared';
import {SolarIcon} from '@/components/ui/solar-icon';
import {bookingFetch} from './helpers';
import {BookingLoading} from './loading-state';
type State='idle'|'sending'|'sent'|'error';
export function RecoverAppointment({locale}:{locale:Locale}){
 const ar=locale==='ar';const [identifier,setIdentifier]=useState('');const [state,setState]=useReducer((_state:State,next:State)=>next,'idle');
 const title=ar?'ابحث عن موعدك':'Find your appointment';
 async function submit(){if(state==='sending')return;const input={identifier,locale};if(!recoverBookingInput.safeParse(input).success){setState('error');return;}setState('sending');try{await bookingFetch('booking/recover',input);setState('sent');}catch{setState('error');}}
 return <section className="staff-panel appointment-recovery"><h2><SolarIcon name="lock-keyhole-linear"/>{title}</h2><p>{ar?'أدخل البريد الإلكتروني أو رقم الهاتف الذي استخدمته للحجز. سنرسل رابطًا خاصًا إلى البريد المسجّل مع الموعد.':'Enter the email or phone number used for your booking. We’ll send a private link to the email saved with the appointment.'}</p>{state==='sent'?<p role="status"><SolarIcon name="check-circle-linear"/>{ar?'إذا وُجد موعد مطابق، ستصلك رسالة إلى البريد المسجّل. راجع البريد غير المرغوب فيه أيضًا.':'If a matching appointment exists, a message will arrive at its saved email address. Please also check spam.'}</p>:<form className="staff-form" onSubmit={event=>{event.preventDefault();void submit();}}><label>{ar?'البريد الإلكتروني أو رقم الهاتف':'Email or phone number'}<input name="identifier" type="text" dir="ltr" autoComplete="email" value={identifier} onChange={event=>setIdentifier(event.target.value)} required maxLength={254} disabled={state==='sending'}/></label>{state==='error'&&<p role="alert">{ar?'تحقق من بياناتك وحاول مرة أخرى بعد قليل.':'Check your details and try again shortly.'}</p>}<button className="button button-primary" disabled={state==='sending'} aria-busy={state==='sending'}><SolarIcon name="letter-linear"/>{ar?'أرسل رابط موعدي':'Email my appointment link'}</button>{state==='sending'&&<BookingLoading label={ar?'جارٍ طلب الرابط الآمن…':'Requesting your secure link…'}/>}</form>}</section>;
}

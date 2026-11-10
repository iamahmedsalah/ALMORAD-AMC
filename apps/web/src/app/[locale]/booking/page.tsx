import {publicLocale} from '@/lib/public-page';
import {BookingWizard} from '@/features/booking/wizard';
import {bookingCopy} from '@/features/booking/copy';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}){const locale=await publicLocale(params);return {title:bookingCopy(locale).title+' | ALMORAD AMC',robots:{index:false,follow:false}};}
export default async function Book({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{service?:string|string[]}>}){const locale=await publicLocale(params);const query=await searchParams;const c=bookingCopy(locale);return <section className="container booking-page"><p className="eyebrow">ALMORAD AMC</p><h1>{c.title}</h1><p>{c.intro}</p><BookingWizard locale={locale} initialService={typeof query.service==='string'?query.service:undefined}/></section>;}

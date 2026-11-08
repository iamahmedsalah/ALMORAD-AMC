import {publicLocale} from '@/lib/public-page';
import {BookingAnalytics} from '@/features/booking/analytics';
import {deskCopy} from '@/features/booking/desk-copy';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}){const locale=await publicLocale(params);return {title:deskCopy(locale).analytics+' | ALMORAD AMC',robots:{index:false,follow:false}};}
export default async function Page({params}:{params:Promise<{locale:string}>}){return <BookingAnalytics locale={await publicLocale(params)}/>;}

import {publicLocale} from '@/lib/public-page';
import {BookingSettings} from '@/features/booking/settings';
import {deskCopy} from '@/features/booking/desk-copy';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}){const locale=await publicLocale(params);return {title:deskCopy(locale).settings+' | ALMORAD AMC',robots:{index:false,follow:false}};}
export default async function Page({params}:{params:Promise<{locale:string}>}){return <BookingSettings locale={await publicLocale(params)}/>;}

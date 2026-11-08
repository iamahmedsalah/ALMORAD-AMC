import {publicLocale} from '@/lib/public-page';
import {ManageBooking} from '@/features/booking/manage';
import {bookingCopy} from '@/features/booking/copy';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}){const locale=await publicLocale(params);return {title:bookingCopy(locale).manageTitle+' | ALMORAD AMC',referrer:'no-referrer' as const,robots:{index:false,follow:false}};}
export default async function Manage({params}:{params:Promise<{locale:string}>}){const locale=await publicLocale(params);return <ManageBooking locale={locale}/>;}

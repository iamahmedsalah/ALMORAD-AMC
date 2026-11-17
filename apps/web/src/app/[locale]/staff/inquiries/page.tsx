import {publicLocale} from '@/lib/public-page';
import {ContactInquiries} from '@/features/booking/inquiries';
export const dynamic='force-dynamic';
export const metadata={title:'Contact inquiries | ALMORAD AMC',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{locale:string}>}) {return <ContactInquiries locale={await publicLocale(params)}/>;}

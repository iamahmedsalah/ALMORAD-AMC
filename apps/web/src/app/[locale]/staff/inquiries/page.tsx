import {publicLocale} from '@/lib/public-page';
import {MeetingInquiries} from '@/features/booking/inquiries';
export const dynamic='force-dynamic';
export const metadata={title:'Meeting inquiries | ALMORAD AMC',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{locale:string}>}) {return <MeetingInquiries locale={await publicLocale(params)}/>;}

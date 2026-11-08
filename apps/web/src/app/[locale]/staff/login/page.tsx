import {publicLocale} from '@/lib/public-page';
import {StaffLogin} from '@/features/staff/login';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}) {const locale=await publicLocale(params);return {title:locale==='ar'?'دخول الفريق | ALMORAD AMC':'Staff sign in | ALMORAD AMC',robots:{index:false,follow:false}};}
export const dynamic='force-dynamic';
export default async function Login({params}:{params:Promise<{locale:string}>}){return <StaffLogin locale={await publicLocale(params)}/>;}

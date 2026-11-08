import {publicLocale} from '@/lib/public-page';
import {StaffPortal} from '@/features/staff/portal';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}) {const locale=await publicLocale(params);return {title:locale==='ar'?'مساحة فريق العمل | ALMORAD AMC':'Staff workspace | ALMORAD AMC',robots:{index:false,follow:false}};}
export const dynamic='force-dynamic';
export default async function Staff({params}:{params:Promise<{locale:string}>}){return <StaffPortal locale={await publicLocale(params)}/>;}

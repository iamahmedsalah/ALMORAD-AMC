import {publicLocale} from '@/lib/public-page';
import {ForgotPassword} from '@/features/staff/forgot-password';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}){const locale=await publicLocale(params);return {title:locale==='ar'?'\u0627\u0633\u062a\u0639\u0627\u062f\u0629 \u062d\u0633\u0627\u0628 \u0627\u0644\u0639\u0645\u0644 | ALMORAD AMC':'Recover staff account | ALMORAD AMC',robots:{index:false,follow:false}};}
export default async function Page({params}:{params:Promise<{locale:string}>}){return <ForgotPassword locale={await publicLocale(params)}/>;}

import {Container} from '@/components/layout/shell';
import {TeamShowcase} from '@/components/landing/team-showcase';
import {publicLocale} from '@/lib/public-page';
import {pageMetadata} from '@/lib/seo/metadata';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}){
 const locale=await publicLocale(params);
 const metadata=pageMetadata(locale,'/team',locale==='ar'?'فريق الاستوديو':'Meet the team',locale==='ar'?'تعرّف على فريق المراد AMC وتخصصات الاستوديو.':'Meet the ALMORAD AMC studio and explore its disciplines.');
 // Existing profiles remain a labelled design preview until the owner verifies them.
 return {...metadata,robots:{index:false,follow:true}};
}
export default async function TeamPage({params}:{params:Promise<{locale:string}>}){
 const locale=await publicLocale(params);
 return <div className="amc-landing team-page"><Container><TeamShowcase locale={locale} standalone/></Container></div>;
}

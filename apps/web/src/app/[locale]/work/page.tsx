import {Container} from '@/components/layout/shell';
import {Link} from '@/i18n/navigation';
import {publicLocale} from '@/lib/public-page';
import {pageMetadata} from '@/lib/seo/metadata';
import {copyFor} from '@/features/marketing/copy';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}) {const l=await publicLocale(params);const c=copyFor(l);return {...pageMetadata(l,'/work',c.nav.work,c.work.intro),robots:{index:false,follow:true}};}
export default async function Work({params}:{params:Promise<{locale:string}>}) {const locale=await publicLocale(params);const c=copyFor(locale);return <Container className="studio-public-page"><section className="page-intro"><p className="eyebrow">ALMORAD AMC</p><h1>{c.work.title}</h1><p className="intro">{c.work.intro}</p></section><section className="notice-panel"><h2>{c.work.heading}</h2><p>{c.work.body}</p><Link className="text-link" href="/services">{c.expertise.link}<span aria-hidden="true">↗</span></Link></section></Container>;}

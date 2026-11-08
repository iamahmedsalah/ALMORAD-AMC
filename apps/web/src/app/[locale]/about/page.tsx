import {Container} from '@/components/layout/shell';
import {Link} from '@/i18n/navigation';
import {publicLocale} from '@/lib/public-page';
import {pageMetadata} from '@/lib/seo/metadata';
import {copyFor} from '@/features/marketing/copy';
import {pillars} from '@amc/shared';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}) {const l=await publicLocale(params);const c=copyFor(l);return pageMetadata(l,'/about',c.nav.about,c.about.intro);}
export default async function About({params}:{params:Promise<{locale:string}>}) {const locale=await publicLocale(params);const c=copyFor(locale);return <Container className="studio-public-page"><section className="page-intro"><p className="eyebrow">ALMORAD AMC / GROWTH & BRAND STUDIO</p><h1>{c.about.title}</h1><p className="intro">{c.about.intro}</p></section><div className="article-content"><section className="split-content"><h2>{c.about.heading}</h2><div><p>{c.about.body}</p><p>{c.about.second}</p></div></section><section className="split-content"><h2>{c.expertise.title}</h2><div className="related-services">{pillars.map(p=><Link key={p.id} href={`/services/${p.id}`}>{p[locale]}<span aria-hidden="true">↗</span></Link>)}</div></section><Link className="button button-primary" href="/contact">{c.contact.link}</Link></div></Container>;}

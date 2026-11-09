import {disciplineCopy,disciplineFor} from '@/features/services/discipline-content';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {hasLocale} from 'next-intl';
import {notFound} from 'next/navigation';
import {pillars, services} from '@amc/shared';
import {routing} from '@/i18n/routing';
import {Container} from '@/components/layout/shell';
import {Link} from '@/i18n/navigation';
import {SolarIcon} from '@/components/ui/solar-icon';
import {pageMetadata} from '@/lib/seo/metadata';
export async function generateMetadata({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params; if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({locale, namespace: 'services'}); return pageMetadata(locale, '/services', t('title'), t('intro'));
}
export default async function Services({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params; if (!hasLocale(routing.locales, locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations('services');const dc=disciplineCopy(locale);
  return <Container className="studio-public-page"><section className="page-intro"><p className="eyebrow">{t('eyebrow')}</p><h1>{t('title')}</h1><p className="intro">{dc.section.lede}</p></section><div className="service-list">{pillars.map((pillar, i) => <section id={pillar.id} key={pillar.id} className="service-group"><div><p className="index">0{i+1}</p><h2><Link href={`/services/${pillar.id}`}>{pillar[locale]}</Link></h2><p>{disciplineFor(pillar.id,locale).tagline}</p><p>{disciplineFor(pillar.id,locale).body}</p></div><ul>{services.filter(s => s.pillar === pillar.id).map(s => <li id={s.slug} key={s.slug}><Link href={`/services/${s.slug}`}>{s[locale]}<SolarIcon name="arrow-right-up-linear"/></Link></li>)}</ul></section>)}</div><p className="publication-note">ALMORAD AMC — Growth &amp; Brand Studio</p></Container>;
}

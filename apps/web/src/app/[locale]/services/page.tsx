import { disciplineCopy, disciplineFor } from '@/features/services/discipline-content';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { pillars, services } from '@amc/shared';
import { routing } from '@/i18n/routing';
import { Container } from '@/components/layout/shell';
import { Link } from '@/i18n/navigation';
import { SolarIcon } from '@/components/ui/solar-icon';
import { pageMetadata, siteOrigin } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, serializeJsonLd, servicesCollectionJsonLd } from '@/lib/seo/jsonld';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const title =
    locale === 'ar'
      ? 'خدمات التسويق والإعلان والاستشارات وتطوير المواقع'
      : 'Marketing, Advertising, Consulting & Web Services';
  const description =
    locale === 'ar'
      ? 'اكتشف خدمات المراد AMC في التسويق، الإعلان، الاستشارات الإدارية والتجارة الإلكترونية، وتطوير المواقع والمتاجر الإلكترونية.'
      : 'Explore ALMORAD AMC services across Marketing, Advertising, Business Consulting, and Web Development — tailored to grow your brand.';
  return pageMetadata(locale, '/services', title, description);
}

export default async function Services({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('services');
  const tSite = await getTranslations('site');
  const dc = disciplineCopy(locale);
  const origin = siteOrigin();
  const schema = origin
    ? [
        servicesCollectionJsonLd(locale, origin, t('title'), t('intro')),
        breadcrumbJsonLd([
          { name: tSite('home'), item: `${origin}/${locale}` },
          { name: tSite('services'), item: `${origin}/${locale}/services` },
        ]),
      ]
    : [];

  return (
    <Container className="studio-public-page">
      {schema.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
      )}
      <section className="page-intro">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1>{t('title')}</h1>
        <p className="intro">{dc.section.lede}</p>
      </section>
      <div className="service-list">
        {pillars.map((pillar) => (
          <section id={pillar.id} key={pillar.id} className="service-group">
            <div>
              <h2>
                <Link href={`/services/${pillar.id}`}>{pillar[locale]}</Link>
              </h2>
              <p>{disciplineFor(pillar.id, locale).tagline}</p>
              <p>{disciplineFor(pillar.id, locale).body}</p>
            </div>
            <ul>
              {services
                .filter((s) => s.pillar === pillar.id)
                .map((s) => (
                  <li id={s.slug} key={s.slug}>
                    <Link href={`/services/${s.slug}`}>
                      {s[locale]}
                      <SolarIcon name="arrow-right-up-linear" />
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="publication-note">ALMORAD AMC — Growth &amp; Brand Studio</p>
    </Container>
  );
}

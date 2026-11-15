import { serviceDetailFor } from '@/features/services/service-detail-content';
import { disciplineFor } from '@/features/services/discipline-content';
import { pillars, services } from '@amc/shared';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/shell';
import { Link } from '@/i18n/navigation';
import { SolarIcon } from '@/components/ui/solar-icon';
import { publicLocale } from '@/lib/public-page';
import { pageMetadata, siteOrigin } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, faqPageJsonLd, serializeJsonLd, serviceJsonLd } from '@/lib/seo/jsonld';
import { copyFor } from '@/features/marketing/copy';
import { briefFor } from '@/features/services/briefs';

type Params = Promise<{ locale: string; slug: string }>;

function offering(slug: string) {
  return services.find((s) => s.slug === slug) || pillars.find((p) => p.id === slug);
}

export function generateStaticParams() {
  return [...pillars.map((p) => p.id), ...services.map((s) => s.slug)].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const locale = await publicLocale(params);
  const { slug } = await params;
  const item = offering(slug);
  if (!item) notFound();
  const service = 'slug' in item ? item : undefined;
  const pillar = pillars.find((p) => p.id === (service?.pillar || slug))!;
  const description = service
    ? briefFor(slug, locale).summary
    : disciplineFor(pillar.id, locale).body;
  return pageMetadata(locale, `/services/${slug}`, item[locale], description, {
    image: `/studio/services/${pillar.id}.webp`,
  });
}

export default async function Offering({ params }: { params: Params }) {
  const locale = await publicLocale(params);
  const { slug } = await params;
  const item = offering(slug);
  if (!item) notFound();
  const c = copyFor(locale);
  const service = 'slug' in item ? item : undefined;
  const pillar = pillars.find((p) => p.id === (service?.pillar || slug))!;
  const brief = service ? briefFor(slug, locale) : undefined;
  const description = brief?.summary || disciplineFor(pillar.id, locale).body;
  const detail = service ? serviceDetailFor(slug, locale) : undefined;
  const discipline = disciplineFor(pillar.id, locale);
  const related = services.filter((s) => s.pillar === pillar.id && s.slug !== slug);
  const origin = siteOrigin();

  const schema = origin
    ? [
        serviceJsonLd({ locale, origin, slug, name: item[locale], description }),
        breadcrumbJsonLd([
          { name: c.detail.back, item: `${origin}/${locale}/services` },
          { name: pillar[locale], item: `${origin}/${locale}/services/${pillar.id}` },
          ...(service ? [{ name: service[locale], item: `${origin}/${locale}/services/${slug}` }] : []),
        ]),
        ...(brief
          ? [faqPageJsonLd([[detail?.question ?? c.detail.q, detail?.answer ?? c.detail.a]])]
          : []),
      ]
    : [];

  return (
    <Container className="studio-public-page">
      {schema.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
      )}
      <nav aria-label={locale === 'ar' ? 'مسار الصفحة' : 'Breadcrumb'}>
        <ol className="breadcrumbs">
          <li>
            <Link href="/services">{c.detail.back}</Link>
          </li>
          {service && (
            <li>
              <Link href={`/services/${pillar.id}`}>{pillar[locale]}</Link>
            </li>
          )}
          <li aria-current="page">{item[locale]}</li>
        </ol>
      </nav>
      <section className="page-intro">
        <p className="eyebrow">
          ALMORAD AMC / {pillar[locale]}
        </p>
        <h1>{item[locale]}</h1>
        <p className="intro">{description}</p>
        <Link className="button button-primary" href={service ? `/booking?service=${service.slug}` : '/contact'}>
          {c.detail.talk}
          <SolarIcon name="arrow-right-up-linear" />
        </Link>
      </section>
      <div className="article-content">
        {detail && (
          <>
            <section className="split-content">
              <h2>{locale === 'ar' ? 'لمن هذه الخدمة' : 'Who this is for'}</h2>
              <p className="service-audience">{detail.audience}</p>
            </section>
            <section aria-labelledby="service-working-title">
              <h2 id="service-working-title">{locale === 'ar' ? 'كيف نعمل معك' : 'How we work with you'}</h2>
              <div className="service-detail-highlights">
                {detail.steps.map((step, index) => (
                  <div key={step}>
                    <h3>
                      {
                        [
                          locale === 'ar' ? 'الفهم' : 'Understand',
                          locale === 'ar' ? 'التطوير' : 'Develop',
                          locale === 'ar' ? 'المراجعة والتسليم' : 'Review & hand over',
                        ][index]
                      }
                    </h3>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        {!service && (
          <section className="discipline-detail">
            <h2>{discipline.tagline}</h2>
            <ul className="discipline-service-descriptions">
              {Object.entries(discipline.services).map(
                ([serviceSlug, serviceDetail]) =>
                  serviceDetail && (
                    <li key={serviceSlug}>
                      <h3>
                        <Link href={`/services/${serviceSlug}`}>
                          {services.find((s) => s.slug === serviceSlug)?.[locale]}
                        </Link>
                      </h3>
                      <p>{serviceDetail.description}</p>
                    </li>
                  )
              )}
            </ul>
            <p className="eyebrow">{locale === 'ar' ? 'نحدد نطاق العمل معًا' : 'Scope defined together'}</p>
            <p>
              {locale === 'ar'
                ? 'نناقش الأهداف والمخرجات المناسبة خلال الاستشارة.'
                : 'We discuss goals and suitable deliverables during the consultation.'}
            </p>
            {discipline.process && (
              <>
                <h2>{discipline.processLabel}</h2>
                <ol className="service-build-process">
                  {discipline.process.map((step) => (
                    <li key={step.step}>
                      <strong>{step.step}</strong>
                      <span>{step.detail}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        )}
        {brief && (
          <section className="split-content">
            <h2>{c.detail.scope}</h2>
            <ul className="scope-list">
              {brief.areas.map((a) => (
                <li key={a}>
                  <SolarIcon name="check-circle-linear" />
                  {a}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="split-content">
          <h2>{c.detail.process}</h2>
          <p>{c.detail.processBody}</p>
        </section>
        {brief && (
          <section className="split-content">
            <h2>{c.detail.faq}</h2>
            <div className="faq-list">
              <details>
                <summary>
                  {detail?.question ?? c.detail.q}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{detail?.answer ?? c.detail.a}</p>
              </details>
            </div>
          </section>
        )}
        <section className="split-content">
          <h2>{c.detail.related}</h2>
          <div className="related-services">
            {related.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`}>
                {s[locale]}
                <SolarIcon name="arrow-right-up-linear" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Container>
  );
}

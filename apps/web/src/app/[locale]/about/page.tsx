import { Container } from '@/components/layout/shell';
import { Link } from '@/i18n/navigation';
import { publicLocale } from '@/lib/public-page';
import { pageMetadata, siteOrigin } from '@/lib/seo/metadata';
import { aboutPageJsonLd, breadcrumbJsonLd, serializeJsonLd } from '@/lib/seo/jsonld';
import { copyFor } from '@/features/marketing/copy';
import { pillars } from '@amc/shared';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const l = await publicLocale(params);
  const c = copyFor(l);
  const title = l === 'ar' ? 'من نحن — استوديو النمو وبناء العلامات' : 'About Us — Growth & Brand Studio';
  return pageMetadata(l, '/about', title, c.about.intro);
}

export default async function About({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await publicLocale(params);
  const c = copyFor(locale);
  const origin = siteOrigin();
  const schema = origin
    ? [
        aboutPageJsonLd(locale, origin, c.nav.about, c.about.intro),
        breadcrumbJsonLd([
          { name: locale === 'ar' ? 'الرئيسية' : 'Home', item: `${origin}/${locale}` },
          { name: c.nav.about, item: `${origin}/${locale}/about` },
        ]),
      ]
    : [];

  return (
    <Container className="studio-public-page">
      {schema.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
      )}
      <section className="page-intro">
        <p className="eyebrow">ALMORAD AMC / GROWTH &amp; BRAND STUDIO</p>
        <h1>{c.about.title}</h1>
        <p className="intro">{c.about.intro}</p>
      </section>
      <div className="article-content">
        <section className="split-content">
          <h2>{c.about.heading}</h2>
          <div>
            <p>{c.about.body}</p>
            <p>{c.about.second}</p>
          </div>
        </section>
        <section className="split-content">
          <h2>{c.expertise.title}</h2>
          <div className="related-services">
            {pillars.map((p) => (
              <Link key={p.id} href={`/services/${p.id}`}>
                {p[locale]}
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </section>
        <Link className="button button-primary" href="/contact">
          {c.contact.link}
        </Link>
      </div>
    </Container>
  );
}

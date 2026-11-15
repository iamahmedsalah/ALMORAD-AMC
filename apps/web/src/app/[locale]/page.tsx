import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Landing } from '@/features/marketing/landing';
import { pageMetadata, siteOrigin } from '@/lib/seo/metadata';
import { organizationJsonLd, serializeJsonLd, websiteJsonLd } from '@/lib/seo/jsonld';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const title =
    locale === 'ar'
      ? 'المراد AMC | تسويق وبناء علامات وتطوير مواقع بالإسكندرية'
      : 'ALMORAD AMC | Marketing, Branding & Web in Alexandria';
  const description =
    locale === 'ar'
      ? 'المراد AMC استوديو نمو وبناء علامات في الإسكندرية، مصر — نقدم خدمات التسويق، الإعلان، الاستشارات، وتطوير المواقع لبناء حضور رقمي قوي.'
      : 'ALMORAD AMC is a Growth & Brand Studio in Alexandria, Egypt — offering marketing, advertising, consulting, and web development for ambitious brands.';
  return pageMetadata(locale, '', title, description, { absoluteTitle: true });
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const origin = siteOrigin();
  const data = organizationJsonLd(locale, origin);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
      {origin && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd(origin)) }} />
      )}
      <Landing locale={locale} />
    </>
  );
}

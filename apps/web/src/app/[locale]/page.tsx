import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Landing } from '@/features/marketing/landing';
import { copyFor } from '@/features/marketing/copy';
import { pageMetadata, siteOrigin } from '@/lib/seo/metadata';
import { organizationJsonLd, serializeJsonLd } from '@/lib/seo/jsonld';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const c = copyFor(locale);
  const title =
    locale === 'ar'
      ? 'المراد AMC — استوديو النمو وبناء العلامات | التسويق والإعلان وتطوير المواقع'
      : 'ALMORAD AMC — Growth & Brand Studio | Marketing, Advertising & Web';
  return pageMetadata(locale, '', title, c.intro, { absoluteTitle: true });
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
      <Landing locale={locale} />
    </>
  );
}

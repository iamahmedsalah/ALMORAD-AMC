import type { Metadata } from 'next';
import type { Locale } from '@amc/shared';

export function siteOrigin(): string | null {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) return null;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin');
  }
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('Published site origin must use HTTPS');
  }
  return url.origin;
}

export interface PageMetadataOptions {
  absoluteTitle?: boolean;
  image?: string;
}

export function pageMetadata(
  locale: Locale,
  path: string,
  title: string,
  description: string,
  options?: PageMetadataOptions
): Metadata {
  const origin = siteOrigin();
  const url = origin ? `${origin}/${locale}${path}` : undefined;
  const fullTitle = options?.absoluteTitle ? title : `${title} | ALMORAD AMC`;
  const imagePath = options?.image ?? '/opengraph-image';
  const imageUrl = origin ? `${origin}${imagePath}` : imagePath;
  const ogImage =
    imagePath === '/opengraph-image'
      ? { url: imageUrl, width: 1200, height: 630, alt: fullTitle }
      : { url: imageUrl, alt: fullTitle };

  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title: options?.absoluteTitle ? { absolute: title } : fullTitle,
    description,
    // Public ownership tokens supplied by the owner; never fabricate verification.
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.BING_SITE_VERIFICATION
        ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION }
        : undefined,
    },
    robots: {
      index: Boolean(origin) && process.env.NEXT_PUBLIC_CONTENT_APPROVED === 'true',
      follow: true,
      'max-image-preview': 'large',
    },
    alternates: origin
      ? {
          canonical: url,
          languages: {
            en: `${origin}/en${path}`,
            ar: `${origin}/ar${path}`,
            'x-default': `${origin}/en${path}`,
          },
        }
      : undefined,
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: 'ALMORAD AMC',
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
      alternateLocale: locale === 'ar' ? 'en_US' : 'ar_EG',
      type: 'website',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
    },
  };
}

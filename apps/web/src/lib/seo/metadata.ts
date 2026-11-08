import type {Metadata} from 'next';
import type {Locale} from '@amc/shared';
export function siteOrigin(): string | null {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) return null;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin');
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('Published site origin must use HTTPS');
  return url.origin;
}
export function pageMetadata(locale: Locale, path: string, title: string, description: string): Metadata {
  const origin = siteOrigin(); const url = origin ? `${origin}/${locale}${path}` : undefined;
  return {title: `${title} | ALMORAD AMC`, description,
    robots: {index: Boolean(origin) && process.env.NEXT_PUBLIC_CONTENT_APPROVED === 'true', follow: true},
    alternates: origin ? {canonical: url, languages: {en: `${origin}/en${path}`, ar: `${origin}/ar${path}`, 'x-default': `${origin}/en${path}`}} : undefined,
    openGraph: {title, description, url, siteName: 'ALMORAD AMC', locale: locale === 'ar' ? 'ar_EG' : 'en_US', alternateLocale: locale === 'ar' ? 'en_US' : 'ar_EG', type: 'website'},
    twitter: {card: 'summary', title, description}
  };
}

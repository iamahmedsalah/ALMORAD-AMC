import { afterEach, expect, it, vi } from 'vitest';
import { pageMetadata, siteOrigin } from './metadata';

afterEach(() => vi.unstubAllEnvs());

it('does not invent a public domain or index local previews', () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined);
  expect(siteOrigin()).toBeNull();
  const metadata = pageMetadata('en', '', 'Home', 'Description');
  expect(metadata.robots).toEqual({ index: false, follow: true });
  expect(metadata.metadataBase).toBeUndefined();
});

it('builds reciprocal canonical and language pairs for equivalent routes', () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.invalid');
  const metadata = pageMetadata('ar', '/services', 'خدماتنا', 'وصف');
  expect(metadata.metadataBase).toEqual(new URL('https://example.invalid'));
  expect(metadata.alternates).toEqual({
    canonical: 'https://example.invalid/ar/services',
    languages: {
      en: 'https://example.invalid/en/services',
      ar: 'https://example.invalid/ar/services',
      'x-default': 'https://example.invalid/en/services',
    },
  });
});

it('attaches OpenGraph and Twitter images with absoluteTitle support', () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.invalid');
  const home = pageMetadata('en', '', 'ALMORAD AMC — Growth & Brand Studio', 'Intro', {
    absoluteTitle: true,
  });
  expect(home.title).toEqual({ absolute: 'ALMORAD AMC — Growth & Brand Studio' });
  expect(home.openGraph?.images).toEqual([
    {
      url: 'https://example.invalid/opengraph-image',
      width: 1200,
      height: 630,
      alt: 'ALMORAD AMC — Growth & Brand Studio',
    },
  ]);
  expect(home.twitter).toEqual({
    card: 'summary_large_image',
    title: 'ALMORAD AMC — Growth & Brand Studio',
    description: 'Intro',
    images: ['https://example.invalid/opengraph-image'],
  });

  const service = pageMetadata('en', '/services/branding', 'Branding', 'Desc', {
    image: '/studio/services/marketing.webp',
  });
  expect(service.openGraph?.images).toEqual([
    {
      url: 'https://example.invalid/studio/services/marketing.webp',
      alt: 'Branding | ALMORAD AMC',
    },
  ]);
});

it('rejects URLs with paths or embedded credentials', () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://secret@example.invalid/path');
  expect(siteOrigin).toThrow();
});

it('keeps editorial drafts noindex even with a configured domain', () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.invalid');
  vi.stubEnv('NEXT_PUBLIC_CONTENT_APPROVED', undefined);
  expect(pageMetadata('en', '/services/branding', 'Branding', 'Description').robots).toEqual({
    index: false,
    follow: true,
  });
  vi.stubEnv('NEXT_PUBLIC_CONTENT_APPROVED', 'true');
  expect(pageMetadata('en', '/services/branding', 'Branding', 'Description').robots).toEqual({
    index: true,
    follow: true,
  });
});

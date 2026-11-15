import { afterEach, expect, it, vi } from 'vitest';
import {
  aboutPageJsonLd,
  breadcrumbJsonLd,
  faqPageJsonLd,
  organizationJsonLd,
  serializeJsonLd,
  serviceJsonLd,
  servicesCollectionJsonLd,
  websiteJsonLd,
} from './jsonld';

afterEach(() => vi.unstubAllEnvs());

it('uses one site identity for both languages, linked to the factual organization', () => {
  const website = websiteJsonLd('https://almorad-amc.com');
  expect(website).toMatchObject({
    '@type': 'WebSite',
    '@id': 'https://almorad-amc.com/#website',
    url: 'https://almorad-amc.com/',
    name: 'ALMORAD AMC',
    inLanguage: ['en', 'ar'],
    publisher: { '@id': 'https://almorad-amc.com/#organization' },
  });
  expect(website.alternateName).toContain('المراد AMC');
});

it('escapes closing-tag characters when serializing JSON-LD', () => {
  expect(serializeJsonLd({ text: '</script><script>alert(1)</script>' })).not.toContain('<');
});

it('builds factual Organization JSON-LD with verified address, logo, and social profiles', () => {
  const org = organizationJsonLd('en', 'https://almorad-amc.com');
  expect(org['@type']).toBe('Organization');
  expect(org.name).toBe('ALMORAD AMC');
  expect(org.url).toBe('https://almorad-amc.com');
  expect(org.logo).toBe('https://almorad-amc.com/icon-512.png');
  expect(org.address).toEqual({
    '@type': 'PostalAddress',
    streetAddress: '18 Zaki Ragab Street, High Class 1 Tower, Floor 7',
    addressLocality: 'Smouha',
    addressRegion: 'Alexandria Governorate',
    addressCountry: 'EG',
  });
  expect(org.geo).toEqual({
    '@type': 'GeoCoordinates',
    latitude: 31.2075855,
    longitude: 29.9365845,
  });
  expect(org.hasMap).toContain('ChIJPSldNk_Y7kkRBxgjOErbf5E');
  expect(Array.isArray(org.sameAs)).toBe(true);
  expect(org.sameAs?.length).toBeGreaterThan(0);
  expect(org.contactPoint).toBeUndefined();
});

it('includes ContactPoint only when public contact env vars are configured', () => {
  vi.stubEnv('NEXT_PUBLIC_CONTACT_EMAIL', 'hello@almorad-amc.com');
  const org = organizationJsonLd('ar', 'https://almorad-amc.com');
  expect(org.contactPoint).toEqual({
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'hello@almorad-amc.com',
    availableLanguage: ['English', 'Arabic'],
  });
});

it('builds FAQPage, Service, CollectionPage, AboutPage, and BreadcrumbList schemas', () => {
  const faq = faqPageJsonLd([['Q1', 'A1']]);
  expect(faq['@type']).toBe('FAQPage');
  expect(faq.mainEntity[0]).toEqual({
    '@type': 'Question',
    name: 'Q1',
    acceptedAnswer: { '@type': 'Answer', text: 'A1' },
  });

  const svc = serviceJsonLd({
    locale: 'en',
    origin: 'https://almorad-amc.com',
    slug: 'branding',
    name: 'Branding',
    description: 'Brand identity',
  });
  expect(svc['@type']).toBe('Service');
  expect(svc.provider['@id']).toBe('https://almorad-amc.com/#organization');

  const collection = servicesCollectionJsonLd(
    'en',
    'https://almorad-amc.com',
    'Services',
    'Our services'
  );
  expect(collection['@type']).toBe('CollectionPage');
  expect(collection.mainEntity.itemListElement.length).toBe(15);

  const about = aboutPageJsonLd('ar', 'https://almorad-amc.com', 'من نحن', 'وصف');
  expect(about['@type']).toBe('AboutPage');
  expect(about.inLanguage).toBe('ar-EG');

  const crumbs = breadcrumbJsonLd([
    { name: 'Home', item: 'https://almorad-amc.com/en' },
    { name: 'Services', item: 'https://almorad-amc.com/en/services' },
  ]);
  expect(crumbs.itemListElement[1]?.position).toBe(2);
});

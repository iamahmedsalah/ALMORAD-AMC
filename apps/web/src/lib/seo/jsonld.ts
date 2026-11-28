import { officeLocation, pillars, services, type Locale } from '@amc/shared';
import { publicContact } from '../public-contact';
import { socialProfiles } from '../social-profiles';

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function websiteJsonLd(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    url: `${origin}/`,
    name: 'ALMORAD AMC',
    alternateName: [
      'المراد AMC',
      'ALMORAD AMC — Advertising, Marketing & Consulting Agency',
      'ALMORAD AMC — Growth & Brand Studio',
    ],
    inLanguage: ['en', 'ar'],
    publisher: { '@id': `${origin}/#organization` },
  };
}

export function organizationJsonLd(locale: Locale, origin: string | null) {
  const contact = publicContact(locale);
  const sameAs = socialProfiles()
    .filter((profile) => profile.href && !profile.demo)
    .map((profile) => profile.href as string);

  const contactPoint =
    contact.email || contact.phone
      ? {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          ...(contact.email ? { email: contact.email } : {}),
          ...(contact.phone ? { telephone: contact.phone } : {}),
          availableLanguage: ['English', 'Arabic'],
        }
      : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    ...(origin ? { '@id': `${origin}/#organization`, url: origin, logo: { '@type': 'ImageObject', url: `${origin}/icon-512.png`, width: 512, height: 512 } } : {}),
    name: 'ALMORAD AMC',
    alternateName: locale === 'ar' ? 'المراد AMC' : 'ALMORAD AMC Agency',
    description:
      locale === 'ar'
        ? 'المراد AMC وكالة دعاية وإعلان وتسويق واستشارات في الإسكندرية، مصر.'
        : 'ALMORAD AMC is an advertising, marketing & consulting agency in Alexandria, Egypt.',
    disambiguatingDescription:
      locale === 'ar'
        ? 'المراد AMC (almorad-amc.com) وكالة دعاية وإعلان وتسويق رقمي واستشارات وتطوير مواقع في سموحة، الإسكندرية، مصر.'
        : 'ALMORAD AMC (almorad-amc.com) is an Alexandria, Egypt advertising, marketing, branding, consulting, and web development agency located in Smouha.',
    knowsAbout: [
      'Advertising',
      'Marketing',
      'Branding',
      'Media Buying',
      'Management Consulting',
      'E-commerce Consulting',
      'Web Development',
    ],
    areaServed: {
      '@type': 'Country',
      name: 'Egypt',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: officeLocation.address[locale],
      addressLocality: officeLocation.addressLocality[locale],
      addressRegion: officeLocation.addressRegion[locale],
      addressCountry: officeLocation.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: officeLocation.coords.lat,
      longitude: officeLocation.coords.lng,
    },
    hasMap: officeLocation.directionsUrl,
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(contactPoint ? { contactPoint } : {}),
  };
}

export function breadcrumbJsonLd(items: ReadonlyArray<{ name: string; item: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  };
}

export function serviceJsonLd(params: {
  locale: Locale;
  origin: string;
  slug: string;
  name: string;
  description: string;
}) {
  const { locale, origin, slug, name, description } = params;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    serviceType: name,
    url: `${origin}/${locale}/services/${slug}`,
    availableLanguage: ['English', 'Arabic'],
    provider: {
      '@type': 'Organization',
      '@id': `${origin}/#organization`,
      name: 'ALMORAD AMC',
      url: origin,
    },
  };
}

export function faqPageJsonLd(items: ReadonlyArray<readonly [string, string]>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

export function servicesCollectionJsonLd(
  locale: Locale,
  origin: string,
  title: string,
  description: string
) {
  const items = [
    ...pillars.map((p) => ({ name: p[locale], url: `${origin}/${locale}/services/${p.id}` })),
    ...services.map((s) => ({ name: s[locale], url: `${origin}/${locale}/services/${s.slug}` })),
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: `${origin}/${locale}/services`,
    inLanguage: locale === 'ar' ? 'ar-EG' : 'en-US',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((entry, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: entry.name,
        url: entry.url,
      })),
    },
  };
}

export function aboutPageJsonLd(
  locale: Locale,
  origin: string,
  title: string,
  description: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: title,
    description,
    url: `${origin}/${locale}/about`,
    inLanguage: locale === 'ar' ? 'ar-EG' : 'en-US',
    mainEntity: {
      '@id': `${origin}/#organization`,
      '@type': 'Organization',
      name: 'ALMORAD AMC',
      url: origin,
    },
  };
}

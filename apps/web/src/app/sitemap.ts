import type { MetadataRoute } from 'next';
import { pillars, services } from '@amc/shared';
import { siteOrigin } from '@/lib/seo/metadata';

interface SitemapRoute {
  path: string;
  changeFrequency: 'weekly' | 'monthly';
  priority: number;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  if (!origin || process.env.NEXT_PUBLIC_CONTENT_APPROVED !== 'true') return [];

  const routes: SitemapRoute[] = [
    { path: '', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/services', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/faq', changeFrequency: 'monthly', priority: 0.7 },
    ...pillars.map((p) => ({
      path: `/services/${p.id}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    ...services.map((s) => ({
      path: `/services/${s.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];

  return routes.flatMap(({ path, changeFrequency, priority }) =>
    (['en', 'ar'] as const).map((locale) => ({
      url: `${origin}/${locale}${path}`,
      changeFrequency,
      priority,
      alternates: {
        languages: {
          en: `${origin}/en${path}`,
          ar: `${origin}/ar${path}`,
          'x-default': `${origin}/en${path}`,
        },
      },
    }))
  );
}

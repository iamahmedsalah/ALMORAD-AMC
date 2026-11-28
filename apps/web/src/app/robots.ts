import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/seo/metadata';

const PRIVATE_PATHS = ['/staff', '/*/staff', '/*/booking/manage', '/api'];
const PUBLIC_ALLOW = [
  '/',
  '/favicon.ico',
  '/favicon-48.png',
  '/favicon-96.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  const published = Boolean(origin) && process.env.NEXT_PUBLIC_CONTENT_APPROVED === 'true';

  if (!published) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [
      { userAgent: '*', allow: PUBLIC_ALLOW, disallow: PRIVATE_PATHS },
      { userAgent: 'Bingbot', allow: PUBLIC_ALLOW, disallow: PRIVATE_PATHS },
      { userAgent: 'msnbot', allow: PUBLIC_ALLOW, disallow: PRIVATE_PATHS },
      { userAgent: 'Googlebot', allow: PUBLIC_ALLOW, disallow: PRIVATE_PATHS },
      { userAgent: 'Googlebot-Image', allow: PUBLIC_ALLOW, disallow: PRIVATE_PATHS },
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'PerplexityBot',
          'ClaudeBot',
          'Claude-SearchBot',
          'Google-Extended',
        ],
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}

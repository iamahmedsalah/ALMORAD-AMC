import type {MetadataRoute} from 'next';
import {siteOrigin} from '@/lib/seo/metadata';

export default function robots():MetadataRoute.Robots {
  const origin=siteOrigin();
  const published=Boolean(origin)&&process.env.NEXT_PUBLIC_CONTENT_APPROVED==='true';
  return {
    rules:[
      {
        userAgent:'*',
        allow:published?['/', '/favicon.ico', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']:undefined,
        disallow:published?['/staff','/*/staff','/*/booking/manage','/api']:'/',
      },
      ...(published?[{userAgent:'Googlebot-Image',allow:['/','/icon-192.png','/icon-512.png','/favicon.ico']}]:[]),
    ],
    sitemap:published?`${origin}/sitemap.xml`:undefined,
  };
}

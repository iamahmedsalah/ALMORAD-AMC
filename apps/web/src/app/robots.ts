import type {MetadataRoute} from 'next';
import {siteOrigin} from '@/lib/seo/metadata';
export default function robots():MetadataRoute.Robots {const origin=siteOrigin();const published=Boolean(origin)&&process.env.NEXT_PUBLIC_CONTENT_APPROVED==='true';return {rules:{userAgent:'*',allow:published?'/':undefined,disallow:published?['/staff','/*/staff','/*/booking/manage','/api']:'/'},sitemap:published?`${origin}/sitemap.xml`:undefined};}

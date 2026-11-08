import type {MetadataRoute} from 'next';
import {pillars,services} from '@amc/shared';
import {siteOrigin} from '@/lib/seo/metadata';
export default function sitemap():MetadataRoute.Sitemap {const origin=siteOrigin();if(!origin||process.env.NEXT_PUBLIC_CONTENT_APPROVED!=='true')return [];return ['','/services','/about','/faq',...pillars.map(p=>`/services/${p.id}`),...services.map(s=>`/services/${s.slug}`)].flatMap(path=>['en','ar'].map(locale=>({url:`${origin}/${locale}${path}`,alternates:{languages:{en:`${origin}/en${path}`,ar:`${origin}/ar${path}`,'x-default':`${origin}/en${path}`}}})));}

import {setRequestLocale} from 'next-intl/server';
import {hasLocale} from 'next-intl';
import {notFound} from 'next/navigation';
import {routing} from '@/i18n/routing';
import {Landing} from '@/features/marketing/landing';
import {copyFor} from '@/features/marketing/copy';
import {pageMetadata,siteOrigin} from '@/lib/seo/metadata';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}) {const {locale}=await params;if(!hasLocale(routing.locales,locale))notFound();const c=copyFor(locale);return pageMetadata(locale,'',c.hero.join(' '),c.intro);}
export default async function Home({params}:{params:Promise<{locale:string}>}) {const {locale}=await params;if(!hasLocale(routing.locales,locale))notFound();setRequestLocale(locale);const origin=siteOrigin();const data={'@context':'https://schema.org','@type':'Organization',name:'ALMORAD AMC',description:copyFor(locale).intro,...(origin?{url:origin,logo:`${origin}/brand/amc-mark.svg`}:{})};return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,'\\u003c')}}/><Landing locale={locale}/></>;}

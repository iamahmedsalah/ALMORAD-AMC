'use client';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
export default function ErrorPage({reset}: {reset: () => void}) {const t = useTranslations('site'); return <section className="container page-intro" role="alert"><h1>{t('error')}</h1><Button onClick={reset}>{t('retry')}</Button></section>;}

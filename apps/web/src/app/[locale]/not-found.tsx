import {getTranslations} from 'next-intl/server';
import {Link} from '@/i18n/navigation';
export default async function NotFound() {const t = await getTranslations('site'); return <section className="container page-intro"><h1>{t('notFound')}</h1><Link href="/">{t('back')}</Link></section>;}

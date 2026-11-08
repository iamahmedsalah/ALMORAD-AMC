import { FaqAccordion } from '@/components/ui/faq-accordion';
import { Container } from '@/components/layout/shell';
import { Link } from '@/i18n/navigation';
import { publicLocale } from '@/lib/public-page';
import { pageMetadata } from '@/lib/seo/metadata';
import { copyFor } from '@/features/marketing/copy';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await publicLocale(params);
  const c = copyFor(locale);
  return pageMetadata(locale, '/faq', c.faq.title, locale === 'ar' ? 'إجابات عن خدماتنا وكيف نبدأ العمل معًا.' : 'Answers about our services and how we start working together.');
}

export default async function FAQ({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await publicLocale(params);
  const c = copyFor(locale);
  return <Container className="studio-public-page faq-page">
    <section className="page-intro">
      <p className="eyebrow">{c.faq.label}</p>
      <h1>{c.faq.title}</h1>
      <p className="intro">{locale === 'ar' ? 'بداية واضحة لتعاون أفضل. إليك إجابات عن خدماتنا وطريقة العمل معًا.' : 'A little clarity before we begin. Explore our services and how we work together.'}</p>
    </section>
    <section className="faq-page-layout" aria-label={c.faq.title}>
      <FaqAccordion items={c.faq.items} locale={locale} />
      <aside className="faq-help">
        <h2>{locale === 'ar' ? 'لديك سؤال آخر؟' : 'Have another question?'}</h2>
        <p>{locale === 'ar' ? 'لنبدأ من التحدي الذي يشغلك ونحدد الخطوة المناسبة معًا.' : 'Start with the challenge on your mind. We can find the right next step together.'}</p>
        <Link href="/booking" className="button button-primary">{locale === 'ar' ? 'احجز لقاءً' : 'Book a meeting'}</Link>
        <Link href="/services">{c.detail.back}</Link>
      </aside>
    </section>
  </Container>;
}

import { FaqAccordion } from '@/components/ui/faq-accordion';
import { Container } from '@/components/layout/shell';
import { Link } from '@/i18n/navigation';
import { publicLocale } from '@/lib/public-page';
import { pageMetadata, siteOrigin } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, faqPageJsonLd, serializeJsonLd } from '@/lib/seo/jsonld';
import { copyFor } from '@/features/marketing/copy';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await publicLocale(params);
  const title = locale === 'ar' ? 'الأسئلة الشائعة' : 'Frequently Asked Questions';
  const description =
    locale === 'ar'
      ? 'إجابات واضحة عن خدمات المراد AMC في التسويق والإعلان وتطوير المواقع، وطريقة تحديد نطاق العمل وحجز استشارة.'
      : 'Answers to common questions about ALMORAD AMC services, project scope, website & e-commerce development, and how to book a consultation.';
  return pageMetadata(locale, '/faq', title, description);
}

export default async function FAQ({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await publicLocale(params);
  const c = copyFor(locale);
  const origin = siteOrigin();
  const schema = origin
    ? [
        faqPageJsonLd(c.faq.items),
        breadcrumbJsonLd([
          { name: locale === 'ar' ? 'الرئيسية' : 'Home', item: `${origin}/${locale}` },
          { name: locale === 'ar' ? 'الأسئلة الشائعة' : 'FAQs', item: `${origin}/${locale}/faq` },
        ]),
      ]
    : [faqPageJsonLd(c.faq.items)];

  return (
    <Container className="studio-public-page faq-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
      <section className="page-intro">
        <p className="eyebrow">{c.faq.label}</p>
        <h1>{c.faq.title}</h1>
        <p className="intro">
          {locale === 'ar'
            ? 'بداية واضحة لتعاون أفضل. إليك إجابات عن خدماتنا وطريقة العمل معًا.'
            : 'A little clarity before we begin. Explore our services and how we work together.'}
        </p>
      </section>
      <section className="faq-page-layout" aria-label={c.faq.title}>
        <FaqAccordion items={c.faq.items} locale={locale} />
        <aside className="faq-help">
          <h2>{locale === 'ar' ? 'لديك سؤال آخر؟' : 'Have another question?'}</h2>
          <p>
            {locale === 'ar'
              ? 'لنبدأ من التحدي الذي يشغلك ونحدد الخطوة المناسبة معًا.'
              : 'Start with the challenge on your mind. We can find the right next step together.'}
          </p>
          <Link href="/booking" className="button button-primary">
            {locale === 'ar' ? 'احجز لقاءً' : 'Book a meeting'}
          </Link>
          <Link href="/services">{c.detail.back}</Link>
        </aside>
      </section>
    </Container>
  );
}

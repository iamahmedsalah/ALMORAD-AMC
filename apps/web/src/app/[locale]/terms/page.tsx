import { officeAddress } from '@amc/shared';
import { Container } from '@/components/layout/shell';
import { Link } from '@/i18n/navigation';
import { publicContact } from '@/lib/public-contact';
import { publicLocale } from '@/lib/public-page';
import { pageMetadata, siteOrigin } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, serializeJsonLd } from '@/lib/seo/jsonld';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await publicLocale(params);
  const title = locale === 'ar' ? 'شروط الخدمة' : 'Terms of Service';
  const description =
    locale === 'ar'
      ? 'شروط استخدام موقع وخدمات استوديو المراد AMC وحجز الاستشارات.'
      : 'Terms of Service for using the ALMORAD AMC website, consultation booking, and studio services.';
  return pageMetadata(locale, '/terms', title, description);
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await publicLocale(params);
  const contact = publicContact(locale);
  const contactEmail = contact.email || 'info@almorad-amc.com';
  const ar = locale === 'ar';
  const title = ar ? 'شروط الخدمة' : 'Terms of Service';
  const origin = siteOrigin();
  const schema = origin
    ? [
        breadcrumbJsonLd([
          { name: ar ? 'الرئيسية' : 'Home', item: `${origin}/${locale}` },
          { name: title, item: `${origin}/${locale}/terms` },
        ]),
      ]
    : [];

  const sections = ar
    ? [
        {
          heading: '1. نطاق الاستخدام',
          text: 'يُتيح هذا الموقع التعرف على خدمات استوديو المراد AMC وإرسال استفسارات المشاريع وحجز مواعيد الاستشارات. باستخدامك للموقع، فإنك توافق على تقديم معلومات دقيقة واستخدام النماذج لأغراض مهنية مشروعة فقط.',
        },
        {
          heading: '2. حجز الاستشارات وتعديلها',
          text: 'تخضع طلبات إعادة الجدولة أو الإلغاء لمراجعة فريق العمل وتأكيده، ولا يُعدّ الوقت المقترح محجوزًا إلا بعد الاعتماد الرسمي وإرسال التأكيد.',
        },
        {
          heading: '3. الملكية الفكرية',
          text: 'جميع العلامات التجارية والنصوص والتصاميم والأصول المرئية المعروضة على هذا الموقع مملوكة لاستوديو المراد AMC أو مرخّصة له، ولا يجوز نسخها أو إعادة استخدامها تجاريًا دون إذن خطي مسبق.',
        },
        {
          heading: '4. التواصل',
          text: `للاستفسارات حول هذه الشروط، يمكنك مراسلتنا عبر ${contactEmail} أو زيارة مقرنا في ${officeAddress[locale]}.`,
        },
      ]
    : [
        {
          heading: '1. Use of Website & Services',
          text: 'This website provides information about ALMORAD AMC Growth & Brand Studio services, project inquiry forms, and consultation booking. By using this site, you agree to provide accurate contact information and use our forms solely for legitimate business inquiries.',
        },
        {
          heading: '2. Consultation Bookings & Changes',
          text: 'Booking change or cancellation requests are reviewed by ALMORAD AMC staff. Proposed reschedule times are not reserved until confirmed by our team.',
        },
        {
          heading: '3. Intellectual Property',
          text: 'All trademarks, copy, artwork, and visual assets on this website belong to ALMORAD AMC or are used under license and may not be reproduced commercially without prior written consent.',
        },
        {
          heading: '4. Contact',
          text: `If you have questions about these Terms, contact us at ${contactEmail} or ${officeAddress[locale]}.`,
        },
      ];

  return (
    <Container className="studio-public-page">
      {schema.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
      )}
      <section className="page-intro">
        <p className="eyebrow">{ar ? 'الشروط والأحكام' : 'TERMS & CONDITIONS'}</p>
        <h1>{title}</h1>
        <p className="intro">
          {ar
            ? 'الشروط المنظمة لاستخدام موقع المراد AMC وخدمات حجز الاستشارات.'
            : 'Terms governing the use of the ALMORAD AMC website and consultation booking services.'}
        </p>
        <p className="staff-note">{ar ? 'آخر تحديث: 15 نوفمبر 2026' : 'Last updated: November 15, 2026'}</p>
      </section>
      <div className="article-content">
        {sections.map((section) => (
          <section key={section.heading} style={{ marginBlockEnd: '2rem' }}>
            <h2>{section.heading}</h2>
            <p>{section.text}</p>
          </section>
        ))}
        <section>
          <p>
            <Link href="/privacy" style={{ textDecoration: 'underline', marginInlineEnd: '1.5rem' }}>
              {ar ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </Link>
            <Link href="/contact" style={{ textDecoration: 'underline' }}>
              {ar ? 'تواصل معنا' : 'Contact us'}
            </Link>
          </p>
        </section>
      </div>
    </Container>
  );
}

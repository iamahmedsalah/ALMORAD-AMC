import { officeAddress, type Locale } from '@amc/shared';
import { Container } from '@/components/layout/shell';
import { Link } from '@/i18n/navigation';
import { publicContact } from '@/lib/public-contact';
import { publicLocale } from '@/lib/public-page';
import { pageMetadata, siteOrigin } from '@/lib/seo/metadata';
import { breadcrumbJsonLd, serializeJsonLd } from '@/lib/seo/jsonld';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await publicLocale(params);
  const title = locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy';
  const description =
    locale === 'ar'
      ? 'سياسة الخصوصية لاستوديو المراد AMC: كيف نجمع بيانات التواصل وحجز المواعيد وتسجيل الدخول بحساب Google ونستخدمها ونحميها.'
      : 'ALMORAD AMC Privacy Policy: how we collect, use, store, and protect contact, consultation booking, and Google Sign-In information.';
  return pageMetadata(locale, '/privacy', title, description);
}

interface PolicySection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

function privacyContent(locale: Locale, email: string | undefined, address: string): {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: PolicySection[];
} {
  const contactEmail = email || 'info@almorad-amc.com';

  if (locale === 'ar') {
    return {
      eyebrow: 'الخصوصية وحماية البيانات',
      title: 'سياسة الخصوصية',
      updated: 'آخر تحديث: 15 نوفمبر 2026',
      intro:
        'توضح هذه السياسة كيف يجمع استوديو المراد AMC («المراد AMC» أو «نحن») البيانات الشخصية ويعالجها ويحميها عند زيارة موقعنا أو حجز استشارة أو التواصل معنا أو استخدام تسجيل الدخول عبر Google للعمليات المعتمدة.',
      sections: [
        {
          heading: '1. المعلومات التي نجمعها',
          paragraphs: [
            'نجمع فقط المعلومات اللازمة لتقديم خدماتنا الاستشارية والتواصل معك وتشغيل بوابة العمل بأمان:',
          ],
          bullets: [
            'بيانات التواصل والحجز: الاسم، البريد الإلكتروني، رقم الهاتف، اسم الشركة (اختياري)، تفاصيل المشروع أو الملاحظات، ونوع الموعد وتوقيته عند تعبئة نموذج التواصل أو حجز استشارة.',
            'بيانات حساب Google (للموظفين المصرّح لهم فقط): عند استخدام «تسجيل الدخول باستخدام Google» أو ربط حساب Google في بوابة الفريق، نستلم معرّف Google الفريد، وعنوان البريد الإلكتروني المُتحقّق منه، وبيانات الملف الشخصي الأساسية للتحقق من الهوية.',
            'البيانات التقنية والأمنية: ملفات تعريف الارتباط الضرورية للجلسات الآمنة (HttpOnly)، وحماية CSRF، وسجلات الحد من المحاولات المتكررة لمنع إساءة الاستخدام.',
          ],
        },
        {
          heading: '2. كيف نستخدم معلوماتك',
          paragraphs: ['نستخدم البيانات التي نجمعها للأغراض المشروعة التالية فقط:'],
          bullets: [
            'الرد على استفسارات المشاريع وإدارة مواعيد الاستشارات وتعديلاتها أو إلغائها بناءً على طلبك.',
            'إرسال رسائل التأكيد والتذكير وروابط إدارة الموعد عبر البريد الإلكتروني.',
            'مصادقة أعضاء فريق المراد AMC المصرّح لهم وتأمين لوحات التحكم الداخلية.',
            'إنشاء اجتماعات Google Meet أو مزامنة المواعيد عبر Google Calendar عند تفعيل التكامل المصرّح به.',
            'تحسين موثوقية الموقع ومنع الاحتيال والوصول غير المصرّح به.',
          ],
        },
        {
          heading: '3. الإفصاح عن استخدام بيانات Google (Limited Use)',
          paragraphs: [
            'يلتزم استخدام المراد AMC ونقله لأي معلومات مستلمة من واجهات برمجة تطبيقات Google بسياسة بيانات مستخدمي خدمات Google API، بما في ذلك متطلبات الاستخدام المحدود (Limited Use).',
            'لا نبيع بيانات مستخدمي Google ولا نشاركها مع أطراف ثالثة لأغراض إعلانية أو تسويقية، ولا نستخدمها لتدريب نماذج ذكاء اصطناعي.',
          ],
        },
        {
          heading: '4. مشاركة البيانات ومزودو الخدمة',
          paragraphs: [
            'نحن لا نبيع بياناتك الشخصية أو نؤجرها لأي جهة. قد تتم معالجة البيانات عبر مزودي بنية تحتية موثوقين بالقدر اللازم لتشغيل الخدمة فقط، مثل مزود قاعدة البيانات الآمنة، وخدمة إرسال البريد الإلكتروني المعاملاتي (Resend)، ونظام إدارة علاقات العملاء (HubSpot) للاستفسارات والمواعيد.',
          ],
        },
        {
          heading: '5. الاحتفاظ بالبيانات والأمان',
          paragraphs: [
            'نحتفظ بسجلات الاستفسارات والمواعيد فقط للمدة اللازمة لتقديم الخدمة والوفاء بالمتطلبات التشغيلية والتدقيقية.',
            'نطبق تشفير النقل (HTTPS/TLS)، وتجزئة كلمات المرور والرموز السرية، وعزل صلاحيات الوصول على مستوى الخادم لحماية بياناتك.',
          ],
        },
        {
          heading: '6. حقوقك والتواصل معنا',
          paragraphs: [
            'يحق لك طلب الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها أو إلغاء ربط حساب Google الخاص بك في أي وقت.',
            `لأي طلبات متعلقة بالخصوصية، تواصل معنا عبر البريد الإلكتروني ${contactEmail} أو في مقرنا: ${address}.`,
          ],
        },
      ],
    };
  }

  return {
    eyebrow: 'PRIVACY & DATA PROTECTION',
    title: 'Privacy Policy',
    updated: 'Last updated: November 15, 2026',
    intro:
      'This Privacy Policy explains how ALMORAD AMC Growth & Brand Studio ("ALMORAD AMC", "we", "us") collects, uses, stores, and protects personal information when you visit our website, submit a contact inquiry, book a consultation, or use Google Sign-In for authorized studio operations.',
    sections: [
      {
        heading: '1. Information We Collect',
        paragraphs: [
          'We collect only the information reasonably necessary to respond to your inquiries, manage consultation bookings, and secure authorized staff access:',
        ],
        bullets: [
          'Contact & Booking Information: Your name, email address, phone number, optional company name, project notes, and preferred meeting format and time when you submit a contact or booking form.',
          'Google Account Data (Authorized Staff Only): When an authorized staff member signs in with Google or links a Google account, we receive their verified Google email address, unique Google account identifier, and basic profile information solely for authentication and account linking.',
          'Technical & Security Data: Strictly necessary HttpOnly session cookies, CSRF tokens, and rate-limiting records required to protect against abuse and unauthorized access.',
        ],
      },
      {
        heading: '2. How We Use Your Information',
        paragraphs: ['We use collected information strictly for the following purposes:'],
        bullets: [
          'Responding to project inquiries and scheduling, confirming, or updating consultation appointments.',
          'Sending transactional confirmation, reminder, and appointment-management emails.',
          'Authenticating authorized ALMORAD AMC staff and enforcing role-based access controls.',
          'Creating authorized Google Meet / Calendar events for online consultations when enabled.',
          'Maintaining platform security, audit logs, and service reliability.',
        ],
      },
      {
        heading: '3. Google API Services User Data Policy (Limited Use)',
        paragraphs: [
          'ALMORAD AMC’s use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.',
          'We do not sell Google user data, use it for advertising or marketing profiling, or share it with unauthorized third parties.',
        ],
      },
      {
        heading: '4. Data Sharing & Infrastructure Providers',
        paragraphs: [
          'We never sell or rent your personal information. Data is processed only by essential infrastructure providers under confidentiality and security obligations, including encrypted PostgreSQL hosting, transactional email delivery (Resend), and CRM synchronization (HubSpot) for inquiries and bookings.',
        ],
      },
      {
        heading: '5. Data Retention & Security',
        paragraphs: [
          'We retain inquiry and booking records only as long as needed to deliver our services and maintain operational and security audit trails. All traffic is encrypted via HTTPS/TLS, sensitive credentials and reset codes are cryptographically hashed, and staff permissions are enforced server-side.',
        ],
      },
      {
        heading: '6. Your Rights & Contact Information',
        paragraphs: [
          'You may request access to, correction of, or deletion of your personal data, or disconnect a linked Google account at any time.',
          `For privacy requests or questions, contact us at ${contactEmail} or at our studio address: ${address}.`,
        ],
      },
    ],
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await publicLocale(params);
  const contact = publicContact(locale);
  const content = privacyContent(locale, contact.email, officeAddress[locale]);
  const origin = siteOrigin();
  const schema = origin
    ? [
        breadcrumbJsonLd([
          { name: locale === 'ar' ? 'الرئيسية' : 'Home', item: `${origin}/${locale}` },
          { name: content.title, item: `${origin}/${locale}/privacy` },
        ]),
      ]
    : [];

  return (
    <Container className="studio-public-page">
      {schema.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
      )}
      <section className="page-intro">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p className="intro">{content.intro}</p>
        <p className="staff-note">{content.updated}</p>
      </section>
      <div className="article-content">
        {content.sections.map((section) => (
          <section key={section.heading} style={{ marginBlockEnd: '2rem' }}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets && (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <section>
          <p>
            <Link href="/terms" style={{ textDecoration: 'underline', marginInlineEnd: '1.5rem' }}>
              {locale === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
            </Link>
            <Link href="/contact" style={{ textDecoration: 'underline' }}>
              {locale === 'ar' ? 'تواصل معنا' : 'Contact us'}
            </Link>
          </p>
        </section>
      </div>
    </Container>
  );
}

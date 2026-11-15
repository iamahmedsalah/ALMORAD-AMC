import { officeLocation } from '@amc/shared';
import { Container } from '@/components/layout/shell';
import { OfficeMap } from '@/components/ui/office-map';
import { Link } from '@/i18n/navigation';
import { publicLocale } from '@/lib/public-page';
import { pageMetadata } from '@/lib/seo/metadata';
import { copyFor } from '@/features/marketing/copy';
import { ContactForm } from '@/features/contact/contact-form';
import { publicContact } from '@/lib/public-contact';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await publicLocale(params);
  return pageMetadata(
    locale,
    '/contact',
    locale === 'ar' ? 'تواصل معنا في الإسكندرية' : 'Contact our Alexandria studio',
    locale === 'ar'
      ? 'تواصل مع المراد AMC لمناقشة التسويق والإعلان والاستشارات وتطوير المواقع. اعرف عنوان مكتبنا في سموحة بالإسكندرية واتجاهات الوصول، أو أرسل استفسارك.'
      : 'Contact ALMORAD AMC about marketing, advertising, consulting or web development. Find our Smouha, Alexandria office and directions, or send an inquiry.'
  );
}

export default async function Contact({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await publicLocale(params);
  const ar = locale === 'ar';
  const c = copyFor(locale);
  const contact = publicContact(locale);
  const address = contact.address || `${officeLocation.address[locale]} · ${officeLocation.locality[locale]}`;
  const mapsUrl = contact.maps || officeLocation.directionsUrl;

  return (
    <Container className="studio-public-page">
      <section className="page-intro">
        <p className="eyebrow">ALMORAD AMC</p>
        <h1>{c.contactPage.title}</h1>
        <p className="intro">{c.contactPage.intro}</p>
      </section>
      <div className="contact-page-grid">
        <ContactForm locale={locale} />
        <aside className="notice-panel" aria-labelledby="contact-options-title">
          <h2 id="contact-options-title">{ar ? 'لنحدد نقطة البداية.' : 'Find your starting point.'}</h2>
          <p>
            {ar
              ? 'شاركنا هدفك والتحدي الذي تواجهه. يمكنك إرسال رسالة، أو استكشاف الخدمات وخيارات الاجتماعات.'
              : 'Share your goal and the challenge ahead. Send a message, or explore our services and meeting options.'}
          </p>
          <dl className="contact-details">
            {contact.email && (
              <div>
                <dt>{c.contactPage.email}</dt>
                <dd>
                  <a dir="ltr" href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                </dd>
              </div>
            )}
            {contact.phone && (
              <div>
                <dt>{c.contactPage.phone}</dt>
                <dd>
                  <a dir="ltr" href={`tel:${contact.phone}`}>
                    {contact.phone}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt>{c.contactPage.office}</dt>
              <dd>{address}</dd>
            </div>
            <div>
              <dt>{c.contactPage.directions}</dt>
              <dd>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  {c.contactPage.directions} ↗
                </a>
              </dd>
            </div>
          </dl>
          <div className="contact-options">
            <Link className="button button-secondary" href="/booking">
              {ar ? 'خيارات الاجتماعات' : 'Meeting options'}
              <span aria-hidden="true">↗</span>
            </Link>
            <Link className="text-link" href="/services">
              {c.expertise.link}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </aside>
      </div>
      <OfficeMap locale={locale} address={address} directionsUrl={mapsUrl} defaultExpanded />
    </Container>
  );
}

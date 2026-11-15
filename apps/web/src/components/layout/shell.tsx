import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import {officeAddress,type Locale} from '@amc/shared';
import {SolarIcon} from '@/components/ui/solar-icon';
import {publicContact} from '@/lib/public-contact';
import { Link } from '@/i18n/navigation';
import { bookingCopy } from '@/features/booking/copy';
import { copyFor } from '@/features/marketing/copy';
import { Controls } from './controls';
import { SideNavbar } from './side-navbar';
import { BrandSignature } from './brand-signature';
import { SocialDisclosure } from './social-disclosure';
import { socialProfiles } from '@/lib/social-profiles';
import { BackToTop } from './back-to-top';

export function Container({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`container ${className}`}>{children}</div>;
}

function LogoLockup() {
  return <span className="brand-lockup footer-lockup">
    <Image src="/brand/footer-logo-on-light.svg" alt="" width={1370} height={286} className="brand-lockup-light"  />
    <Image src="/brand/footer-logo-on-dark.svg" alt="" width={1370} height={286} className="brand-lockup-dark"  />
  </span>;
}

export async function Header() {
  const t = await getTranslations('site');
  const locale = (await getLocale()) as Locale;
  const c = copyFor(locale);
  const bCopy = bookingCopy(locale);

  const links = [
    { href: '/services', label: t('services') },
    { href: '/about', label: c.nav.about },
    { href: '/work', label: c.nav.work },
    { href: '/team', label: locale === 'ar' ? 'تعرّف على الفريق' : 'Meet the team' },
    { href: '/contact', label: c.nav.contact },
    { href: '/faq', label: t('faq') },
    { href: '/booking', label: bCopy.title },
  ];

  return (
    <>
      <a href="#main" className="skip-link rounded-squircle-sm">
        {t('skip')}
      </a>
      <header className="site-header">
        <Container className="header-inner">
          <Link href="/" aria-label="ALMORAD AMC" className="brand">
            <BrandSignature locale={locale} onOrange />
          </Link>

          <nav className="desktop-nav" aria-label={t('menu')}>
            {links.filter(item => !['/faq', '/booking'].includes(item.href)).map((item) => (
              <Link key={item.href} href={item.href} className="rounded-squircle-md">
                {item.label}
              </Link>
            ))}
          </nav>

          <Link href="/booking" className="button button-primary header-booking">{locale === 'ar' ? 'احجز لقاءً' : 'Book a meeting'}</Link>
          <Controls />

          <SideNavbar
            menuLabel={t('menu')}
            brandName={locale === 'ar' ? '\u0627\u0644\u0645\u0631\u0627\u062f AMC' : 'ALMORAD AMC'}
            locale={locale}
            ctaLabel={bCopy.title}
            links={links}
          />
        </Container>
      </header>
      <SocialDisclosure profiles={socialProfiles()} locale={locale} variant="sidebar" />
      <BackToTop locale={locale} />
    </>
  );
}

export async function Footer() {
  const t = await getTranslations('site');
  const locale = (await getLocale()) as Locale;
  const c = copyFor(locale);
  const b = bookingCopy(locale);
  const contact=publicContact(locale);
  return (
    <footer className="studio-footer">
      <Container>
        <div className="footer-top-grid">
          <div className="footer-identity">
            <Link href="/" aria-label="ALMORAD AMC"><LogoLockup /></Link>
            <p>{c.footer}</p>
            <address className="footer-contact"><p><SolarIcon name="map-point-linear"/>{officeAddress[locale]}</p>{contact.phone&&<a href={'tel:'+contact.phone.replace(/[^+0-9]/g,'')}><SolarIcon name="phone-linear"/><bdi>{contact.phone}</bdi></a>}{contact.email&&<a href={'mailto:'+contact.email}><SolarIcon name="letter-linear"/><bdi>{contact.email}</bdi></a>}</address>
          </div>
          <div className="footer-quick-actions">
            <Link href="/booking" className="button button-primary rounded-squircle-md">{b.title}<span aria-hidden="true">&#8599;</span></Link>
            <SocialDisclosure profiles={socialProfiles()} locale={locale} />
          </div>
        </div>
        <div className="footer-bottom-row">
          <small>© {new Date().getFullYear()} ALMORAD AMC · <a href="/third-party-notices.txt">{locale === 'ar' ? 'تراخيص الأصول' : 'Asset licences'}</a></small>
          <nav aria-label={t('menu')}>
            <Link href="/services">{t('services')}</Link>
            <Link href="/about">{c.nav.about}</Link>
            <Link href="/work">{c.nav.work}</Link>
            <Link href="/team">{locale === 'ar' ? 'الفريق' : 'Team'}</Link>
            <Link href="/contact">{c.nav.contact}</Link>
            <Link href="/booking/manage">{locale==='ar'?'موعدك':'Your appointment'}</Link>
            <Link href="/faq">{t('faq')}</Link>
            <Link href="/staff/login" rel="nofollow">{locale === 'ar' ? 'دخول الفريق' : 'Staff sign in'}</Link>
          </nav>
        </div>
      </Container>
    </footer>
  );
}

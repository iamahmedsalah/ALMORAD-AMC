import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Locale } from '@amc/shared';
import { routing } from '@/i18n/routing';
import { Providers } from '@/components/layout/providers';
import { Header, Footer } from '@/components/layout/shell';
import { PublicChrome } from '@/components/layout/public-chrome';
import { Preloader } from '@/components/layout/preloader';
import { ConsoleBanner } from '@/components/ConsoleBanner';
import { ThemeInit } from '@/components/layout/theme-init';
import '@/styles/globals.css';

export const metadata = {
  icons: {
    icon: [
      // Google Search requires square multiples of 48px declared before media-scoped SVGs.
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-light.svg', media: '(prefers-color-scheme: light)', type: 'image/svg+xml' },
      { url: '/favicon-navy.svg', media: '(prefers-color-scheme: dark)', type: 'image/svg+xml' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >

      <head>
        <meta httpEquiv="content-language" content={locale === 'ar' ? 'ar-EG' : 'en-EG'} />
        <ThemeInit />
      </head>
      <body>
        <noscript><style>{'.amc-preloader{display:none!important}'}</style></noscript>
        <ConsoleBanner />
        <NextIntlClientProvider>
          <Providers dir={dir}>
            <Preloader locale={locale as Locale} />
            <PublicChrome header={<Header />} footer={<Footer />}>
              {children}
            </PublicChrome>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

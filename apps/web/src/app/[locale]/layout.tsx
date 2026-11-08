import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Locale } from '@amc/shared';
import { routing } from '@/i18n/routing';
import { Providers } from '@/components/layout/providers';
import { Header, Footer } from '@/components/layout/shell';
import { Preloader } from '@/components/layout/preloader';
import { ConsoleBanner } from '@/components/ConsoleBanner';
import { ThemeInit } from '@/components/layout/theme-init';
import '@/styles/globals.css';

export const metadata = {
  icons: {
    icon: [
      { url: '/favicon-light.svg', media: '(prefers-color-scheme: light)', type: 'image/svg+xml' },
      { url: '/favicon-orange.svg', media: '(prefers-color-scheme: dark)', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: [
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
      suppressHydrationWarning
    >

      <head><ThemeInit /></head>
      <body>
        <noscript><style>{'.amc-preloader{display:none!important}'}</style></noscript>
        <ConsoleBanner />
        <NextIntlClientProvider>
          <Providers dir={dir}>
            <Preloader locale={locale as Locale} />
            <Header />
            <main id="main" tabIndex={-1}>
              {children}
            </main>
            <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

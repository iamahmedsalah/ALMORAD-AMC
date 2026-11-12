'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { SolarIcon } from '@/components/ui/solar-icon';

const subscribe = () => () => {};
const choices = ['system', 'light', 'dark'] as const;

export function Controls() {
  const t = useTranslations('site');
  const locale = useLocale();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const ready = mounted && choices.includes(theme as typeof choices[number]);
  const active = mounted && choices.includes(theme as typeof choices[number]) ? theme as typeof choices[number] : 'system';
  const next = choices[(choices.indexOf(active) + 1) % choices.length]!;
  const nextLocale = locale === 'en' ? 'ar' : 'en';
  const label = `${t('theme')}: ${t(active)} → ${t(next)}`;

  return (
    <div className="controls">
      <Link href={pathname} locale={nextLocale} lang={nextLocale} data-locale={nextLocale}
        aria-label={t('language')} title={t('language')} className="locale-link locale-switch-btn rounded-squircle-md"
        onClick={() => window.dispatchEvent(new CustomEvent('amc:locale-switch', { detail: { nextLocale } }))}>
        <SolarIcon name="global-linear" /><span>{t('language')}</span>
      </Link>
      <button type="button" className="theme-cycle-button rounded-squircle-md"
        data-theme-choice={active} data-theme-ready={ready} aria-busy={!ready} disabled={!ready} aria-label={label} title={label}
        onClick={() => setTheme(next)}>
        <span key={active} className="theme-icon-motion"><SolarIcon name={active === 'system' ? 'monitor-linear' : active === 'light' ? 'sun-2-linear' : 'moon-stars-linear'} /></span>
      </button>
    </div>
  );
}

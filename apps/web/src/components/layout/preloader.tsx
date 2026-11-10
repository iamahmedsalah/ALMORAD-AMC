'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import type { Locale } from '@amc/shared';

const subscribePhone = (listener: () => void) => {
  const query = window.matchMedia('(max-width: 767px)');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
};
const phoneSnapshot = () => window.matchMedia('(max-width: 767px)').matches;

export function Preloader({ locale }: { locale: Locale }) {
  return <PreloaderCycle key={locale} />;
}

function PreloaderCycle() {
  const t = useTranslations('site');
  const { resolvedTheme } = useTheme();
  const phone = useSyncExternalStore(subscribePhone, phoneSnapshot, () => false);
  const [hidden, setHidden] = useState(false);
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    let timer = window.setTimeout(() => setHidden(true), 680);
    const restart = () => {
      window.clearTimeout(timer);
      setHidden(false);
      setCycle(value => value + 1);
      timer = window.setTimeout(() => setHidden(true), 680);
    };
    window.addEventListener('amc:locale-switch', restart);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('amc:locale-switch', restart);
    };
  }, []);
  return (
    <div className="amc-preloader" data-hidden={hidden ? 'true' : 'false'}
      data-variant={phone && resolvedTheme === 'light' ? 'phone-light-pulse' : 'studio-3d'}
      aria-hidden={hidden} role="status" aria-live="polite">
      <div className="amc-preloader-inner" key={cycle}>
        <div className="studio-loader-mark" aria-hidden="true">
          <Image unoptimized src="/brand/amc-mark.svg" className="brand-mark-light" width={160} height={73} alt="" loading="eager" />
          <Image unoptimized src="/brand/amc-mark-white.svg" className="brand-mark-dark" width={160} height={73} alt="" loading="eager" />
        </div>
        <div className="studio-loader-track" aria-hidden="true"><span /></div>
        <div className="amc-preloader-label"><strong>ALMORAD AMC</strong><small>{t('tagline')}</small></div>
      </div>
    </div>
  );
}

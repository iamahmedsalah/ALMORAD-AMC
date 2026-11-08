'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function BackToTop({ locale }: { locale: string }) {
  const pathname = usePathname();
  return <ScrollReturn key={pathname} locale={locale} />;
}

function ScrollReturn({ locale }: { locale: string }) {
  const [visible, setVisible] = useState(false);
  const [returningAvailable, setReturningAvailable] = useState(false);
  const origin = useRef<number | null>(null);
  const phase = useRef<'idle' | 'up' | 'top' | 'returning'>('idle');
  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      if (phase.current === 'up' && y < 8) phase.current = 'top';
      if (phase.current === 'top' && y > 80) {
        origin.current = null; phase.current = 'idle'; setReturningAvailable(false);
      }
      if (phase.current === 'returning' && origin.current !== null) {
        const target = Math.min(origin.current, Math.max(0, document.documentElement.scrollHeight - innerHeight));
        if (Math.abs(y - target) < 8) {
          origin.current = null; phase.current = 'idle'; setReturningAvailable(false);
        }
      }
      setVisible(y > 600 || origin.current !== null);
    };
    update(); window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  const label = returningAvailable
    ? locale === 'ar' ? 'العودة إلى موضع القراءة' : 'Return to reading position'
    : locale === 'ar' ? 'العودة إلى الأعلى' : 'Back to top';
  return <button className="back-to-top" type="button" hidden={!visible} data-return-available={returningAvailable}
    aria-label={label} title={label}
    onClick={() => {
      const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
      if (origin.current !== null && phase.current !== 'returning') {
        phase.current = 'returning';
        window.scrollTo({ top: Math.min(origin.current, Math.max(0, document.documentElement.scrollHeight - innerHeight)), behavior });
      } else {
        origin.current = window.scrollY; phase.current = 'up'; setReturningAvailable(true);
        window.scrollTo({ top: 0, behavior });
      }
    }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 12 6-6 6 6M12 6v14" /></svg>
    <span className="scroll-return-label">{label}</span>
  </button>;
}

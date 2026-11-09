'use client';

import { useEffect, useId, useRef, useState } from 'react';

export type SocialProfile = { name: string; href: string | null; demo?: boolean; icon: 'linkedin' | 'facebook' | 'instagram' | 'x' | 'tiktok' | 'youtube' };

function SocialIcon({ name }: { name: SocialProfile['icon'] }) {
  const paths = {
    x: 'M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.5 5.4 22H2.2l8.3-9.5L.8 2h6.5l4.5 6.8L18.9 2Zm-1.1 18h1.7L6.3 4H4.5l13.3 16Z',
    linkedin: 'M5 9H2v13h3V9ZM3.5 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM22 14.5C22 10.5 20 9 17.5 9c-1.8 0-3 1-3.5 1.8V9h-3v13h3v-7c0-1.7.8-2.8 2.3-2.8s2.2 1 2.2 2.8v7H22v-7.5Z',
    facebook: 'M14 22v-9h3l.5-4H14V7c0-1 .3-2 2-2h2V1.5C17 1.2 16 1 15 1c-3 0-5 2-5 5v3H7v4h3v9h4Z',
    instagram: 'M7 2a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5H7Zm0 2h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Zm5 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm5.5-3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
    tiktok: 'M14 2h3c.3 2.5 1.8 4 4 4.3V10a9 9 0 0 1-4-1.3V16a6 6 0 1 1-6-6v3.5a2.5 2.5 0 1 0 3 2.5V2Z',
    youtube: 'M21.6 6.2c-.3-1-1-1.7-2-2C17.8 3.7 12 3.7 12 3.7s-5.8 0-7.6.5c-1 .3-1.7 1-2 2C2 8 2 12 2 12s0 4 .4 5.8c.3 1 1 1.7 2 2 1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5c1-.3 1.7-1 2-2C22 16 22 12 22 12s0-4-.4-5.8ZM10 16V8l6 4-6 4Z',
  };
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}

export function SocialDisclosure({ profiles, locale, variant = 'footer' }: { profiles: SocialProfile[]; locale: string; variant?: 'footer' | 'sidebar' }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const ar = locale === 'ar';
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div ref={root} className={`social-disclosure social-disclosure-${variant}`} data-open={open} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="social-trigger" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      {variant === 'sidebar' && <svg className="social-sidebar-symbol" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
        <g className="social-symbol-share"><circle cx="6" cy="12" r="3" /><circle cx="18" cy="5" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.5 10.5 7-4m-7 7 7 4" /></g>
        <g className="social-symbol-close" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></g>
      </svg>}
      <span>{ar ? 'تابعنا' : 'Follow us'}</span><span className="social-toggle" aria-hidden="true">+</span>
    </button>
    <div id={id} className="social-tray" inert={!open} aria-hidden={!open}>
      {profiles.map((profile, index) => <span key={profile.icon} className="social-item" data-platform={profile.icon} style={{ '--social-index': index } as React.CSSProperties}>
        {profile.href ? <a href={profile.href} target="_blank" rel="noopener noreferrer" aria-label={`${profile.name}${profile.demo ? ` — ${ar ? 'تجريبي' : 'demo'}` : ''} (${ar ? 'نافذة جديدة' : 'new window'})`} title={`${profile.name}${profile.demo ? ` — ${ar ? 'تجريبي' : 'demo'}` : ''}`}><SocialIcon name={profile.icon} />{variant === 'sidebar' && <span className="social-platform-name">{profile.name}</span>}{profile.demo && <small className="social-demo">{ar ? 'تجريبي' : 'demo'}</small>}</a>
          : <button type="button" disabled aria-label={`${profile.name} — ${ar ? 'الرابط غير متاح حاليًا' : 'profile unavailable'}`} title={`${profile.name} — ${ar ? 'الرابط غير متاح حاليًا' : 'profile unavailable'}`}><SocialIcon name={profile.icon} /></button>}
      </span>)}
    </div>
  </div>;
}

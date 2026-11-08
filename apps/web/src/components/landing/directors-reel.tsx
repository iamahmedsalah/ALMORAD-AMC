'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Locale } from '@amc/shared';

export function DirectorsReel({ children, locale, count }: { children: ReactNode; locale: Locale; count: number }) {
  const root = useRef<HTMLDivElement>(null);
  const jump = useRef<((index: number) => void) | null>(null);
  const [active, setActive] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [scrollDriven, setScrollDriven] = useState(false);
  const isAr = locale === 'ar';

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger'), document.fonts.ready]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      media.add({ motion: '(prefers-reduced-motion: no-preference)', tall: '(min-height: 740px)', desktop: '(min-width: 768px)', phone: '(max-width: 767px)' }, mediaContext => {
        if (!mediaContext.conditions?.motion || !mediaContext.conditions.desktop) return;
        const element = root.current!;
        const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-director-slide]'));
        const manualSlider = () => {
          const track = element.querySelector<HTMLElement>('.directors-reel-track')!;
          element.dataset.reelActive = 'manual';
          setEnabled(true);
          setScrollDriven(false);
          const update = () => {
            const frame = track.getBoundingClientRect();
            const center = frame.x + frame.width / 2;
            let closest = 0;
            let distance = Infinity;
            cards.forEach((card, index) => {
              const box = card.getBoundingClientRect();
              const delta = Math.abs(box.x + box.width / 2 - center);
              if (delta < distance) { distance = delta; closest = index; }
            });
            setActive(closest);
          };
          jump.current = index => cards[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          track.addEventListener('scroll', update, { passive: true });
          update();
          return () => {
            track.removeEventListener('scroll', update);
            jump.current = null;
            setEnabled(false);
            delete element.dataset.reelActive;
          };
        };
        if (!mediaContext.conditions.tall) return manualSlider();
        element.dataset.reelActive = 'true';
        const height = Math.max(...cards.map(card => card.offsetHeight));
        // Fall back to the readable grid if a translated card cannot fit.
        const heading = element.querySelector<HTMLElement>('.directors-reel-heading')!.offsetHeight;
        if (height + heading + 160 > window.innerHeight) return manualSlider();
        element.style.setProperty('--director-height', `${height}px`);
        const direction = isAr ? -1 : 1;
        gsap.set(cards, { transformPerspective: 1200 });
        const accents = cards.map(card => card.querySelector('.team-career-accents'));
        let current = -1;
        let transition: ReturnType<typeof gsap.timeline> | undefined;
        const show = (index: number) => {
          if (index === current) return;
          transition?.kill();
          const outgoing = cards[current];
          const incoming = cards[index]!;
          const travel = direction * (index > current ? 1 : -1);
          gsap.set(cards.filter(card => card !== outgoing && card !== incoming), { autoAlpha: 0, x: 0, rotationY: 0, scale: 1 });
          if (!outgoing) gsap.set(incoming, { autoAlpha: 1, x: 0, rotationY: 0, scale: 1 });
          else {
            gsap.set(incoming, { autoAlpha: 0, x: -48 * travel, rotationY: -12 * travel, scale: .985 });
            gsap.set(accents[index]!, { rotation: -8 * direction, y: 6 });
            transition = gsap.timeline()
              .to(outgoing, { autoAlpha: 0, x: 48 * travel, rotationY: 10 * travel, duration: .22, ease: 'power2.in' }, 0)
              .to(incoming, { autoAlpha: 1, x: 0, rotationY: 0, scale: 1, duration: .42, ease: 'power3.out' }, .12)
              .to(accents[index]!, { rotation: 4 * direction, y: -4, duration: .55, ease: 'power2.out' }, .12);
          }
          current = index;
          setActive(index);
        };
        // Scroll selects a card; a short time-based transition always settles
        // at center, even if the reader stops halfway through a scroll segment.
        const trigger = ScrollTrigger.create({
          trigger: element, start: 'top 110px', end: 'bottom bottom', invalidateOnRefresh: true,
          onUpdate: self => show(Math.min(cards.length - 1, Math.round(self.progress * (cards.length - 1)))),
          onRefresh: self => show(Math.min(cards.length - 1, Math.round(self.progress * (cards.length - 1)))),
        });
        show(Math.min(cards.length - 1, Math.round(trigger.progress * (cards.length - 1))));
        jump.current = index => window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * index / (cards.length - 1), behavior: 'smooth' });
        setEnabled(true);
        setScrollDriven(true);
        // Other progressive landing sections can change the document height
        // after this island mounts. Keep scroll boundaries tied to final layout.
        let refreshFrame = 0;
        const refresh = () => {
          cancelAnimationFrame(refreshFrame);
          refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
        };
        const observer = new ResizeObserver(refresh);
        observer.observe(document.body);
        refresh();
        return () => {
          cancelAnimationFrame(refreshFrame);
          observer.disconnect();
          jump.current = null;
          setEnabled(false);
          setScrollDriven(false);
          trigger.kill();
          transition?.kill();
          gsap.set(cards, { clearProps: 'all' });
          gsap.set(accents, { clearProps: 'all' });
          delete element.dataset.reelActive;
          element.style.removeProperty('--director-height');
        };
      });
      dispose = () => media.revert();
    }).catch(() => { /* Retain the readable HTML grid if motion cannot load. */ });
    return () => { cancelled = true; dispose?.(); };
  }, [isAr]);

  return <div id="directors" ref={root} className="directors-reel" role="region" aria-labelledby="directors-title">
    <div className="directors-reel-stage">
      <div className="directors-reel-heading">
        <div>
          <p className="eyebrow">{isAr ? 'الفريق المتخصص' : 'THE SPECIALISTS'}</p>
          <h3 id="directors-title">{isAr ? 'مديرو التخصصات' : 'Directors & discipline leads'}</h3>
          <p className="directors-reel-hint">{scrollDriven ? (isAr ? 'مرّر للتعرّف على الفريق، بطاقة تلو الأخرى.' : 'Scroll to meet the team, one card at a time.') : enabled ? (isAr ? 'اسحب البطاقات أو استخدم الأسهم للتعرّف على الفريق.' : 'Swipe the cards or use the arrows to meet the team.') : (isAr ? 'خمسة تخصصات. فريق واحد.' : 'Five disciplines. One team.')}</p>
        </div>
        {enabled && <div className="directors-reel-controls">
          <button type="button" className="button button-secondary" disabled={active === 0} onClick={() => jump.current?.(active - 1)} aria-label={isAr ? 'التخصص السابق' : 'Previous discipline'}>{isAr ? '→' : '←'}</button>
          <span aria-label={isAr ? 'البطاقة الحالية' : 'Current card'}><bdi>{String(active + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</bdi></span>
          <button type="button" className="button button-secondary" disabled={active === count - 1} onClick={() => jump.current?.(active + 1)} aria-label={isAr ? 'التخصص التالي' : 'Next discipline'}>{isAr ? '←' : '→'}</button>
        </div>}
      </div>
      <div className="directors-reel-gallery">
        <div className="lp-team-grid-5 directors-reel-track" role="group" tabIndex={enabled && !scrollDriven ? 0 : undefined} aria-label={isAr ? 'بطاقات التخصصات' : 'Discipline cards'}>{children}</div>
      </div>
      {enabled && <div className="directors-reel-progress" aria-hidden="true"><span style={{ transform: `scaleX(${(active + 1) / count})` }} /></div>}
    </div>
  </div>;
}

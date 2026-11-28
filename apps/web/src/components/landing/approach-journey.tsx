'use client';

import Image from 'next/image';
import {useEffect, useRef} from 'react';

/** A single, viewport-triggered journey; all four steps remain readable without motion. */
export function ApproachJourney({steps}: {steps: readonly (readonly string[])[]}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{gsap}, {ScrollTrigger}]) => {
      if (cancelled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const context = gsap.context(() => {
          const cards = Array.from(root.current!.querySelectorAll<HTMLElement>('.approach-card'));
          const mark = root.current!.querySelector<HTMLElement>('.approach-traveller');
          if (!mark || cards.length !== 4) return;
          const position = (index: number) => {
            const card = cards[index];
            return card ? {x: card.offsetLeft + card.offsetWidth - 110, y: card.offsetTop + 18} : {x: 0, y: 0};
          };
          gsap.set(mark, {...position(0), autoAlpha: 0, scale: .86});
          const journey = gsap.timeline({scrollTrigger: {trigger: root.current, start: 'top 75%', once: true, invalidateOnRefresh: true}});
          journey.to(mark, {autoAlpha: .88, scale: 1, duration: .28, ease: 'power2.out'});
          cards.forEach((card, index) => {
            if (index) {
              const travel = {progress: 0};
              journey.to(travel, {progress: 1, duration: .82, ease: 'power2.inOut', onUpdate: () => {
                const from = position(index - 1);
                const to = position(index);
                const progress = travel.progress;
                gsap.set(mark, {
                  x: from.x + (to.x - from.x) * progress,
                  y: from.y + (to.y - from.y) * progress - Math.sin(progress * Math.PI) * 42,
                  scale: 1 + Math.sin(progress * Math.PI) * .08,
                });
              }});
            }
            journey.call(() => {
              cards.forEach(item => {delete item.dataset.active;});
              card.dataset.visited = 'true';
              card.dataset.active = 'true';
            }).fromTo(card.querySelector('h3'), {scale: 1}, {scale: 1.04, duration: .18, repeat: 1, yoyo: true, ease: 'power2.out'})
              .to({}, {duration: .16});
          });
          journey.to(mark, {autoAlpha: 0, scale: .88, duration: .3, ease: 'power2.in'});
          // Reflow keeps the current landing point aligned without replaying the sequence.
          const observer = new ResizeObserver(() => {
            if (journey.progress() === 0) gsap.set(mark, position(0));
          });
          observer.observe(root.current!);
          return () => observer.disconnect();
        }, root);
        return () => context.revert();
      });
      dispose = () => media.revert();
    }).catch(() => { /* The server-rendered steps need no animation runtime. */ });
    return () => {cancelled = true; dispose?.();};
  }, []);
  return <div className="approach-journey" ref={root}>
    <div className="approach-traveller brand-lockup" aria-hidden="true">
      <Image src="/brand/amc-mark.svg" width={72} height={27} alt="ALMORAD AMC emblem" className="brand-lockup-light" />
      <Image src="/brand/amc-mark-on-dark.svg" width={72} height={27} alt="ALMORAD AMC emblem" className="brand-lockup-dark" />
    </div>
    <ol className="approach-grid grid sm:grid-cols-2 gap-6">
      {steps.map(([title, body]) => <li key={title} className="approach-card glass-surface rounded-squircle-lg p-6 sm:p-8">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-[var(--fg-muted)] leading-relaxed">{body}</p>
      </li>)}
    </ol>
  </div>;
}

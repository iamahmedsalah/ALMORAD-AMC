'use client';

import { useEffect, useRef } from 'react';

export function LandingMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    Promise.all([import('gsap'), import('gsap/ScrollTrigger'), document.fonts.ready])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled || !root.current) return;
        gsap.registerPlugin(ScrollTrigger);

        const media = gsap.matchMedia();
        media.add('(prefers-reduced-motion: no-preference)', () => {
          const stackMedia = gsap.matchMedia();
          const context = gsap.context(() => {
            // 1. Hero entrance choreography
            gsap.fromTo(
              '[data-hero-line]',
              { y: 34, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.95,
                stagger: 0.12,
                ease: 'power3.out',
                clearProps: 'transform,opacity',
              },
            );

            // 2. Masked line-by-line typography reveal
            gsap.utils.toArray<HTMLElement>('[data-lines]').forEach((block) => {
              const inners = block.querySelectorAll('.line-inner');
              if (!inners.length) return;
              gsap.fromTo(
                inners,
                { yPercent: 105, opacity: 0 },
                {
                  yPercent: 0,
                  opacity: 1,
                  duration: 0.85,
                  stagger: 0.08,
                  ease: 'power3.out',
                  scrollTrigger: {
                    trigger: block,
                    start: 'top 90%',
                    toggleActions: 'play none none reverse',
                  },
                },
              );
            });

            // 3. Hero studio frames subtle parallax
            gsap.utils.toArray<HTMLElement>('[data-hero-frame]').forEach((frame, i) => {
              gsap.to(frame, {
                y: (i + 1) * -16,
                ease: 'none',
                scrollTrigger: {
                  trigger: '#chapter-hero',
                  start: 'top top',
                  end: 'bottom top',
                  scrub: 0.5,
                },
              });
            });

            // 4. Premotio-style scrubbed section show & hide transitions
            gsap.utils.toArray<HTMLElement>('[data-chapter-panel]').forEach((panel) => {
              const tl = gsap.timeline({
                scrollTrigger: {
                  trigger: panel,
                  start: 'top 92%',
                  end: 'bottom 8%',
                  scrub: 0.5,
                },
              });

              tl.fromTo(
                panel,
                { opacity: 1, y: 32, scale: 0.96 },
                { opacity: 1, y: 0, scale: 1, duration: 0.24, ease: 'power2.out' },
              )
                .to(panel, { opacity: 1, y: 0, scale: 1, duration: 0.52 })
                .to(panel, {
                  opacity: 1,
                  y: -36,
                  scale: 0.97,
                  duration: 0.24,
                  ease: 'power2.in',
                });
            });

            // 5. Premotio-style 3D card scroll reveal & exit behavior
            gsap.utils.toArray<HTMLElement>('[data-scroll-card]').forEach((card, index) => {
              gsap.fromTo(
                card,
                {
                  opacity: 1,
                  y: 44,
                  scale: 0.95,
                  rotateX: 6,
                  transformPerspective: 1000,
                },
                {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  rotateX: 0,
                  duration: 0.75,
                  delay: (index % 3) * 0.06,
                  ease: 'power3.out',
                  scrollTrigger: {
                    trigger: card,
                    start: 'top 90%',
                    end: 'bottom 10%',
                    toggleActions: 'play reverse play reverse',
                  },
                },
              );
            });

            // 6. Progressively enable the stack only when each card fits on screen.
            // No pin spacers or scroll interception: sticky HTML remains navigable.
            const stack = root.current?.querySelector<HTMLElement>('[data-card-stack]');
            if (stack) {
              const cards = Array.from(stack.querySelectorAll<HTMLElement>('[data-stack-card]'));
              stackMedia.add({ desktop: '(min-width: 768px)', mobile: '(max-width: 767px)', tall: '(min-height: 760px)' }, mediaContext => {
                if (!mediaContext.conditions?.tall) return;
                const fits = cards.every(card => card.offsetHeight < innerHeight - 180);
                if (!fits) return;
                stack.dataset.stackActive = 'true';
                const animations = cards.slice(0, -1).map((card, index) => gsap.to(card, {
                  scale: 0.94,
                  transformOrigin: 'center top',
                  ease: 'none',
                  scrollTrigger: {
                    trigger: cards[index + 1],
                    start: 'top 80%',
                    end: () => `top ${126 + (index + 1) * 12}px`,
                    scrub: 0.55,
                    invalidateOnRefresh: true,
                  },
                }));
                return () => {
                  animations.forEach(animation => { animation.scrollTrigger?.kill(); animation.revert(); });
                  delete stack.dataset.stackActive;
                };
              });
            }

            // 7. Process workflow progress bar scrub
            const gallery = root.current?.querySelector<HTMLElement>('[data-gallery-track]');
            if (gallery) {
              stackMedia.add('(min-height: 760px)', () => {
                const cards = Array.from(gallery.querySelectorAll<HTMLElement>('[data-service-card]'));
                if (cards.every(card => card.offsetHeight < innerHeight - 190)) gallery.dataset.serviceStack = 'true';
                const isRtl = document.documentElement.dir === 'rtl';
                const animations = cards.map((card, index) => {
                  const direction = (index % 2 === 0 ? -1 : 1) * (isRtl ? -1 : 1);
                  return gsap.fromTo(card, { x: direction * 65, y: 38, rotation: direction * 5, scale: 0.96 }, {
                    x: 0, y: 0, rotation: 0, scale: 1, ease: 'power2.out',
                    scrollTrigger: { trigger: card, start: 'top 98%', end: 'top 40%', scrub: 0.65, invalidateOnRefresh: true },
                  });
                });
                return () => {
                  animations.forEach(animation => { animation.scrollTrigger?.kill(); animation.revert(); });
                  delete gallery.dataset.serviceStack;
                };
              });
            }

            gsap.fromTo(
              '[data-process-progress]',
              { scaleX: 0.08 },
              {
                scaleX: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: '[data-process-band]',
                  start: 'top 80%',
                  end: 'bottom 35%',
                  scrub: 0.4,
                },
              },
            );

            // 8. Cross-device showcase parallax
            gsap.utils.toArray<HTMLElement>('[data-device-float]').forEach((device, idx) => {
              gsap.fromTo(
                device,
                { y: 24 * (idx + 1) },
                {
                  y: -18 * (idx + 1),
                  ease: 'none',
                  scrollTrigger: {
                    trigger: device,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 0.5,
                  },
                },
              );
            });

            // 9. Bidirectional reveal for editorial blocks
            gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
              gsap.fromTo(
                element,
                { y: 32, opacity: 1, scale: 0.98 },
                {
                  y: 0,
                  opacity: 1,
                  scale: 1,
                  duration: 0.8,
                  ease: 'power2.out',
                  scrollTrigger: {
                    trigger: element,
                    start: 'top 92%',
                    end: 'bottom 8%',
                    toggleActions: 'play reverse play reverse',
                  },
                },
              );
            });

            // 10. Orbit rotation scrub
            gsap.to('[data-orbit]', {
              rotation: 90,
              ease: 'none',
              scrollTrigger: {
                trigger: '[data-together]',
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1,
              },
            });
          }, root);

          return () => { stackMedia.revert(); context.revert(); };
        });

        dispose = () => media.revert();
      })
      .catch(() => {
        /* HTML content remains visible when motion cannot load. */
      });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return <div ref={root} className="amc-landing">{children}</div>;
}

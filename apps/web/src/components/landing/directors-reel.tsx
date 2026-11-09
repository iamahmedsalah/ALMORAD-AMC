'use client';

import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Locale } from '@amc/shared';

export function DirectorsReel({ children, locale, count }: { children: ReactNode; locale: Locale; count: number }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [desktop, setDesktop] = useState(false);
  const isAr = locale === 'ar';
  const members = Children.toArray(children);
  const pageCount = Math.ceil(members.length / 2);
  const pages = Array.from({ length: pageCount }, (_, index) => members.slice(index * 2, index * 2 + 2));

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return <div id="directors" ref={root} data-reel-active={desktop ? "buttons" : undefined} data-member-count={count} className="directors-reel" role="region" aria-labelledby="directors-title">
    <div className="directors-reel-stage">
      <div className="directors-reel-heading">
        <div>
          <p className="eyebrow">{isAr ? 'الفريق المتخصص' : 'THE SPECIALISTS'}</p>
          <h3 id="directors-title">{isAr ? 'مديرو التخصصات' : 'Directors & discipline leads'}</h3>
          <p className="directors-reel-hint">{isAr ? '\u0627\u062e\u062a\u0631 \u0645\u062c\u0645\u0648\u0639\u0629 \u0644\u0644\u062a\u0639\u0631\u0651\u0641 \u0639\u0644\u0649 \u0627\u0644\u0641\u0631\u064a\u0642.' : 'Choose a group to meet the specialists.'}</p>
        </div>
        {desktop && <div className="directors-reel-navigation">
          <div className="director-pagination" role="group" aria-label={isAr ? 'اختر مجموعة الفريق' : 'Choose a team group'}>
            {pages.map((page, index) => <button key={index} type="button" className="director-page-button" aria-current={active === index ? 'step' : undefined} aria-label={isAr ? `عرض أعضاء الفريق ${index * 2 + 1} إلى ${index * 2 + page.length}` : `View specialists ${index * 2 + 1} to ${index * 2 + page.length}`} onClick={() => setActive(index)}>
              <span aria-hidden="true" className="director-page-marker" />
              <bdi>{String(index * 2 + 1).padStart(2, '0')}{page.length > 1 ? ` — ${String(index * 2 + page.length).padStart(2, '0')}` : ''}</bdi>
            </button>)}
          </div>
        </div>}
      </div>
      <div className="directors-reel-gallery">
        <div className="lp-team-grid-5 directors-reel-track" role="group" aria-label={isAr ? 'بطاقات التخصصات' : 'Discipline cards'}>{pages.map((page, index) => <div key={index} className="director-page" data-director-page data-active={active === index} hidden={desktop && active !== index} data-member-count={page.length}>{page}</div>)}</div>
      </div>

    </div>
  </div>;
}

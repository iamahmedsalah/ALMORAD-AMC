'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useScrollTimeline } from '@/hooks/use-scroll-timeline';
import type { AmcMarkSceneProps, ScrollTimelineState } from './amc-mark-scene';
import { AmcMarkVectorFallback } from './amc-mark-vector-fallback';
import { SolarIcon, type SolarName } from '@/components/ui/solar-icon';

const chapterIcons: SolarName[] = ['widget-2-linear', 'layers-linear', 'star-linear', 'code-square-linear', 'chart-2-linear', 'calendar-linear'];

function UnavailableScene({ onError }: AmcMarkSceneProps) {
  useEffect(() => onError(), [onError]);
  return null;
}
const AmcMarkScene = dynamic(() => import('./amc-mark-scene')
  .then(m => m.AmcMarkScene).catch(() => UnavailableScene), { ssr: false });

interface AmcMarkContainerProps {
  dir?: 'ltr' | 'rtl';
}

const CHAPTER_METADATA = [
  { id: 'chapter-hero', num: '01', en: 'AMC — The Mark', ar: 'AMC — العلامة' },
  { id: 'chapter-strategy', num: '02', en: 'Layers — Architecture', ar: 'الطبقات — البنية' },
  { id: 'chapter-identity', num: '03', en: 'Growth — Momentum', ar: 'النمو — الزخم' },
  { id: 'chapter-digital', num: '04', en: 'Rhythm — Craft', ar: 'الإيقاع — الحرفة الرقمية' },
  { id: 'chapter-scale', num: '05', en: 'Turn — Full Dimension', ar: 'التحول — الأبعاد الكاملة' },
  { id: 'chapter-booking', num: '06', en: 'Almorad AMC — Together', ar: 'المراد AMC — معاً' },
] as const;

function MarkSurface({ animated, mediaReady, progress, activeChapter, dir, scrollStateRef }: {
  animated: boolean; mediaReady: boolean; progress: number; activeChapter: number;
  dir: 'ltr' | 'rtl'; scrollStateRef: { current: ScrollTimelineState };
}) {
  const [sceneState, setSceneState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const onReady = useCallback(() => setSceneState('ready'), []);
  const onError = useCallback(() => setSceneState('fallback'), []);
  const status = !mediaReady ? 'loading' : !animated ? 'static' : sceneState;
  return (
    <div className="amc-mark-stage" data-scene-state={status}
      data-chapter={activeChapter} data-progress={progress.toFixed(4)} aria-hidden="true">
      <div className="amc-mark-poster" data-hidden={status === 'ready' ? 'true' : 'false'}>
        <AmcMarkVectorFallback />
      </div>
      {animated && sceneState !== 'fallback' && (
        <AmcMarkScene progress={progress} scrollStateRef={scrollStateRef} dir={dir} onReady={onReady} onError={onError} />
      )}
    </div>
  );
}

export function AmcMarkContainer({ dir = 'ltr' }: AmcMarkContainerProps) {
  const { progress, activeChapter, velocity, isScrolling, isMobile, reducedMotion, mediaReady } = useScrollTimeline();
  const progressBarRef = useRef<HTMLDivElement>(null);
  const scrollStateRef = useRef<ScrollTimelineState>({ progress: 0, velocity: 0, isScrolling: false, chapter: 0 });
  const animated = mediaReady && !isMobile && !reducedMotion;

  useEffect(() => {
    scrollStateRef.current = { progress, velocity, isScrolling, chapter: activeChapter };
    if (progressBarRef.current) progressBarRef.current.style.transform = `scaleX(${progress})`;
  }, [progress, activeChapter, velocity, isScrolling]);

  const scrollToChapter = (index: number) => {
    const chapter = CHAPTER_METADATA[index];
    if (!chapter) return;
    const targetEl = document.getElementById(chapter.id);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({
      top: (index / (CHAPTER_METADATA.length - 1)) * maxScroll,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  const currentMeta = CHAPTER_METADATA[activeChapter] ?? CHAPTER_METADATA[0];
  const isRtl = dir === 'rtl';

  return (
    <>
      <MarkSurface key={animated ? 'animated' : 'static'} animated={animated} mediaReady={mediaReady}
        progress={progress} activeChapter={activeChapter} dir={dir} scrollStateRef={scrollStateRef} />

      {/* Top Scroll Progress Bar */}
      <div className="scroll-hud-progress" aria-hidden="true">
        <div ref={progressBarRef} className="scroll-hud-progress-bar" />
      </div>

      {/* 6-Chapter Interactive Scroll Rail */}
      <nav
        className="scroll-hud-rail"
        aria-label={isRtl ? 'فصول الصفحة' : 'Story Chapters'}
      >
        {CHAPTER_METADATA.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            className="scroll-hud-dot"
            aria-current={activeChapter === idx ? 'step' : undefined}
            data-active={activeChapter === idx ? 'true' : 'false'}
            aria-label={`${item.num} ${isRtl ? item.ar : item.en}`}
            title={`${item.num} — ${isRtl ? item.ar : item.en}`}
            onClick={() => scrollToChapter(idx)}
            onKeyDown={(event) => {
              let target = idx;
              if (event.key === 'ArrowDown') target = (idx + 1) % CHAPTER_METADATA.length;
              else if (event.key === 'ArrowUp') target = (idx + CHAPTER_METADATA.length - 1) % CHAPTER_METADATA.length;
              else if (event.key === 'Home') target = 0;
              else if (event.key === 'End') target = CHAPTER_METADATA.length - 1;
              else return;
              event.preventDefault();
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[target]?.focus();
            }}
          >
            <SolarIcon name={chapterIcons[idx] ?? 'widget-2-linear'} />
            <span className="scroll-hud-tooltip" aria-hidden="true">{item.num} ? {isRtl ? item.ar : item.en}</span>
          </button>
        ))}
      </nav>

      {/* Active Chapter Pill Indicator */}
      <div className="scroll-hud-chapter-pill rounded-squircle-md" aria-hidden="true">
        <strong>
          {currentMeta.num} / 0{CHAPTER_METADATA.length}
        </strong>
        <span>{isRtl ? currentMeta.ar : currentMeta.en}</span>
      </div>
    </>
  );
}

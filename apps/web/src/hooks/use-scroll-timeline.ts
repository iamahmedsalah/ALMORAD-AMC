'use client';

import { useEffect, useState } from 'react';
import { chapterTimeline, CHAPTER_IDS } from './chapter-timeline';

export interface ScrollTimelineState {
  progress: number;
  activeChapter: number;
  velocity: number;
  isScrolling: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
  mediaReady: boolean;
}

export function useScrollTimeline(): ScrollTimelineState {
  const [state, setState] = useState<ScrollTimelineState>({
    progress: 0, activeChapter: 0, velocity: 0, isScrolling: false,
    isMobile: true, reducedMotion: true, mediaReady: false,
  });
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let positions: number[] = [];
    let frame = 0;
    let timer = 0;
    let lastY = window.scrollY;
    let lastTime = performance.now();
    let disposed = false;
    const update = () => {
      frame = 0;
      const now = performance.now();
      const y = window.scrollY;
      const velocity = (y - lastY) / Math.max(16, now - lastTime);
      lastY = y;
      lastTime = now;
      setState({ ...chapterTimeline(y, positions), velocity, isScrolling: Math.abs(velocity) > 0.01,
        isMobile: mobile.matches, reducedMotion: motion.matches, mediaReady: true });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      positions = CHAPTER_IDS.map((id, i) => {
        const el = document.getElementById(id);
        let top = 0;
        for (let node = el; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
        return i === 0 ? 0 : Math.min(max, Math.max(0, top - 140));
      });
      positions.push(Math.max(max, positions[positions.length - 1]! + 1));
      schedule();
    };
    const scroll = () => {
      schedule();
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setState(s => ({ ...s, velocity: 0, isScrolling: false })), 160);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(document.body);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', measure);
    mobile.addEventListener('change', measure);
    motion.addEventListener('change', measure);
    void document.fonts.ready.then(() => { if (!disposed) measure(); });
    measure();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      resize.disconnect();
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', measure);
      mobile.removeEventListener('change', measure);
      motion.removeEventListener('change', measure);
    };
  }, []);
  return state;
}

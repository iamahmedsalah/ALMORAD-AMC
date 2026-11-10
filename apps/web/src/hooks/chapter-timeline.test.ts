import { describe, expect, it } from 'vitest';
import { chapterTimeline, CHAPTER_IDS } from './chapter-timeline';

describe('semantic chapter timeline', () => {
  const positions = [0, 800, 2200, 3000, 5100, 5400, 6400, 6800, 7000];
  it('tracks uneven chapter lengths and restored scroll positions', () => {
    expect(chapterTimeline(2200, positions)).toEqual({ progress: 0.28, activeChapter: 2 });
    expect(chapterTimeline(2600, positions).progress).toBeCloseTo(0.39);
    expect(chapterTimeline(6400, positions)).toEqual({ progress: 0.85, activeChapter: 6 });
    expect(chapterTimeline(5400, positions)).toEqual({ progress: 0.78, activeChapter: 5 });
    expect(chapterTimeline(6800, positions)).toEqual({ progress: 0.94, activeChapter: 7 });
  });
  it('clamps boundaries and handles collapsed segments', () => {
    expect(chapterTimeline(-20, positions).progress).toBe(0);
    expect(chapterTimeline(9000, positions).progress).toBe(1);
    expect(Number.isFinite(chapterTimeline(0, [...CHAPTER_IDS.map(() => 0), 1]).progress)).toBe(true);
  });
});

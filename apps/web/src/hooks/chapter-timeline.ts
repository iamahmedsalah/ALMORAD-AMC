export const CHAPTER_IDS = ['chapter-hero', 'chapter-strategy', 'chapter-identity', 'chapter-digital', 'chapter-scale', 'chapter-booking'] as const;
// Semantic chapter starts map onto the supplied animation's key poses.
const POSES = [0, 0.09, 0.28, 0.5, 0.68, 0.85, 1];

export function chapterTimeline(y: number, positions: readonly number[]) {
  if (positions.length !== POSES.length) return { progress: 0, activeChapter: 0 };
  let segment = 0;
  while (segment < POSES.length - 2 && y >= positions[segment + 1]!) segment++;
  const fraction = Math.max(0, Math.min(1, (y - positions[segment]!) /
    Math.max(1, positions[segment + 1]! - positions[segment]!)));
  return { progress: POSES[segment]! + fraction * (POSES[segment + 1]! - POSES[segment]!),
    activeChapter: Math.min(CHAPTER_IDS.length - 1, segment) };
}

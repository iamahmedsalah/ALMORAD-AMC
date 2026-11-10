export const CHAPTER_METADATA = [
  { id: 'chapter-hero', num: '01', en: 'The mark', ar: 'العلامة', pose: 0 },
  { id: 'chapter-strategy', num: '02', en: 'Studio', ar: 'الاستوديو', pose: 0.09 },
  { id: 'chapter-identity', num: '03', en: 'Disciplines', ar: 'التخصصات', pose: 0.28 },
  { id: 'chapter-digital', num: '04', en: 'Creative gallery', ar: 'المعرض الإبداعي', pose: 0.5 },
  { id: 'chapter-scale', num: '05', en: 'Our approach', ar: 'منهجنا', pose: 0.68 },
  { id: 'chapter-devices', num: '06', en: 'Digital experiences', ar: 'التجارب الرقمية', pose: 0.78 },
  { id: 'chapter-booking', num: '07', en: 'Let’s talk', ar: 'لنتحدث', pose: 0.85 },
  { id: 'chapter-faq', num: '08', en: 'FAQs', ar: 'الأسئلة الشائعة', pose: 0.94 },
] as const;
export const CHAPTER_IDS = CHAPTER_METADATA.map(chapter => chapter.id);
// Semantic chapter starts map onto the supplied animation's key poses.
const POSES = [...CHAPTER_METADATA.map(chapter => chapter.pose), 1];

export function chapterTimeline(y: number, positions: readonly number[]) {
  if (positions.length !== POSES.length) return { progress: 0, activeChapter: 0 };
  let segment = 0;
  while (segment < POSES.length - 2 && y >= positions[segment + 1]!) segment++;
  const fraction = Math.max(0, Math.min(1, (y - positions[segment]!) /
    Math.max(1, positions[segment + 1]! - positions[segment]!)));
  return { progress: POSES[segment]! + fraction * (POSES[segment + 1]! - POSES[segment]!),
    activeChapter: Math.min(CHAPTER_IDS.length - 1, segment) };
}

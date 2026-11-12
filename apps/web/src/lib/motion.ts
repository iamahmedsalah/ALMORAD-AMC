// Keep aligned with --motion-* in styles/responsive-interactions.css.
export const motion = {
  micro: 160, disclosure: 260, entrance: 560, stagger: 50, distance: 12,
  enter: 'cubic-bezier(.22,1,.36,1)',
  exit: 'cubic-bezier(.4,0,1,1)', move: 'cubic-bezier(.4,0,.2,1)',
} as const;

import type { ElementType } from 'react';

/**
 * Server-rendered masked lines. Each `\n`-separated line is wrapped so GSAP can
 * slide it up from behind a mask. Without JavaScript the text is plain and visible.
 */
export function Lines({
  text,
  as: Tag = 'span',
  className = '',
  id,
}: {
  text: string | readonly string[];
  as?: ElementType;
  className?: string;
  id?: string;
}) {
  const lines = typeof text === 'string' ? text.split('\n') : [...text];
  return (
    <Tag className={className} id={id} data-lines="">
      {lines.map((line, index) => (
        <span className="line-mask" key={`${index}-${line}`}>
          <span className="line-inner">{line}</span>
        </span>
      ))}
    </Tag>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="lp-label" data-reveal="">
      {children}
    </p>
  );
}

export function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`lp-arrow ${className}`}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

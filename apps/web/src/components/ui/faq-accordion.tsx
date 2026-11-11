'use client';
import { useEffect, useRef, useState } from 'react';

export function FaqAccordion({ items }: { items: readonly (readonly [string, string])[]; locale: string }) {
  return (
    <div className="faq-accordion">
      {items.map(([question, answer]) => (
        <FaqItem
          key={question}
          question={question}
          answer={answer}
        />
      ))}
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const details = useRef<HTMLDetailsElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const settle = () => {
      if (!media.matches) return;
      animation.current?.cancel();
      animation.current = null;
    };
    media.addEventListener('change', settle);
    return () => {
      animation.current?.cancel();
      media.removeEventListener('change', settle);
    };
  }, []);

  return (
    <details
      ref={details}
      className="faq-accordion-item"
      data-expanded={isOpen ? 'true' : 'false'}
    >
      <summary
        onClick={(event) => {
          const node = details.current;
          const content = body.current;
          if (!node || !content) return;
          event.preventDefault();

          const nextExpanded = !isOpen;
          setIsOpen(nextExpanded);

          if (matchMedia('(prefers-reduced-motion: reduce)').matches || !content.animate) {
            node.open = nextExpanded;
            return;
          }

          const startHeight = node.open ? content.getBoundingClientRect().height : 0;
          animation.current?.cancel();
          node.open = true;

          const endHeight = nextExpanded ? content.scrollHeight : 0;
          content.style.overflow = 'hidden';

          const anim = content.animate(
            [
              {
                height: `${startHeight}px`,
                opacity: startHeight === 0 ? 0 : 1,
                transform: startHeight === 0 ? 'translateY(-6px)' : 'translateY(0)',
              },
              {
                height: `${endHeight}px`,
                opacity: nextExpanded ? 1 : 0,
                transform: nextExpanded ? 'translateY(0)' : 'translateY(-6px)',
              },
            ],
            {
              duration: 380,
              easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
          );

          animation.current = anim;
          anim.onfinish = () => {
            node.open = nextExpanded;
            content.style.overflow = '';
            animation.current = null;
          };
        }}
      >
        <span className="faq-accordion-question">{question}</span>
        <span className="faq-accordion-toggle" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div ref={body} className="faq-accordion-answer">
        <p>{answer}</p>
      </div>
    </details>
  );
}

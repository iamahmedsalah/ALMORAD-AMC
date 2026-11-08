'use client';
import { useEffect, useRef } from 'react';

export function FaqAccordion({ items, locale }: { items: readonly (readonly [string, string])[]; locale: string }) {
  return <div className="faq-accordion">{items.map(([question, answer], index) => <FaqItem key={question}
    question={question} answer={answer} number={new Intl.NumberFormat(locale, { minimumIntegerDigits: 2 }).format(index + 1)} />)}</div>;
}

function FaqItem({ question, answer, number }: { question: string; answer: string; number: string }) {
  const details = useRef<HTMLDetailsElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const expanded = useRef(false);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const settle = () => {
      if (!media.matches) return;
      animation.current?.cancel(); animation.current = null;
      if (details.current) details.current.open = expanded.current;
    };
    media.addEventListener('change', settle);
    return () => { animation.current?.cancel(); media.removeEventListener('change', settle); };
  }, []);

  return <details ref={details} className="faq-accordion-item">
    <summary onClick={event => {
      const node = details.current; const content = body.current;
      if (!node || !content || !content.animate) return;
      event.preventDefault();
      const from = node.open ? content.getBoundingClientRect().height : 0;
      expanded.current = !expanded.current;
      animation.current?.cancel();
      node.open = true;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { node.open = expanded.current; return; }
      const to = expanded.current ? content.scrollHeight : 0;
      const next = content.animate([{ height: `${from}px`, opacity: from === 0 ? 0 : 1 }, { height: `${to}px`, opacity: expanded.current ? 1 : 0 }], {
        duration: Number.parseFloat(getComputedStyle(node).getPropertyValue('--motion-disclosure')) || 220, easing: 'cubic-bezier(.22,1,.36,1)',
      });
      animation.current = next;
      next.onfinish = () => { node.open = expanded.current; animation.current = null; };
    }}>
      <span className="faq-accordion-number" aria-hidden="true">{number}</span>
      <span className="faq-accordion-question">{question}</span>
      <span className="faq-accordion-toggle" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 9 6 6 6-6" /></svg></span>
    </summary>
    <div ref={body} className="faq-accordion-answer"><p>{answer}</p></div>
  </details>;
}

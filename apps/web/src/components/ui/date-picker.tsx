'use client';

import { useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button } from './button';

const parseDate = (value: string) => new Date(`${value}T12:00:00`);
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Local calendar composed with shadcn Button. Native dialog owns focus/Escape. */
export function DatePicker({ value, min, max, onChange, locale, label }: {
  value: string; min: string; max?: string; onChange: (value: string) => void; locale: string; label: string;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [month, setMonth] = useState(() => parseDate(value));
  const [focused, setFocused] = useState(value);
  const ar = locale === 'ar';
  const start = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12);
  const days = Array.from({ length: end.getDate() }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1, 12));
  const close = () => { dialog.current?.close(); trigger.current?.focus(); };
  const moveFocus = (date: Date) => {
    const next = dateValue(date);
    if (next < min || (max && next > max)) return;
    flushSync(() => { setMonth(date); setFocused(next); });
    dialog.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus();
  };
  const previous = new Date(month.getFullYear(), month.getMonth(), 0, 12);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1, 12);
  return <div className="date-picker-field">
    <span id={`${id}-label`}>{label}</span>
    <Button type="button" variant="secondary" className="date-picker-trigger" aria-haspopup="dialog" aria-controls={id} aria-labelledby={`${id}-label ${id}-value`}
      onClick={event => {
        trigger.current = event.currentTarget;
        flushSync(() => { setMonth(parseDate(value)); setFocused(value); });
        dialog.current?.showModal();
        const selected = dialog.current?.querySelector<HTMLButtonElement>(`[data-date="${value}"]`);
        if (selected) selected.focus();
      }}>
      <span id={`${id}-value`}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parseDate(value))}</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 2v6m10-6v6M3 11h18" /></svg>
    </Button>
    <dialog ref={dialog} id={id} className="date-picker-dialog" aria-labelledby={`${id}-title`} dir={ar ? 'rtl' : 'ltr'}
      onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
      <div className="calendar-heading">
        <h2 id={`${id}-title`}>{label}</h2>
        <Button variant="secondary" type="button" aria-label={ar ? 'إغلاق' : 'Close'} onClick={close}>×</Button>
      </div>
      <div className="calendar-navigation">
        <Button variant="secondary" type="button" disabled={dateValue(previous) < min} aria-label={ar ? 'الشهر السابق' : 'Previous month'} onClick={() => moveFocus(parseDate(dateValue(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12)) < min ? min : dateValue(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))))}>‹</Button>
        <strong aria-live="polite">{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}</strong>
        <Button variant="secondary" type="button" disabled={Boolean(max && dateValue(next) > max)} aria-label={ar ? 'الشهر التالي' : 'Next month'} onClick={() => moveFocus(next)}>›</Button>
      </div>
      <table className="calendar-grid" aria-label={new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}>
        <thead><tr>{Array.from({ length: 7 }, (_, index) => <th key={index} scope="col">{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 10, 8 + index, 12))}</th>)}</tr></thead>
        <tbody>{Array.from({ length: Math.ceil((start.getDay() + days.length) / 7) }, (_, week) => <tr key={week}>
          {Array.from({ length: 7 }, (_, weekday) => {
            const date = days[week * 7 + weekday - start.getDay()];
            if (!date) return <td key={weekday} />;
            const key = dateValue(date); const disabled = key < min || Boolean(max && key > max);
            return <td key={weekday}><button type="button" data-date={key} disabled={disabled} tabIndex={key === focused ? 0 : -1}
              aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date)} aria-pressed={key === value}
              onFocus={() => setFocused(key)} onClick={() => { onChange(key); close(); }}
              onKeyDown={event => {
                const delta = event.key === 'ArrowRight' ? (ar ? -1 : 1) : event.key === 'ArrowLeft' ? (ar ? 1 : -1) : event.key === 'ArrowDown' ? 7 : event.key === 'ArrowUp' ? -7 : 0;
                if (delta) { event.preventDefault(); const target = new Date(date); target.setDate(date.getDate() + delta); moveFocus(target); }
                if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); const target = new Date(date); target.setDate(date.getDate() + (event.key === 'Home' ? -date.getDay() : 6 - date.getDay())); moveFocus(target); }
              }}>{new Intl.NumberFormat(locale).format(date.getDate())}</button></td>;
          })}
        </tr>)}</tbody>
      </table>
      <Button type="button" variant="secondary" onClick={() => { onChange(min); close(); }}>{ar ? 'اليوم' : 'Today'}</Button>
    </dialog>
  </div>;
}

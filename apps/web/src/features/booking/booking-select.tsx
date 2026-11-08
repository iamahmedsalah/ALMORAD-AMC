'use client';
import { useId } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function BookingSelect({ label, value, onChange, options, locale, description }: {
  label: string; value: string; onChange: (value: string) => void; locale: string;
  options: { value: string; label: string; disabled?: boolean }[]; description?: string;
}) {
  const id = useId();
  return <div className="booking-select-field">
    <label id={`${id}-label`} htmlFor={id}>{label}</label>
    <Select value={value} onValueChange={onChange} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <SelectTrigger id={id} aria-labelledby={`${id}-label`} aria-describedby={description ? `${id}-description` : undefined}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value} disabled={option.disabled}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
    {description && <p id={`${id}-description`} className="booking-format-note">{description}</p>}
  </div>;
}

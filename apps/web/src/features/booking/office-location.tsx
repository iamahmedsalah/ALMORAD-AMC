'use client';
import { useState } from 'react';
import type { Schedule, Locale } from '@amc/shared';
import { Button } from '@/components/ui/button';
import { SolarIcon } from '@/components/ui/solar-icon';
import { bookingCopy } from './copy';

export function OfficeLocation({ schedule, locale }: { schedule: Schedule; locale: Locale }) {
  const [showMap, setShowMap] = useState(false);
  const c = bookingCopy(locale);
  const address = locale === 'ar' ? schedule.officeAddressAr : schedule.officeAddressEn;
  let directions: string | null = null;
  let embed: string | null = null;
  try { const url = new URL(schedule.directionsUrl || ''); if (url.protocol === 'https:') directions = url.href; } catch { /* Unconfigured location. */ }
  try {
    const url = new URL(process.env.NEXT_PUBLIC_OFFICE_MAP_EMBED_URL || '');
    if (url.protocol === 'https:' && ['www.google.com', 'maps.google.com'].includes(url.hostname) && url.pathname.startsWith('/maps/embed')) embed = url.href;
  } catch { /* An embed is optional; approved directions still work. */ }
  if (!address || !directions) return null;
  return <section className="booking-office-panel" aria-label={c.address}>
    <div className="booking-office-heading"><SolarIcon name="global-linear" /><h3>{c.address}</h3></div>
    <p>{address}</p>
    <div className="booking-actions">
      <Button asChild variant="secondary"><a href={directions} target="_blank" rel="noopener noreferrer">{c.directions}<span aria-hidden="true">↗</span></a></Button>
      {embed && <Button type="button" variant="secondary" onClick={() => setShowMap(!showMap)} aria-expanded={showMap}>{locale === 'ar' ? 'الخريطة' : 'Map'}</Button>}
    </div>
    {embed && showMap && <iframe title={locale === 'ar' ? 'موقع المكتب على خرائط Google' : 'Office location on Google Maps'} src={embed} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />}
  </section>;
}

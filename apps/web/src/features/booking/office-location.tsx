'use client';

import { useState } from 'react';
import { officeLocation, type Locale, type Schedule } from '@amc/shared';
import { Button } from '@/components/ui/button';
import { officeMapEmbedUrl } from '@/components/ui/office-map';
import { SolarIcon } from '@/components/ui/solar-icon';
import { bookingCopy } from './copy';

export function OfficeLocation({ schedule, locale }: { schedule: Schedule; locale: Locale }) {
  const [showMap, setShowMap] = useState(false);
  const c = bookingCopy(locale);
  const address =
    (locale === 'ar' ? schedule.officeAddressAr : schedule.officeAddressEn) ||
    `${officeLocation.address[locale]} · ${officeLocation.locality[locale]}`;
  let directions: string = officeLocation.directionsUrl;
  try {
    const url = new URL(schedule.directionsUrl || '');
    if (url.protocol === 'https:') directions = url.href;
  } catch {
    /* Fall back to verified Google Maps directions URL. */
  }
  const embed = officeMapEmbedUrl(locale, process.env.NEXT_PUBLIC_OFFICE_MAP_EMBED_URL);

  return (
    <section className="booking-office-panel" aria-label={c.address}>
      <div className="booking-office-heading">
        <SolarIcon name="global-linear" />
        <h3>{c.address}</h3>
      </div>
      <p>{address}</p>
      <div className="booking-actions">
        <Button asChild variant="secondary">
          <a href={directions} target="_blank" rel="noopener noreferrer">
            {c.directions}
            <span aria-hidden="true">↗</span>
          </a>
        </Button>
        <Button type="button" variant="secondary" onClick={() => setShowMap(!showMap)} aria-expanded={showMap}>
          {locale === 'ar' ? 'الخريطة' : 'Map'}
        </Button>
      </div>
      {showMap && (
        <iframe
          title={locale === 'ar' ? 'موقع المكتب على خرائط Google' : 'Office location on Google Maps'}
          src={embed}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      )}
    </section>
  );
}

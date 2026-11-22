'use client';

import { useState } from 'react';
import { officeLocation, type Locale, type Schedule } from '@amc/shared';
import { Button } from '@/components/ui/button';
import { officeMapEmbedUrl } from '@/components/ui/office-map';
import { SolarIcon } from '@/components/ui/solar-icon';
import { bookingCopy } from './copy';

export function OfficeLocation({ schedule, locale }: { schedule: Schedule; locale: Locale }) {
  const [showMap, setShowMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const ar = locale === 'ar';
  const c = bookingCopy(locale);
  const address =
    (ar ? schedule.officeAddressAr : schedule.officeAddressEn) ||
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
      <div className="booking-office-top">
        <div className="booking-office-heading">
          <span className="booking-office-icon" aria-hidden="true">
            <SolarIcon name="map-point-linear" />
          </span>
          <div>
            <h3>{c.address}</h3>
            <p className="booking-office-address">{address}</p>
          </div>
        </div>
      </div>

      <div className="booking-actions booking-office-actions">
        <Button asChild variant="secondary">
          <a href={directions} target="_blank" rel="noopener noreferrer">
            <SolarIcon name="compass-linear" />
            <span>{c.directions}</span>
            <SolarIcon name="arrow-right-up-linear" className="directional-icon" />
          </a>
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setShowMap((prev) => {
              if (prev) setMapLoaded(false);
              return !prev;
            })
          }
          aria-expanded={showMap}
        >
          <SolarIcon name={showMap ? 'eye-closed-linear' : 'eye-linear'} />
          <span>{showMap ? (ar ? 'إخفاء الخريطة' : 'Hide map') : ar ? 'عرض الخريطة' : 'Show map'}</span>
        </Button>
      </div>

      {showMap && (
        <div className="booking-office-frame" data-loaded={mapLoaded}>
          {!mapLoaded && (
            <div className="studio-location-skeleton" role="status" aria-live="polite">
              <SolarIcon name="refresh-linear" className="booking-spinner" />
              <span>{ar ? 'جاري تحميل الخريطة...' : 'Loading map...'}</span>
            </div>
          )}
          <iframe
            title={ar ? 'موقع المكتب على خرائط Google' : 'Office location on Google Maps'}
            src={embed}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={() => setMapLoaded(true)}
          />
        </div>
      )}
    </section>
  );
}

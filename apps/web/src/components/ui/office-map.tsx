'use client';

import { useState } from 'react';
import { officeLocation, type Locale } from '@amc/shared';
import { Button } from '@/components/ui/button';
import { SolarIcon } from '@/components/ui/solar-icon';

export function officeMapEmbedUrl(locale: Locale, overrideUrl?: string | null): string {
  if (overrideUrl) {
    try {
      const url = new URL(overrideUrl);
      if (
        url.protocol === 'https:' &&
        ['www.google.com', 'maps.google.com'].includes(url.hostname) &&
        url.pathname.startsWith('/maps/embed')
      ) {
        return url.href;
      }
    } catch {
      /* Ignore invalid override URL and fall back to verified coordinates. */
    }
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=place_id:${officeLocation.placeId}&language=${locale}`;
  }

  const { lat, lng } = officeLocation.coords;
  return `https://maps.google.com/maps?q=${lat},${lng}&z=17&hl=${locale}&output=embed`;
}

export function OfficeMap({
  locale,
  address,
  directionsUrl,
  defaultExpanded = false,
}: {
  locale: Locale;
  address?: string | null;
  directionsUrl?: string | null;
  defaultExpanded?: boolean;
}) {
  const [showMap, setShowMap] = useState(defaultExpanded);
  const ar = locale === 'ar';
  const displayAddress =
    address?.trim() || `${officeLocation.address[locale]} · ${officeLocation.locality[locale]}`;
  const directions = directionsUrl?.trim() || officeLocation.directionsUrl;
  const embed = officeMapEmbedUrl(locale, process.env.NEXT_PUBLIC_OFFICE_MAP_EMBED_URL);

  return (
    <section
      className="booking-office-panel notice-panel"
      aria-label={ar ? 'موقع المكتب' : 'Office location'}
    >
      <div className="booking-office-heading">
        <SolarIcon name="map-point-linear" />
        <h2>{ar ? 'موقع المكتب' : 'Office location'}</h2>
      </div>
      <p>{displayAddress}</p>
      <div className="booking-actions">
        <Button asChild variant="secondary">
          <a href={directions} target="_blank" rel="noopener noreferrer">
            {ar ? 'احصل على الاتجاهات' : 'Get directions'}
            <span aria-hidden="true">↗</span>
          </a>
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowMap(!showMap)}
          aria-expanded={showMap}
        >
          {showMap
            ? ar
              ? 'إخفاء الخريطة'
              : 'Hide map'
            : ar
              ? 'عرض الخريطة'
              : 'Show map'}
        </Button>
      </div>
      {showMap && (
        <iframe
          title={ar ? 'موقع مكتب المراد AMC على خرائط Google' : 'ALMORAD AMC office location on Google Maps'}
          src={embed}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      )}
    </section>
  );
}

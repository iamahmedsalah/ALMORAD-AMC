'use client';

import { useEffect, useRef, useState } from 'react';
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
  defaultExpanded = true,
  context = 'contact',
}: {
  locale: Locale;
  address?: string | null;
  directionsUrl?: string | null;
  defaultExpanded?: boolean;
  context?: 'booking' | 'contact';
}) {
  const [showMap, setShowMap] = useState(defaultExpanded);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const ar = locale === 'ar';
  const streetAddress = address?.trim() || officeLocation.address[locale];
  const locality = officeLocation.locality[locale];
  const fullAddress =
    address?.trim() || `${officeLocation.address[locale]} · ${officeLocation.locality[locale]}`;
  const directions = directionsUrl?.trim() || officeLocation.directionsUrl;
  const embed = officeMapEmbedUrl(locale, process.env.NEXT_PUBLIC_OFFICE_MAP_EMBED_URL);
  const coordsText = `${officeLocation.coords.lat.toFixed(4)}° N, ${officeLocation.coords.lng.toFixed(4)}° E`;

  async function handleCopyAddress() {
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  }

  function handleToggleMap() {
    setShowMap((prev) => {
      if (prev) setMapLoaded(false);
      return !prev;
    });
  }

  const heading =
    context === 'booking'
      ? ar
        ? 'زور مكتبنا في الإسكندرية'
        : 'Visit our Alexandria studio'
      : ar
        ? 'موقع المكتب'
        : 'Office location';

  const subtitle =
    context === 'booking'
      ? ar
        ? 'اختر اجتماعاً أونلاين أو قابل فريقنا مباشرة في مقر المراد AMC بسموحة.'
        : 'Meet online from anywhere or visit our team in person at our Smouha studio.'
      : ar
        ? 'مقر المراد AMC في سموحة، الإسكندرية — جاهز لاستقبال اجتماعاتك المجدولة.'
        : 'ALMORAD AMC studio in Smouha, Alexandria — ready for scheduled visits.';

  return (
    <section
      className="studio-location-showcase"
      data-context={context}
      data-map-open={showMap}
      aria-labelledby="studio-location-title"
    >
      <div className="studio-location-grid">
        <div className="studio-location-info">
          <div className="studio-location-badge-row">
            <span className="studio-location-pill">
              <span className="studio-location-dot" aria-hidden="true" />
              <SolarIcon name="map-point-linear" className="studio-location-pill-icon" />
              <span>
                {officeLocation.addressLocality[locale]} · {officeLocation.addressRegion[locale]}
              </span>
            </span>
          </div>

          <div className="studio-location-heading">
            <h2 id="studio-location-title">{heading}</h2>
            <p className="studio-location-subtitle">{subtitle}</p>
          </div>

          <dl className="studio-location-facts">
            <div className="studio-location-fact">
              <dt>
                <SolarIcon name="map-point-linear" />
                <span>{ar ? 'العنوان' : 'Studio address'}</span>
              </dt>
              <dd>
                <strong>{streetAddress}</strong>
                {!address?.trim() && <span className="studio-location-locality">{locality}</span>}
              </dd>
            </div>

            <div className="studio-location-fact-row">
              <div className="studio-location-fact studio-location-fact-compact">
                <dt>
                  <SolarIcon name="compass-linear" />
                  <span>{ar ? 'الإحداثيات' : 'Coordinates'}</span>
                </dt>
                <dd>
                  <bdi dir="ltr" className="studio-location-coords">
                    {coordsText}
                  </bdi>
                </dd>
              </div>

              <div className="studio-location-fact studio-location-fact-compact">
                <dt>
                  <SolarIcon name="users-group-rounded-linear" />
                  <span>{ar ? 'صيغة الاجتماعات' : 'Meeting options'}</span>
                </dt>
                <dd>{ar ? 'أونلاين أو في المكتب' : 'Online or in-person'}</dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="studio-location-stage" data-loaded={mapLoaded}>
          <div className="studio-location-stage-bar">
            <span className="studio-location-stage-pin">
              <SolarIcon name="map-point-linear" />
              <span>ALMORAD AMC · {officeLocation.addressLocality[locale]}</span>
            </span>
            <button
              type="button"
              className="studio-location-stage-toggle"
              onClick={handleToggleMap}
              aria-expanded={showMap}
              aria-controls="studio-location-map-frame"
            >
              <SolarIcon name={showMap ? 'eye-closed-linear' : 'eye-linear'} />
              <span>
                {showMap
                  ? ar
                    ? 'إخفاء الخريطة'
                    : 'Hide map'
                  : ar
                    ? 'عرض الخريطة'
                    : 'Show map'}
              </span>
            </button>
          </div>

          <div id="studio-location-map-frame" className="studio-location-frame">
            {showMap ? (
              <>
                {!mapLoaded && (
                  <div className="studio-location-skeleton" role="status" aria-live="polite">
                    <SolarIcon name="refresh-linear" className="booking-spinner" />
                    <span>{ar ? 'جاري تحميل الخريطة...' : 'Loading interactive map...'}</span>
                  </div>
                )}
                <iframe
                  title={
                    ar
                      ? 'موقع مكتب المراد AMC على خرائط Google'
                      : 'ALMORAD AMC office location on Google Maps'
                  }
                  src={embed}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  onLoad={() => setMapLoaded(true)}
                />
              </>
            ) : (
              <div className="studio-location-collapsed">
                <div className="studio-location-collapsed-icon" aria-hidden="true">
                  <SolarIcon name="map-point-linear" />
                </div>
                <p className="studio-location-collapsed-title">{fullAddress}</p>
                <p className="studio-location-collapsed-note">
                  {ar
                    ? 'الخريطة التفاعلية مخفية حالياً لتصفح أسرع.'
                    : 'Interactive map is hidden for faster scrolling.'}
                </p>
                <Button type="button" variant="secondary" onClick={handleToggleMap}>
                  <SolarIcon name="eye-linear" />
                  <span>{ar ? 'عرض الخريطة التفاعلية' : 'Show interactive map'}</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="studio-location-actions">
          <Button asChild variant="default" className="studio-location-primary-cta">
            <a href={directions} target="_blank" rel="noopener noreferrer">
              <SolarIcon name="compass-linear" />
              <span>{ar ? 'احصل على الاتجاهات' : 'Get directions'}</span>
              <SolarIcon name="arrow-right-up-linear" className="directional-icon" />
            </a>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="studio-location-secondary-cta"
            onClick={() => void handleCopyAddress()}
            aria-live="polite"
          >
            <SolarIcon name={copied ? 'check-circle-linear' : 'link-round-linear'} />
            <span>
              {copied
                ? ar
                  ? 'تم نسخ العنوان'
                  : 'Address copied'
                : ar
                  ? 'نسخ العنوان'
                  : 'Copy address'}
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}

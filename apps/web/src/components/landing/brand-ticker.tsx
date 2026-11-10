import Image from 'next/image';
import type {Locale} from '@amc/shared';

// Only official AMC artwork is available. The data shape accepts approved company
// marks later without presenting unverified clients as agency work.
const disciplines = {
  en: ['Marketing', 'Advertising', 'Consulting', 'Web Development'],
  ar: ['التسويق', 'الإعلان', 'الاستشارات', 'تطوير المواقع'],
} as const;

export function BrandTicker({locale}: {locale: Locale}) {
  const labels = disciplines[locale];
  return <div className="brand-ticker" role="region" aria-label={locale === 'ar' ? 'مجالات عمل المراد AMC' : 'ALMORAD AMC disciplines'}>
    <div className="brand-ticker-track">
      {[0, 1].map((copy) => <div className="brand-ticker-set" key={copy} aria-hidden={copy === 1}>
        {labels.map((label, index) => <div className="brand-ticker-item" key={label}>
          <span className="brand-ticker-number" aria-hidden="true">0{index + 1}</span>
          <span className="brand-ticker-logo" aria-hidden="true">
            <Image src="/brand/amc-mark.svg" alt="" width={120} height={45} className="brand-ticker-light" />
            <Image src="/brand/amc-mark-on-dark.svg" alt="" width={120} height={45} className="brand-ticker-dark" />
          </span>
          <span className="brand-ticker-label" dir="auto">{label}</span>
        </div>)}
      </div>)}
    </div>
  </div>;
}

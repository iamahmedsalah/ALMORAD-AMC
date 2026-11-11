'use client';

import Image from 'next/image';
import type { Locale } from '@amc/shared';

export const MOCK_STUDIO_PHOTOS = [
  {
    id: 'studio-01',
    src: '/studio/studio-01.svg',
    span: 'wide',
    tagEn: 'IDENTITY SYSTEM · MOCK',
    tagAr: 'نظام الهوية · نموذج',
    titleEn: 'Editorial Brand Book & Token Swatches',
    titleAr: 'دليل الهوية البصرية ونظام الألوان',
  },
  {
    id: 'studio-02',
    src: '/studio/studio-02.svg',
    span: 'tall',
    tagEn: 'OUTDOOR CAMPAIGN · MOCK',
    tagAr: 'حملة خارجية · نموذج',
    titleEn: 'Architectural Billboard & Urban Direction',
    titleAr: 'لوحات الطرق والإعلانات العمرانية',
  },
  {
    id: 'studio-03',
    src: '/studio/studio-03.svg',
    span: 'standard',
    tagEn: 'DIGITAL FLAGSHIP · MOCK',
    tagAr: 'منصة رقمية · نموذج',
    titleEn: 'Bilingual Typography & Web Flagship',
    titleAr: 'تصميم المواقع والتايبوغرافي ثنائي اللغة',
  },
  {
    id: 'studio-04',
    src: '/studio/studio-04.svg',
    span: 'standard',
    tagEn: 'STRATEGY BOARD · MOCK',
    tagAr: 'لوحة الاستراتيجية · نموذج',
    titleEn: 'Market Research & Positioning Architecture',
    titleAr: 'أبحاث السوق وهندسة التموضع',
  },
  {
    id: 'studio-05',
    src: '/studio/studio-05.svg',
    span: 'tall',
    tagEn: 'COMMERCE EXPERIENCE · MOCK',
    tagAr: 'تجربة المتاجر · نموذج',
    titleEn: 'Mobile & Omni-Channel Storefront',
    titleAr: 'تطبيقات الهواتف والمتاجر الإلكترونية',
  },
  {
    id: 'studio-06',
    src: '/studio/studio-06.svg',
    span: 'wide',
    tagEn: 'STAGE DIRECTION · MOCK',
    tagAr: 'إخراج الفعاليات · نموذج',
    titleEn: 'Corporate Keynote & Lighting Design',
    titleAr: 'تصميم المسرح وإضاءة فعاليات الشركات',
  },
] as const;

export {StudioShowreel} from './studio-showreel';

export function StudioPhotoShowcase({ locale }: { locale: Locale }) {
  const isAr = locale === 'ar';

  return (
    <div className="lp-photo-grid">
      {MOCK_STUDIO_PHOTOS.map((photo) => (
        <figure
          key={photo.id}
          data-portfolio-card
          className={`lp-photo-card lp-photo-${photo.span} glass-surface rounded-squircle-lg`}
        >
          <div className="lp-photo-img-wrap rounded-squircle-md">
            <Image
              unoptimized
              src={photo.src}
              alt={isAr ? photo.titleAr : photo.titleEn}
              width={600}
              height={400}
              loading="lazy"
              className="lp-photo-img"
            />
          </div>
          <figcaption className="lp-photo-caption">
            <span className="badge badge-accent rounded-squircle-sm">
              {isAr ? photo.tagAr : photo.tagEn}
            </span>
            <strong>{isAr ? photo.titleAr : photo.titleEn}</strong>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

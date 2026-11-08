import type { Locale } from '@amc/shared';

/**
 * Engagement / pricing configuration.
 *
 * Prices are intentionally `null` until fees are approved by the business.
 * A `null` price renders the localized "quoted after a discovery call" label.
 * The billing toggle only appears when at least one tier has numeric prices
 * for more than one billing mode.
 */
export type BillingMode = 'project' | 'retainer';
type Localized = Record<Locale, string>;
type CellValue = boolean | Localized;

export interface EngagementTier {
  id: string;
  name: Localized;
  summary: Localized;
  prices: Partial<Record<BillingMode, number | null>>;
  recommended?: boolean;
  /** Pillar count hint used for the small visual on the tier card. */
  disciplines: 1 | 2 | 4;
}

export interface EngagementFeature {
  id: string;
  label: Localized;
  values: [CellValue, CellValue, CellValue];
}

export const engagementConfig = {
  status: 'indicative' as const,
  /** ISO 4217 currency, e.g. 'EGP'. Required before any numeric price is shown. */
  currency: null as string | null,
  billingModes: ['project', 'retainer'] as BillingMode[],
  tiers: [
    {
      id: 'focused',
      name: { en: 'Focused', ar: 'مركّز' },
      summary: {
        en: 'One discipline working on one clear objective.',
        ar: 'تخصص واحد يعمل على هدف واحد واضح.',
      },
      prices: { project: null, retainer: null },
      disciplines: 1,
    },
    {
      id: 'connected',
      name: { en: 'Connected', ar: 'متكامل' },
      summary: {
        en: 'Two or more disciplines sharing one direction.',
        ar: 'تخصصان أو أكثر يعملان باتجاه واحد مشترك.',
      },
      prices: { project: null, retainer: null },
      recommended: true,
      disciplines: 2,
    },
    {
      id: 'partnership',
      name: { en: 'Partnership', ar: 'شراكة' },
      summary: {
        en: 'An ongoing collaboration reviewed at agreed intervals.',
        ar: 'تعاون مستمر تتم مراجعته في مواعيد متفق عليها.',
      },
      prices: { project: null, retainer: null },
      disciplines: 4,
    },
  ] satisfies EngagementTier[],
  features: [
    {
      id: 'discovery',
      label: { en: 'Discovery conversation', ar: 'جلسة تعارف وفهم الاحتياج' },
      values: [true, true, true],
    },
    {
      id: 'scope',
      label: { en: 'Written scope and deliverables', ar: 'نطاق ومخرجات مكتوبة' },
      values: [true, true, true],
    },
    {
      id: 'disciplines',
      label: { en: 'Disciplines involved', ar: 'التخصصات المشاركة' },
      values: [
        { en: 'One', ar: 'واحد' },
        { en: 'Two or more', ar: 'اثنان أو أكثر' },
        { en: 'As agreed', ar: 'حسب الاتفاق' },
      ],
    },
    {
      id: 'direction',
      label: { en: 'Shared strategic direction', ar: 'اتجاه استراتيجي مشترك' },
      values: [false, true, true],
    },
    {
      id: 'reviews',
      label: { en: 'Review rhythm', ar: 'إيقاع المراجعة' },
      values: [
        { en: 'At delivery', ar: 'عند التسليم' },
        { en: 'Per milestone', ar: 'لكل مرحلة' },
        { en: 'Recurring', ar: 'دوري' },
      ],
    },
  ] satisfies EngagementFeature[],
};

export function formatPrice(value: number | null | undefined, locale: Locale): string | null {
  if (value == null || !engagementConfig.currency) return null;
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: engagementConfig.currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function hasBillingToggle(): boolean {
  if (!engagementConfig.currency) return false;
  const modesWithPrices = engagementConfig.billingModes.filter((mode) =>
    engagementConfig.tiers.some((tier) => typeof tier.prices[mode] === 'number'),
  );
  return modesWithPrices.length > 1;
}

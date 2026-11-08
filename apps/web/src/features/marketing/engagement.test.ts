import { describe, expect, it } from 'vitest';
import { engagementConfig, formatPrice, hasBillingToggle } from './engagement';

describe('engagementConfig', () => {
  it('defaults to indicative pricing with null currency so no unapproved fees are invented', () => {
    expect(engagementConfig.status).toBe('indicative');
    expect(engagementConfig.currency).toBeNull();
    expect(hasBillingToggle()).toBe(false);
    for (const tier of engagementConfig.tiers) {
      expect(formatPrice(tier.prices.project, 'en')).toBeNull();
      expect(formatPrice(tier.prices.retainer, 'ar')).toBeNull();
    }
  });

  it('defines three bilingual tiers and five feature comparison rows', () => {
    expect(engagementConfig.tiers).toHaveLength(3);
    expect(engagementConfig.features).toHaveLength(5);
    expect(engagementConfig.tiers.some((t) => t.recommended)).toBe(true);
  });
});

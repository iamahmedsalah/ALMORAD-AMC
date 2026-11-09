import { test, expect } from '@playwright/test';

for (const locale of ['en', 'ar']) for (const width of [390, 1366]) {
  test(`team entrance reverses ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`/${locale}`);
    const wrapper = page.locator('.lp-team-grid-2 .team-card-reveal').first();
    const card = wrapper.locator('.lp-team-portrait-card');
    await expect(wrapper).toHaveAttribute('data-card-in-view', 'false');
    await expect(card).toHaveCSS('scale', '0.985');
    const enter = () => wrapper.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 160, behavior: 'instant' }));
    await enter();
    await expect(wrapper).toHaveAttribute('data-card-in-view', 'true');
    await expect(card).toHaveCSS('scale', '1');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(wrapper).toHaveAttribute('data-card-in-view', 'false');
    await expect(card).toHaveCSS('scale', '0.985');
    await enter();
    await expect(card).toHaveCSS('scale', '1');
    if (width >= 768) {
      const button = page.locator('.director-page-button').nth(1);
      await button.click();
      const specialist = page.locator('[data-director-page]').nth(1).locator('.team-card-reveal').first();
      await specialist.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 160, behavior: 'instant' }));
      await expect(specialist).toHaveAttribute('data-card-in-view', 'true');
      await expect(specialist.locator('article')).toHaveCSS('scale', '1');
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await expect(specialist).toHaveAttribute('data-card-in-view', 'false');
      await expect(button).toHaveAttribute('aria-current', 'step');
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(card).toHaveCSS('scale', 'none');
    await expect(card).toHaveCSS('translate', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

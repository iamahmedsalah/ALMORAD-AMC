import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const destinations = {
  LinkedIn: 'https://www.linkedin.com/company/almorad-amc/',
  Facebook: 'https://www.facebook.com/almoradamc',
  Instagram: 'https://www.instagram.com/almoradamc/',
  X: 'https://x.com/almoradamc',
  TikTok: 'https://www.tiktok.com/@almoradamc',
  YouTube: 'https://www.youtube.com/@AlmoradAMC',
};
for (const locale of ['en', 'ar']) for (const width of [320, 390, 768, 1440]) {
  test(`sidebar socials and reversible reading action ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${locale}/faq`);
    await expect(page.locator('.header-social-bar')).toHaveCount(0);
    const sidebar = page.locator('.social-disclosure-sidebar');
    await sidebar.locator('.social-trigger').click();
    for (const [name, href] of Object.entries(destinations)) await expect(sidebar.getByRole('link', { name: new RegExp(`^${name} \\(`) })).toHaveAttribute('href', href);
    const box = (await sidebar.locator('.social-tray').boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await expect(sidebar.locator('.social-trigger')).toBeFocused();
    await expect(sidebar.locator('.social-trigger')).toHaveAttribute('aria-expanded', 'false');
    const summary = page.locator('.faq-accordion summary').first();
    await summary.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.faq-accordion details').first()).toHaveAttribute('open', '');
    await expect(summary.locator('.faq-accordion-question')).toHaveCSS('transform', 'none');
    await page.keyboard.press('Enter');
    await expect(page.locator('.faq-accordion details').first()).not.toHaveAttribute('open', '');
    await page.goto(`/${locale}`);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const saved = await page.evaluate(() => scrollY);
    expect(saved).toBeGreaterThan(600);
    const back = page.locator('.back-to-top');
    await back.click(); await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await expect(back).toBeVisible(); await expect(back).toHaveAttribute('data-return-available', 'true');
    await back.click(); await expect.poll(() => page.evaluate(() => scrollY)).toBe(saved);
    await expect(back).toHaveAttribute('data-return-available', 'false');
    await back.click(); await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await page.locator('.desktop-nav a[href$="/faq"]').evaluate(el => (el as HTMLAnchorElement).click());
    await expect(page).toHaveURL(new RegExp(`/${locale}/faq$`));
    await expect(page.locator('.back-to-top')).toHaveAttribute('data-return-available', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  });
}

test('FAQ answers remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage(); await page.goto('/en/faq');
  await page.locator('.faq-accordion summary').first().click();
  await expect(page.locator('.faq-accordion-answer').first()).toBeVisible();
  await context.close();
});

test('FAQ height animation survives rapid toggles and live reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.goto('/en/faq');
  const item = page.locator('.faq-accordion details').first(); const summary = item.locator('summary');
  await summary.click(); await summary.click(); await summary.click();
  await expect(item).toHaveAttribute('open', '');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(item.locator('.faq-accordion-answer')).toBeVisible();
  await summary.click(); await expect(item).not.toHaveAttribute('open', '');
});

test('smooth scroll action returns to the saved reading offset', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.goto('/en');
  await expect(page.locator('.amc-preloader')).toHaveAttribute('data-hidden', 'true');
  await page.evaluate(() => scrollTo({ top: 1800, behavior: 'instant' }));
  const saved = await page.evaluate(() => scrollY);
  const button = page.locator('.back-to-top');
  await button.click(); await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(button).toHaveAttribute('data-return-available', 'true');
  await button.click(); await expect.poll(() => page.evaluate(() => scrollY)).toBe(saved);
  await expect(button).toHaveAttribute('data-return-available', 'false');
});

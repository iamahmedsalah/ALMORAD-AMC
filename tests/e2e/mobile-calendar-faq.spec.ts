import { test, expect } from '@playwright/test';
import { mockOperations } from './fixtures/operations';
import { bookingCopy } from '../../apps/web/src/features/booking/copy';

for (const locale of ['en', 'ar'] as const) for (const width of [320, 390, 1440]) {
  test(`mobile identity, header socials, calm FAQ and calendar ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${locale}`);
    await expect(page.locator('.site-header .brand-symbol img:visible')).toHaveCount(1);
    if (width < 1024) {
      await page.locator('.burger-trigger').click();
      await expect(page.locator('.side-drawer .brand-symbol img:visible')).toHaveCount(1);
      await page.keyboard.press('Escape');
    }
    const social = page.locator('.social-disclosure-sidebar .social-trigger');
    await social.click();
    await expect(page.locator('.social-disclosure-sidebar .social-tray a')).toHaveCount(6);
    await page.keyboard.press('Escape');
    const faq = page.locator('.faq-accordion details').first();
    await faq.locator('summary').click();
    await expect(faq.locator('summary .faq-accordion-question').first()).toHaveCSS('transform', 'none');
    await expect(page.locator('.back-to-top')).toBeVisible();
    await page.locator('.back-to-top').click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mockOperations(page);
    await page.goto(`/${locale}/booking`);
    const c = bookingCopy(locale);
    await page.getByRole('button', { name: c.next, exact: true }).click();
    const date = page.locator('.date-picker-trigger');
    const before = await date.innerText();
    await date.click();
    await expect(page.locator('.date-picker-dialog')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    if (locale === 'ar') await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('.date-picker-dialog')).toBeHidden();
    await expect(date).toBeFocused();
    expect(await date.innerText()).not.toBe(before);
    await date.click();
    await page.keyboard.press('Escape');
    await expect(date).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

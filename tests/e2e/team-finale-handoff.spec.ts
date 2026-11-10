import { test, expect } from '@playwright/test';
import { chooseTheme } from './theme';

for (const locale of ['en', 'ar']) for (const theme of ['light', 'dark'] as const) for (const [width, height] of [[1366, 640], [1440, 900]] as const) {
  test(`standalone team booking and landing finale ${locale} ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`/${locale}`);
    await chooseTheme(page, theme);
    await expect(page.locator('#directors')).toHaveCount(0);
    const finale = page.locator('#chapter-booking');
    await finale.scrollIntoViewIfNeeded();
    await expect(finale.locator('.finale-banner-title')).toBeVisible();
    await expect(page.locator('.amc-mark-stage')).toHaveAttribute('data-chapter', '6');
    await page.goto(`/${locale}/team`);
    await expect(page.locator('#directors')).toHaveAttribute('data-reel-active','buttons');
    await page.locator('.lp-team-header a[href$="/booking"]').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/booking$`));
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const locale of ['en', 'ar']) test(`phone finale and reduced motion ${locale}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/${locale}#chapter-booking`);
  const finale = page.locator('#chapter-booking');
  expect(await finale.evaluate(el => parseFloat(getComputedStyle(el).marginBlockStart))).toBeLessThan(160);
  for (const line of await finale.locator('.finale-banner-title .line-inner').all()) await expect(line).toHaveCSS('opacity', '1');
  await expect(finale.getByRole('link', { name: locale === 'ar' ? /\u0627\u062d\u062c\u0632/ : /Book a Growth Consultation/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

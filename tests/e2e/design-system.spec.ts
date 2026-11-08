import { test, expect } from '@playwright/test';
import { chooseTheme } from './theme';

for (const locale of ['en', 'ar']) {
  test(`local typography, squircle grids and shadow-free dark UI ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
    const externalFonts: string[] = [];
    page.on('request', request => { if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) externalFonts.push(request.url()); });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const family = locale === 'ar' ? 'Cairo' : 'Fira Sans';
    expect(await page.evaluate(name => [...document.fonts].some(font => font.family === name && font.status === 'loaded'), family)).toBe(true);
    await expect(page.locator('body')).toHaveCSS('font-family', new RegExp(family));
    expect(externalFonts).toEqual([]);
    await expect(page.locator('.burger-trigger')).toBeHidden();
    await expect(page.locator('.site-header .theme-cycle-button')).toHaveCount(1);
    const grid = await page.locator('.lp-cap-list').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(grid).toBe(1);
    expect(await page.locator('.lp-gallery-track').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
    const radius = await page.locator('.lp-cap-card').first().evaluate(el => parseFloat(getComputedStyle(el).borderTopLeftRadius));
    expect(radius).toBeGreaterThanOrEqual(28);
    const logo = page.locator('.site-header .brand-symbol .brand-lockup-light');
    await expect(logo).toBeVisible();
    expect((await logo.boundingBox())!.width).toBeGreaterThan(30);
    await chooseTheme(page, 'dark');
    await expect(page.locator('.site-header')).toHaveCSS('background-color', 'rgb(247, 118, 30)');
    await expect(page.locator('.site-header .brand-wording')).toContainText(locale === 'ar' ? '\u0627\u0644\u0645\u0631\u0627\u062f' : 'almorad');
    await expect(page.locator('.site-header .brand-symbol .brand-lockup-dark')).toBeVisible();
    await expect(page.locator('.site-header .brand-symbol .brand-lockup-dark')).toHaveAttribute('src', '/brand/amc-mark-on-orange.svg');
    await expect(page.locator('.amc-mark-stage')).toHaveCSS('background-image', 'none');
    await expect(page.locator('.lp-cap-card').first()).toHaveCSS('box-shadow', 'none');
    await expect(page.locator('.amc-static-artwork .brand-lockup-dark')).toHaveAttribute('src', '/brand/amc-mark-on-dark.svg');
    await expect(page.locator('footer .footer-top-grid')).toBeVisible();
    await expect(page.locator('footer .brand-lockup-dark')).toHaveAttribute('src', '/brand/footer-logo-on-dark.svg');
  });
}

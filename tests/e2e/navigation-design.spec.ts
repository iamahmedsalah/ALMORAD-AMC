import { test, expect } from '@playwright/test';

for (const locale of ['en', 'ar']) for (const width of [390, 1440]) {
  test(`restored sliding menu, focus and overflow ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`/${locale}`);
    await expect(page.locator('.amc-preloader')).toHaveAttribute('data-hidden', 'true');
    if (width >= 1024) {
      await expect(page.locator('.burger-trigger')).toBeHidden();
      await expect(page.locator('.desktop-nav')).toBeVisible();
      await expect(page.locator('.desktop-nav a')).toHaveCount(5);
      return;
    }
    const drawer = page.locator('.side-drawer');
    const closed = await drawer.evaluate(el => getComputedStyle(el).transform);
    await page.locator('.burger-trigger').click();
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
    expect(closed).not.toBe('matrix(1, 0, 0, 1, 0, 0)');
    await expect(drawer.locator('.side-drawer-link').first()).toHaveCSS('opacity', '1');
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const links = drawer.locator('a');
    await links.last().focus();
    await page.keyboard.press('Tab');
    await expect(links.first()).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(links.last()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.burger-trigger')).toBeFocused();
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
    await expect(drawer).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('chapter rail exposes icons, focus labels and keyboard navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en');
  const buttons = page.locator('.scroll-hud-rail button');
  await expect(buttons.locator('svg')).toHaveCount(8);
  await buttons.first().focus();
  await expect(buttons.first().locator('.scroll-hud-tooltip')).toHaveCSS('opacity', '1');
  await page.keyboard.press('ArrowDown');
  await expect(buttons.nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.amc-mark-stage')).toHaveAttribute('data-chapter', '1');
  await page.keyboard.press('Home');
  await expect(buttons.first()).toBeFocused();
});

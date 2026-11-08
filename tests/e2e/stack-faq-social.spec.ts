import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['en', 'ar']) for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
  test(`FAQ, compact footer and social disclosure ${locale} ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await page.goto(`/${locale}/faq`);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.faq-accordion details')).toHaveCount(4);
    const summary = page.locator('.faq-accordion summary').first();
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.faq-accordion details').first()).toHaveAttribute('open', '');
    await expect(page.locator('.brand-wording').first()).toContainText(locale === 'ar' ? 'المراد' : 'almorad');
    const trigger = page.locator('footer .social-trigger');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('footer .social-tray a')).toHaveCount(6);
    await expect(page.getByRole('link', { name: /^LinkedIn/ })).toHaveAttribute('href', 'https://www.linkedin.com/company/almorad-amc/');
    await expect(page.getByRole('link', { name: /^Instagram/ })).toHaveAttribute('href', 'https://www.instagram.com/almoradamc/');
    await expect(page.locator('footer .social-demo')).toHaveCount(0);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /^LinkedIn/ })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const tray = (await page.locator('footer .social-tray').boundingBox())!;
    expect(tray.x).toBeGreaterThanOrEqual(0);
    expect(tray.x + tray.width).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.locator('h1').click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
}

for (const locale of ['en', 'ar']) for (const width of [390, 1440]) {
  test(`service cards overlap with GSAP and recover on navigation ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/${locale}`);
    const stack = page.locator('[data-card-stack]');
    await expect(stack).toHaveAttribute('data-stack-active', 'true');
    expect(await stack.evaluate(el => Number(getComputedStyle(el).zIndex))).toBeGreaterThan(await page.locator('.amc-mark-stage').evaluate(el => Number(getComputedStyle(el).zIndex)));
    const cards = page.locator('[data-stack-card]');
    await page.evaluate(() => {
      const third = document.querySelectorAll('[data-stack-card]')[2]!;
      scrollTo(0, scrollY + third.getBoundingClientRect().top - 155);
    });
    await expect.poll(async () => cards.first().evaluate(el => Number(getComputedStyle(el).transform.match(/matrix\(([^,]+)/)?.[1] ?? 1))).toBeLessThan(0.98);
    const first = (await cards.first().boundingBox())!;
    const third = (await cards.nth(2).boundingBox())!;
    expect(third.y).toBeLessThan(first.y + first.height);
    await cards.nth(2).getByRole('link').first().click();
    await expect(page).toHaveURL(/\/services\//);
    await expect(page.locator('[data-card-stack]')).toHaveCount(0);
    await page.goBack();
    await expect(stack).toHaveAttribute('data-stack-active', 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(stack).not.toHaveAttribute('data-stack-active', 'true');
    await expect(cards.first()).toHaveCSS('position', 'relative');
  });
}

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { chooseTheme } from './theme';

for (const locale of ['en', 'ar']) for (const theme of ['light', 'dark'] as const) for (const width of [320, 390, 768, 1440]) {
  test(`team and gallery layout ${locale} ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${locale}/team`);
    await chooseTheme(page, theme);
    const team = page.locator('#chapter-team');
    await expect(team.locator('article')).toHaveCount(8);
    await expect(team.locator('.lp-team-grid-5 article')).toHaveCount(5);
    await expect(page.locator('[data-portfolio-card]')).toHaveCount(0);
    await expect(page.locator('.lp-photo-grid')).toHaveCount(0);
    expect((await team.locator('.lp-team-ceo-portrait').boundingBox())!.width).toBeLessThanOrEqual(width < 768 ? 200 : 260);
    expect((await team.locator('.lp-team-ceo-card').boundingBox())!.width).toBeLessThanOrEqual(960);
    await team.scrollIntoViewIfNeeded();
    await expect(team.locator('.lp-team-preview-note')).toBeVisible();
    expect(await team.locator('article').evaluateAll(cards => cards.every(card => {
      const box = card.getBoundingClientRect();
      return box.left >= -1 && box.right <= innerWidth + 1 && card.scrollWidth <= card.clientWidth + 1;
    }))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).include('#chapter-team').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await team.locator('h1').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `docs/reviews/logo-team-gallery-evidence/team-${locale}-${theme}-${width}.png` });
  });
}

test('supplied logo autoplay hands off to scroll, settles and emits no deprecation', async ({ page }) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    // Count actual GPU draws: transparent-canvas screenshots also include
    // animated DOM underneath and cannot establish whether WebGL is idle.
    for (const Context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const original = Context.prototype.clear;
      Context.prototype.clear = function (...args: Parameters<typeof original>) {
        const canvas = this.canvas;
        if (canvas instanceof HTMLCanvasElement) canvas.dataset.testDrawCount = String(Number(canvas.dataset.testDrawCount ?? 0) + 1);
        return original.apply(this, args);
      };
    }
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/deprecated|SVGLoader/.test(message.text())) errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/en');
  const stage = page.locator('.amc-mark-stage');
  await expect(stage).toHaveAttribute('data-scene-state', 'ready', { timeout: 20000 });
  await page.waitForTimeout(2100);
  const canvas = stage.locator('canvas');
  const first = await canvas.screenshot();
  const autoplayDraws = Number(await canvas.getAttribute('data-test-draw-count'));
  await page.waitForTimeout(1800);
  const second = await canvas.screenshot();
  expect(first.equals(second)).toBe(false);
  expect(Number(await canvas.getAttribute('data-test-draw-count'))).toBeGreaterThan(autoplayDraws);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.evaluate(() => window.scrollTo({ top: document.getElementById('chapter-strategy')!.getBoundingClientRect().top + scrollY - 139, behavior: 'instant' }));
  await expect(stage).toHaveAttribute('data-chapter', '1');
  await expect(canvas).toHaveAttribute('data-render-state', 'settled');
  const settled = await canvas.getAttribute('data-test-draw-count');
  await page.waitForTimeout(600);
  expect(await canvas.getAttribute('data-test-draw-count')).toBe(settled);
  await page.goto('/en/team');
  await page.locator('#chapter-team h1').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-team-card]').first()).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'docs/reviews/logo-team-gallery-evidence/team-normal-motion.png' });
  await page.locator('.lp-team-grid-2').screenshot({ path: 'docs/reviews/logo-team-gallery-evidence/executives-final.png' });
  await page.locator('.lp-team-grid-5').screenshot({ path: 'docs/reviews/logo-team-gallery-evidence/directors-final.png' });
  await expect(page.locator('.lp-photo-grid')).toHaveCount(0);
  expect(errors).toEqual([]);
});

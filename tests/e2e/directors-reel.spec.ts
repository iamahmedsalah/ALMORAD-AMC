import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { chooseTheme } from './theme';

for (const locale of ['en', 'ar']) for (const theme of ['light', 'dark'] as const) for (const [width, height] of [[1280, 768], [1366, 640], [1440, 900], [1536, 720], [1920, 1080]] as const) {
  test(`button groups ${locale} ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(`/${locale}/team`);
    await chooseTheme(page, theme);
    const reel = page.locator('#directors');
    await expect(reel).toHaveAttribute('data-reel-active', 'buttons');
    await expect(reel.locator('.director-page-button')).toHaveCount(3);
    await expect(reel.locator('.directors-reel-controls')).toHaveCount(0);
    await expect(reel.locator('.directors-reel-stage')).toHaveCSS('position', 'static');
    await expect(reel.locator('.lp-team-card-portrait .team-career-accents')).toHaveCount(0);
    await expect(reel.locator('.director-portrait-stage > .team-career-accents')).toHaveCount(5);
    const executives = page.locator('.lp-team-grid-2 .lp-team-portrait-card');
    await expect(executives).toHaveCount(2);
    for (const card of await executives.all()) {
      await expect(card.locator('.team-career-accents > span')).toHaveCount(4);
      await expect(card.locator('.lp-team-card-portrait .team-career-accents')).toHaveCount(0);
      await expect(card).toHaveCSS('background-image', 'none');
      const image = (await card.locator('.lp-team-card-portrait').boundingBox())!;
      expect(image.height).toBeGreaterThanOrEqual(280);
      expect(image.height).toBeGreaterThan(image.width);
      for (const icon of await card.locator('.team-career-accents > span').all()) {
        const box = (await icon.boundingBox())!;
        expect(box.x + box.width <= image.x || box.x >= image.x + image.width).toBe(true);
      }
    }

    await reel.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 110, behavior: 'instant' }));
    const scrollPosition = await page.evaluate(() => scrollY);
    for (let index = 0; index < 3; index++) {
      const button = reel.locator('.director-page-button').nth(index);
      await button.focus();
      await page.keyboard.press('Enter');
      await expect(button).toHaveAttribute('aria-current', 'step');
      const group = reel.locator('[data-director-page]').nth(index);
      await expect(group).toBeVisible();
      for (const card of await group.locator('[data-director-slide]').all()) {
        await expect(card.locator('.team-career-accents > span')).toHaveCount(4);
        await expect(card).toHaveCSS('opacity', '1');
        await expect.poll(() => card.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).isIdentity)).toBe(true);
        await expect(card).toHaveCSS('background-image', 'none');
        const portrait = (await card.locator('.lp-team-card-portrait').boundingBox())!;
        expect(portrait.height).toBeGreaterThanOrEqual(280);
        expect(portrait.height).toBeGreaterThan(portrait.width);
        for (const icon of await card.locator('.team-career-accents > span').all()) {
          const box = (await icon.boundingBox())!;
          expect(box.x + box.width <= portrait.x || box.x >= portrait.x + portrait.width).toBe(true);
        }
      }
      expect(await reel.locator('[data-director-slide]').evaluateAll(cards => cards.filter(card => card.getBoundingClientRect().height > 0).length)).toBe(index === 2 ? 1 : 2);
      const box = (await group.boundingBox())!;
      expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(2);
      if (index === 2) {
        const card = (await group.locator('[data-director-slide]').boundingBox())!;
        expect(Math.abs(card.x + card.width / 2 - width / 2)).toBeLessThan(2);
      }
      expect(Math.abs(await page.evaluate(() => scrollY) - scrollPosition)).toBeLessThan(2);
    }
    await page.mouse.wheel(0, 300);
    await expect(reel.locator('.director-page-button').nth(2)).toHaveAttribute('aria-current', 'step');
    await reel.locator('.director-page-button').nth(1).click();
    for (const card of await reel.locator('[data-director-page]').nth(1).locator('[data-director-slide]').all()) {
      await expect(card).toHaveCSS('opacity', '1');
      await expect.poll(() => card.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).isIdentity)).toBe(true);
    }
    expect((await new AxeBuilder({ page }).include('#chapter-team').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await groupScreenshot();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 1440) await page.locator('.lp-team-grid-2').screenshot({ path: `docs/reviews/directors-reel-evidence/${locale}-${theme}-leadership-cards.png` });
    async function groupScreenshot() {
      await reel.locator('[data-director-page]').nth(1).locator('[data-director-slide]').first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: `docs/reviews/directors-reel-evidence/${locale}-${theme}-${width}-buttons.png` });
    }
  });
}

for (const locale of ['en', 'ar']) for (const width of [320, 390, 430]) {
  test(`phone grid ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/${locale}/team#directors`);
    const reel = page.locator('#directors');
    await expect(reel).not.toHaveAttribute('data-reel-active');
    await expect(reel.locator('.team-career-icon').first()).toHaveCSS('width', '28px');
    await expect(reel.locator('.director-pagination')).toHaveCount(0);
    expect(await reel.locator('[data-director-slide]').evaluateAll(cards => cards.every(card => {
      const box = card.getBoundingClientRect();
      return box.height > 0 && Math.abs(box.x + box.width / 2 - innerWidth / 2) < 2;
    }))).toBe(true);
    await expect(reel.locator('.lp-team-card-portrait .team-career-accents')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const locale of ['en', 'ar']) test(`reduced motion groups ${locale}`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/${locale}/team#directors`);
  const reel = page.locator('#directors');
  await expect(reel).toHaveAttribute('data-reel-active', 'buttons');
  await reel.locator('.director-page-button').nth(1).click();
  await expect(reel.locator('[data-director-page]').nth(1)).toBeVisible();
  await expect(reel.locator('[data-director-page]').nth(1).locator('[data-director-slide]').first()).toHaveCSS('animation-name', 'none');
  await expect(reel.locator('[data-director-page]').nth(1).locator('.team-career-icon').first()).toHaveCSS('animation-name', 'none');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(reel).not.toHaveAttribute('data-reel-active');
  for (const card of await reel.locator('[data-director-slide]').all()) await expect(card).toBeVisible();
});

test('portrait accents pause offscreen and navigation survives rapid group changes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en/team');
  const reel = page.locator('#directors');
  const icon = reel.locator('.team-career-icon').first();
  await expect(icon).toHaveCSS('animation-play-state', 'paused');
  await reel.locator('.director-portrait-stage').first().scrollIntoViewIfNeeded();
  await expect(icon).toHaveCSS('animation-play-state', 'running');
  for (const index of [2, 0, 1, 2]) await reel.locator('.director-page-button').nth(index).click();
  await expect(reel.locator('[data-director-page]').nth(2)).toBeVisible();
  await expect(reel.locator('[data-director-page]').nth(0)).toBeHidden();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(reel.locator('[data-director-page]').nth(2).locator('.team-career-icon')).toHaveCSS('animation-play-state', 'paused');
  await page.goto('/en/services');
  await page.goBack();
  await expect(reel).toHaveAttribute('data-reel-active', 'buttons');
  await expect(reel.locator('.director-page-button').first()).toHaveAttribute('aria-current', 'step');
});

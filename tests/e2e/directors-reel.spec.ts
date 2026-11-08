import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { chooseTheme } from './theme';

for (const locale of ['en', 'ar']) for (const theme of ['light', 'dark'] as const) for (const width of [1280, 1366, 1440, 1536, 1920]) {
  test(`directors slide sequence ${locale} ${theme} ${width}`, async ({ page }) => {
    const height = width <= 1366 ? 768 : width === 1536 ? 864 : width === 1920 ? 1080 : 900;
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`/${locale}`);
    await chooseTheme(page, theme);
    const reel = page.locator('.directors-reel');
    await expect(reel).toHaveAttribute('data-reel-active', /true|manual/);
    const mode = await reel.getAttribute('data-reel-active');
    await expect(reel.locator('[data-director-slide]')).toHaveCount(5);
    await expect(page.locator('.lp-team-ceo-card[data-scroll-card]')).toHaveCount(1);
    await expect(page.locator('.lp-team-grid-2 [data-scroll-card]')).toHaveCount(2);
    await expect(page.locator('.team-career-accents')).toHaveCount(8);
    await expect(page.locator('.lp-photo-grid')).toHaveCount(0);
    await expect(reel.locator('h3')).not.toContainText('CORE PILLARS');
    await expect(reel.locator('.directors-reel-stage')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await reel.scrollIntoViewIfNeeded();
    const next = reel.getByRole('button', { name: locale === 'ar' ? 'التخصص التالي' : 'Next discipline' });
    const previous = reel.getByRole('button', { name: locale === 'ar' ? 'التخصص السابق' : 'Previous discipline' });
    // Start at the first slide even if scrollIntoView centers the long runway.
    await page.evaluate(() => window.scrollTo({ top: document.querySelector('.directors-reel')!.getBoundingClientRect().top + scrollY - 110, behavior: 'instant' }));
    await expect(previous).toBeDisabled();
    for (let index = 0; index < 5; index++) {
      await expect(reel.locator('.directors-reel-controls span')).toHaveText(`0${index + 1} / 05`);
      const card = reel.locator('[data-director-slide]').nth(index);
      await expect(card).toHaveCSS('opacity', '1');
      await expect.poll(async () => {
        const box = (await card.boundingBox())!;
        return box.height > box.width && Math.abs(box.x + box.width / 2 - width / 2) < 2 && (mode === 'manual' || (box.y >= 88 && box.y + box.height <= height + 1));
      }, { message: `Card ${index + 1} settles inside the viewport` }).toBe(true);
      const portrait = (await card.locator('.lp-team-card-portrait').boundingBox())!;
      expect(portrait.height).toBeGreaterThan(portrait.width);
      await expect(card.locator('.lp-team-card-portrait .lp-team-card-badge')).toHaveCount(0);
      await expect(card).toHaveCSS('backdrop-filter', /blur\(/);
      await expect(reel.locator('.directors-reel-ambience')).toHaveCount(0);
      if (index === 0) { await next.focus(); await page.keyboard.press('Enter'); }
      else if (index === 2 && mode === 'true') await page.evaluate(() => {
        const box = document.querySelector('.directors-reel')!.getBoundingClientRect();
        window.scrollTo({ top: box.top + scrollY - 110 + (box.height - innerHeight + 110) * .75, behavior: 'instant' });
      });
      else if (index < 4) await next.click();
    }
    await expect(next).toBeDisabled();
    expect((await new AxeBuilder({ page }).include('.directors-reel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `docs/reviews/directors-reel-evidence/${locale}-${theme}-${width}.png` });
    await previous.click();
    await expect(reel.locator('.directors-reel-controls span')).toHaveText('04 / 05');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(reel).not.toHaveAttribute('data-reel-active');
    await expect(reel.locator('[data-director-slide]')).toHaveCount(5);
    for (const card of await reel.locator('[data-director-slide]').all()) await expect(card).toHaveCSS('visibility', 'visible');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('short screens retain the slider with swipe and arrow controls', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 640 });
  await page.goto('/ar');
  await expect(page.locator('.directors-reel')).toHaveAttribute('data-reel-active', 'manual');
  await expect(page.locator('[data-director-slide]')).toHaveCount(5);
  await page.locator('.team-directors-link').click();
  await expect(page).toHaveURL(/#directors$/);
  for (let index = 1; index < 5; index++) {
    await page.getByRole('button', { name: 'التخصص التالي' }).click();
    await expect(page.locator('.directors-reel-controls span')).toHaveText(`0${index + 1} / 05`);
    await expect.poll(async () => {
      const box = (await page.locator('[data-director-slide]').nth(index).boundingBox())!;
      return Math.abs(box.x + box.width / 2 - 384);
    }).toBeLessThan(2);
  }
  await expect(page.getByRole('button', { name: 'التخصص التالي' })).toBeDisabled();
  expect((await new AxeBuilder({ page }).include('.directors-reel').withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const locale of ['en', 'ar']) for (const width of [320, 390, 430]) {
  test(`phones use a centered readable grid ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`/${locale}#directors`);
    const reel = page.locator('#directors');
    await expect(reel).not.toHaveAttribute('data-reel-active');
    await expect(reel.locator('[data-director-slide]')).toHaveCount(5);
    await expect(reel.locator('.directors-reel-controls')).toHaveCount(0);
    expect(await reel.locator('[data-director-slide]').evaluateAll(cards => cards.every(card => {
      const box = card.getBoundingClientRect();
      return Math.abs(box.x + box.width / 2 - innerWidth / 2) < 2 && getComputedStyle(card).visibility === 'visible';
    }))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('portrait slide enters from the left with a flip and moving career accents', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/en');
  const reel = page.locator('.directors-reel');
  await expect(reel).toHaveAttribute('data-reel-active', 'true');
  await expect(page.locator('.amc-preloader')).toHaveAttribute('data-hidden', 'true');
  const setFraction = async (fraction: number) => page.evaluate(fraction => {
    const box = document.querySelector('.directors-reel')!.getBoundingClientRect();
    window.scrollTo({ top: box.top + scrollY - 110 + (box.height - innerHeight + 110) * fraction, behavior: 'instant' });
  }, fraction);
  await setFraction(0);
  const incoming = reel.locator('[data-director-slide]').nth(1);
  await expect(incoming).toHaveCSS('visibility', 'hidden');
  await setFraction(.18);
  await expect(incoming).toHaveCSS('visibility', 'visible');
  await expect.poll(() => incoming.evaluate(el => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    const box = el.getBoundingClientRect();
    const frame = el.parentElement!.getBoundingClientRect();
    return Math.abs(matrix.m13) > .01 && box.x < frame.x + frame.width / 2;
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/reviews/directors-reel-evidence/portrait-flip-transition.png' });
  await expect(incoming).toHaveCSS('opacity', '1');
  await expect.poll(async () => { const box = (await incoming.boundingBox())!; return Math.abs(box.x + box.width / 2 - 720); }).toBeLessThan(2);
  await page.goto('/en/services');
  await page.goBack();
  await expect(reel).toHaveAttribute('data-reel-active', 'true');
  await expect(reel.locator('[data-director-slide]')).toHaveCount(5);
});

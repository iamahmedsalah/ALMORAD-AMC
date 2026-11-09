import { test, expect } from '@playwright/test';
import { chooseTheme } from './theme';

for (const locale of ['en', 'ar']) for (const theme of ['light', 'dark'] as const) for (const [width, height] of [[1366, 640], [1440, 900]] as const) {
  test(`team to next chapter ${locale} ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`/${locale}`);
    await chooseTheme(page, theme);
    const reel = page.locator('#directors');
    await expect(reel).toHaveAttribute('data-reel-active', 'buttons');
    const finale = page.locator('#chapter-booking');
    expect(await finale.evaluate(el => parseFloat(getComputedStyle(el).marginBlockStart))).toBeLessThanOrEqual(48);
    const heading = finale.locator('.finale-banner-title');
    const lines = heading.locator('.line-inner');
    // Each real group has a different height. The following chapter must use
    // the current document geometry after every group change.
    for (const index of [0, 2, 1]) {
      await reel.locator('.director-page-button').nth(index).click();
      await expect(reel.locator('[data-director-page]').nth(index).locator('[data-director-slide]').first()).toHaveCSS('opacity', '1');
      expect(await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('#directors .team-card-reveal')).map(card => card.getBoundingClientRect()).filter(box => box.height > 0);
        return document.querySelector('.finale-banner-grid')!.getBoundingClientRect().top - Math.max(...cards.map(box => box.bottom));
      })).toBeLessThan(140);
      await heading.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 220, behavior: 'instant' }));
      for (const line of await lines.all()) {
        await expect(line).toHaveCSS('opacity', '1');
        await expect.poll(() => line.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).isIdentity)).toBe(true);
      }
      const box = (await heading.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(88);
      expect(box.y + box.height).toBeLessThan(height);
    }
    await page.screenshot({ path: `docs/reviews/directors-reel-evidence/${locale}-${theme}-${width}-finale-handoff.png` });
    await finale.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 128, behavior: 'instant' }));
    await expect(page.locator('.amc-mark-stage')).toHaveAttribute('data-chapter', '8');
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

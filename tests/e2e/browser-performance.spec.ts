import { test, expect } from '@playwright/test';

for (const locale of ['en', 'ar']) for (const width of [390, 1440]) {
  test(`logo priority and bounded showreel drawing ${locale} ${width}`, async ({ page }) => {
    const warnings: string[] = [];
    page.on('console', message => { if (/GSAP target.*not found|Largest Contentful Paint|preloaded.*not used/i.test(message.text())) warnings.push(message.text()); });
    page.on('pageerror', error => warnings.push(error.message));
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.createLinearGradient;
      CanvasRenderingContext2D.prototype.createLinearGradient = function (...args: Parameters<typeof original>) {
        if (this.canvas.classList.contains('lp-showreel-canvas') && args[0] === 0 && args[1] === 0 && args[2] === this.canvas.width) this.canvas.dataset.testFrames = String(Number(this.canvas.dataset.testFrames ?? 0) + 1);
        return original.apply(this, args);
      };
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/${locale}`);
    for (const logo of await page.locator('.site-header .brand-symbol img').all()) {
      await expect(logo).toHaveAttribute('loading', 'eager');
      await expect(logo).toHaveAttribute('fetchpriority', 'high');
    }
    const canvas = page.locator('.lp-showreel-canvas');
    const frames = async () => Number(await canvas.getAttribute('data-test-frames'));
    await expect.poll(frames).toBeGreaterThan(0);
    await page.waitForTimeout(400);
    const offscreen = await frames();
    await page.waitForTimeout(500);
    expect(await frames()).toBe(offscreen);
    await canvas.scrollIntoViewIfNeeded();
    await expect.poll(frames).toBeGreaterThan(offscreen + 2);
    const start = await page.evaluate(() => ({ time: performance.now(), frames: Number(document.querySelector<HTMLCanvasElement>('.lp-showreel-canvas')!.dataset.testFrames ?? 0) }));
    await page.waitForTimeout(1000);
    const end = await page.evaluate(() => ({ time: performance.now(), frames: Number(document.querySelector<HTMLCanvasElement>('.lp-showreel-canvas')!.dataset.testFrames ?? 0) }));
    expect((end.frames - start.frames) / ((end.time - start.time) / 1000)).toBeLessThanOrEqual(31);
    await expect(page.locator('.lp-showreel-video-mirror')).toHaveCount(0);
    const pause = page.locator('.lp-showreel-btn');
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(150); // Allow the final still frame after pausing.
    const paused = await frames();
    await page.waitForTimeout(500);
    expect(await frames()).toBe(paused);
    await page.locator('.lp-showreel-chapter').nth(2).click();
    await expect(page.locator('.lp-showreel-chapter').nth(2)).toHaveAttribute('data-active', 'true');
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
    const resumed = await frames();
    await expect.poll(frames).toBeGreaterThan(resumed + 2);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(page.locator('.hero-copy')).toBeInViewport();
    await page.waitForTimeout(800);
    const hidden = await frames();
    await page.waitForTimeout(500);
    expect(await frames()).toBe(hidden);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await canvas.scrollIntoViewIfNeeded();
    await expect(pause).toBeDisabled();
    await page.waitForTimeout(400);
    const still = await frames();
    await page.waitForTimeout(500);
    expect(await frames()).toBe(still);
    expect(warnings).toEqual([]);
  });
}

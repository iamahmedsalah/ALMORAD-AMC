import {test, expect} from '@playwright/test';

for (const locale of ['en', 'ar']) for (const theme of ['light', 'dark']) for (const width of [320, 390, 430]) {
  test(`phone services and scrollable drawer ${locale} ${theme} ${width}`, async ({page}) => {
    test.setTimeout(90000);
    await page.setViewportSize({width, height: 500});
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await page.goto(`/${locale}`);
    await expect(page.locator('.amc-preloader')).toHaveAttribute('data-hidden', 'true');
    const trigger = page.locator('.burger-trigger');
    const previous = await page.evaluate(() => ({root: document.documentElement.style.overflow, body: document.body.style.overflow}));
    await trigger.click();
    const drawer = page.locator('.side-drawer');
    await expect(drawer).toHaveAttribute('data-open', 'true');
    await expect(drawer).toHaveCSS('scrollbar-width', 'none');
    await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await drawer.getByRole('link').last().focus();
    await drawer.getByRole('link').last().scrollIntoViewIfNeeded();
    await expect.poll(() => drawer.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    await expect(drawer.getByRole('link').last()).toBeInViewport();
    if (width === 390) await page.screenshot({path: `docs/reviews/phone-services/menu-${locale}-${theme}.png`});
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(drawer).toHaveCSS('visibility', 'hidden');
    expect(await page.evaluate(() => ({root: document.documentElement.style.overflow, body: document.body.style.overflow}))).toEqual(previous);
    await page.setViewportSize({width, height:700});

    const links = page.locator('.pillar-service-links').first();
    await links.scrollIntoViewIfNeeded();
    const boxes = await links.locator('li').evaluateAll(nodes => nodes.map(node => {
      const r = node.getBoundingClientRect(); return {x:r.x, y:r.y, right:r.right, bottom:r.bottom, height:r.height};
    }));
    for (const [index, box] of boxes.entries()) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      for (const other of boxes.slice(index + 1)) {
        expect(other.x >= box.right + 11 || box.x >= other.right + 11 || other.y >= box.bottom + 11 || box.y >= other.bottom + 11).toBe(true);
      }
    }
    if (width === 390) await page.screenshot({path: `docs/reviews/phone-services/buttons-${locale}-${theme}.png`});
    const gallery = page.locator('[data-gallery-track]');
    await expect(gallery.locator('[data-service-card]')).toHaveCount(11);
    // All cards must receive the same 3D reveal as the possibility examples,
    // including on a phone shorter than the old 760px animation threshold.
    await expect.poll(() => gallery.locator('[data-service-card]').last().getAttribute('style')).toContain('perspective');
    await expect(gallery).not.toHaveAttribute('data-service-stack', 'true');
    for (const card of await gallery.locator('[data-service-card]').all()) {
      await card.scrollIntoViewIfNeeded();
      await expect.poll(() => card.evaluate(node => {
        const m = new DOMMatrix(getComputedStyle(node).transform);
        return Math.abs(m.m41) + Math.abs(m.m42) + Math.abs(m.m11 - 1);
      })).toBeLessThan(.01);
    }
    if (width === 390) await page.screenshot({path: `docs/reviews/phone-services/gallery-${locale}-${theme}.png`});
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect(gallery.locator('[data-service-card]').first()).toHaveCSS('transform', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('service posters load directly without the hosted optimizer route', async ({page}) => {
  const failures: string[] = [];
  page.on('response', response => {
    if (response.status() >= 400 && /studio.*(?:services|webp)/.test(response.url())) failures.push(response.url());
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/en');
  await expect(page.locator('.amc-preloader')).toHaveAttribute('data-hidden', 'true');
  for (const scene of ['marketing','advertising','consulting','web-development']) {
    const poster = page.locator(`.service-motion-stage[data-scene="${scene}"] img`);
    await poster.scrollIntoViewIfNeeded();
    await expect.poll(() => poster.evaluate(image => new URL((image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src).pathname)).toBe(`/studio/services/${scene}.webp`);
    await expect.poll(() => poster.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const response = await page.request.get(`/studio/services/${scene}.webp`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/webp');
  }
  await page.screenshot({path:'docs/reviews/phone-services/direct-service-poster.png'});
  expect(failures).toEqual([]);
});

test('missing service poster still uses the existing fallback artwork', async ({page}) => {
  await page.route('**/studio/services/*.webp', route => route.fulfill({status:404,body:''}));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/en');
  for (const scene of ['marketing','advertising','consulting','web-development']) {
    const poster = page.locator(`.service-motion-stage[data-scene="${scene}"] img`);
    await poster.scrollIntoViewIfNeeded();
    await expect(poster).toHaveAttribute('src', /^\/studio\/studio-\d+\.svg$/);
    await expect.poll(() => poster.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
});

for (const width of [768, 834, 1024, 1280, 1440]) {
  test(`existing wider gallery animation ${width}`, async ({page}) => {
    test.setTimeout(90000);
    await page.setViewportSize({width, height:1000});
    await page.goto('/en');
    const gallery = page.locator('[data-gallery-track]');
    await expect(gallery).toHaveAttribute('data-service-stack', 'true');
    await expect(gallery.locator('[data-service-card]').first()).toHaveCSS('position', 'sticky');
    await expect.poll(() => gallery.locator('[data-service-card]').last().getAttribute('style')).toContain('rotate(');
    await page.setViewportSize({width:390, height:700});
    await expect(gallery).not.toHaveAttribute('data-service-stack', 'true');
    await expect.poll(() => gallery.locator('[data-service-card]').last().getAttribute('style')).toContain('perspective');
    await page.setViewportSize({width, height:1000});
    await expect(gallery).toHaveAttribute('data-service-stack', 'true');
  });
}

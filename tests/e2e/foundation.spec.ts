import {chooseTheme} from './theme';
import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for (const locale of ['en','ar']) for (const width of [320,390,768,1440]) for (const theme of ['light','dark']) {
  test(`${locale} ${theme} ${width}px`, async ({page}) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); page.on('console', message => {if (message.type() === 'error' && /hydration|hydrated|did not match/i.test(message.text())) errors.push(message.text());});
    await page.setViewportSize({width,height:1000});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(`/${locale}`);
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await expect(page.locator('html')).toHaveAttribute('dir',locale === 'ar' ? 'rtl' : 'ltr');
    await chooseTheme(page, theme as 'light' | 'dark');
    await expect(page.locator('html')).toHaveClass(new RegExp(theme));
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
    await page.screenshot({path:`test-results/${locale}-${theme}-${width}.png`,fullPage:false});
    await page.goto(`/${locale}/services`);
    await expect(page.locator('.service-group li')).toHaveCount(11);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
    if ([390,1440].includes(width)) await page.screenshot({path: 'test-results/services-' + locale + '-' + theme + '-' + width + '.png',fullPage:true});
    await expect(page.locator('html')).toHaveClass(new RegExp(theme));
    await page.locator('.locale-link').first().click();
    await expect(page).toHaveURL(new RegExp(`/${locale === 'en' ? 'ar' : 'en'}/services`));
    expect(errors).toEqual([]);
  });
}
test('core content works without JavaScript; unknown routes are 404', async ({browser,request}) => {
  const context = await browser.newContext({javaScriptEnabled:false,baseURL:test.info().project.use.baseURL}); const page = await context.newPage();
  await page.goto('/ar/services'); await expect(page.locator('.service-group li')).toHaveCount(11); await context.close();
  expect((await request.get('/en/services/branding')).status()).toBe(200);
  expect((await request.get('/en/services/unknown-offering')).status()).toBe(404);
  expect((await request.get('/fr')).status()).toBe(404);
});

test('keyboard navigation, mobile disclosure and system theme', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({colorScheme:'light'});
  await page.goto('/en');
  await expect(page.locator('.amc-preloader')).toHaveAttribute('data-hidden', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.locator('.burger-trigger').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.burger-trigger')).toBeFocused();
  await chooseTheme(page, 'system');
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.emulateMedia({colorScheme:'dark'});
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('preview SEO is safe and all public navigation resolves', async ({page,request}) => {
  await page.goto('/en');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
  const organization = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(organization!).name).toBe('ALMORAD AMC');
  expect((await request.get('/robots.txt')).status()).toBe(200);
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
  expect((await request.get('/staff/dashboard')).status()).toBe(404);
  const links = await page.locator('a[href^="/"]').evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute('href')!))]);
  for (const href of links) expect((await request.get(href)).ok()).toBe(true);
});

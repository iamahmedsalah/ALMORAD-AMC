import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {pillars, services} from '../../packages/shared/src/index';
import {mockOperations} from './fixtures/operations';
import {bookingCopy} from '../../apps/web/src/features/booking/copy';

for (const locale of ['en','ar']) for (const theme of ['light','dark']) for (const width of [390,1440]) {
  test(`route and slug control consistency ${locale} ${theme} ${width}`, async ({page}) => {
    test.setTimeout(120000); // A complete route sweep, not one screen interaction.
    await page.setViewportSize({width,height:1000});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await mockOperations(page);
    const paths = ['', '/about','/services', ...pillars.map(pillar => `/services/${pillar.id}`), ...services.map(service => `/services/${service.slug}`), '/work','/contact','/faq','/credits','/booking','/booking/manage','/staff','/staff/login','/staff/calendar','/staff/settings','/staff/analytics'];
    for (const path of paths) {
      const response = await page.goto(`/${locale}${path}`);
      expect(response?.status(),path).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('dir',locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('.site-header .theme-cycle-button')).toHaveAttribute('data-theme-ready','true');
      const inconsistent = await page.locator('button,.button,.badge,.locale-switch-btn,input:not([type="checkbox"]):not([type="radio"]),textarea').evaluateAll(elements => elements.filter(el => getComputedStyle(el).borderTopLeftRadius !== '20px').map(el => el.outerHTML.slice(0,150)));
      expect(inconsistent,path).toEqual([]);
      if (theme === 'dark') {
        await expect(page.locator('.site-header .brand-symbol')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
        await expect(page.locator('.site-header')).toHaveCSS('background-color','rgb(247, 118, 30)');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),path).toBe(true);
    }
  });
  test(`contact validation, retry and success ${locale} ${theme} ${width}`, async ({page}) => {
    await page.setViewportSize({width,height:1000});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await page.goto(`/${locale}/contact`);
    const form = page.locator('.contact-form-panel form');
    await form.locator('[type="submit"]').click();
    await expect(page.locator('#contact-name')).toBeFocused();
    await expect(form.locator('#contact-error')).toBeVisible();
    await expect(form.locator('.field-error')).toHaveCount(4);
    await page.locator('#contact-name').fill('Synthetic browser fixture');
    await page.locator('#contact-email').fill('fixture@example.invalid');
    await page.locator('#contact-message').fill('Synthetic contact inquiry for browser verification only.');
    await form.locator('[name="consent"]').check();
    const bodies:Record<string,unknown>[] = [];
    await page.route('**/api/contact/submit', async route => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill({status:bodies.length === 1 ? 503 : 201,contentType:'application/json',body:JSON.stringify(bodies.length === 1 ? {message:'Synthetic unavailable'} : {accepted:true})});
    });
    await form.locator('[type="submit"]').click();
    await expect(form.locator('#contact-error')).toBeVisible();
    await expect(page.locator('#contact-message')).toHaveValue('Synthetic contact inquiry for browser verification only.');
    await form.locator('[type="submit"]').click();
    await expect(page.locator('.contact-success')).toBeFocused();
    expect(bodies).toHaveLength(2);
    expect(bodies[0]?.idempotencyKey).toBe(bodies[1]?.idempotencyKey);
    expect(bodies[1]).toMatchObject({locale,consent:true});
    await page.locator('.contact-success button').click();
    await expect(page.locator('#contact-name')).toHaveValue('');
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  });
}

for (const locale of ['en','ar'] as const) for (const reducedMotion of ['reduce','no-preference'] as const) {
  test(`shared dialog opening and closing ${locale} ${reducedMotion}`, async ({page}) => {
    await page.setViewportSize({width:390,height:1000});
    await page.emulateMedia({reducedMotion});
    await page.addInitScript(() => localStorage.setItem('theme','dark'));
    await mockOperations(page);
    await page.goto(`/${locale}/booking`);
    const c = bookingCopy(locale);
    await page.getByRole('combobox',{name:c.service,exact:true}).click();
    await expect(page.locator('.ui-select-content')).toHaveCSS('border-top-left-radius','20px');
    await expect(page.locator('.ui-select-content')).toHaveCSS('animation-name',reducedMotion === 'reduce' ? 'none' : 'disclosure-enter');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();
    await page.getByRole('button',{name:c.next,exact:true}).click();
    const trigger = page.locator('.date-picker-trigger');
    await trigger.click();
    const dialog = page.locator('.date-picker-dialog');
    await expect(dialog).toHaveCSS('border-top-left-radius','20px');
    await expect(dialog).toHaveCSS('animation-name',reducedMotion === 'reduce' ? 'none' : 'disclosure-enter');
    await expect(dialog).toHaveCSS('opacity','1');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

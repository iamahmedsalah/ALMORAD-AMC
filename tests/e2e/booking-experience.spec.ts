import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {booking,schedule,mockOperations,fixtureScreenshot} from './fixtures/operations';
import {bookingCopy} from '../../apps/web/src/features/booking/copy';

for(const locale of ['en','ar'] as const)for(const theme of ['light','dark'])for(const width of [320,390,768,1440]) {
 test(`booking experience ${locale} ${theme} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(value=>localStorage.setItem('theme',value),theme);await mockOperations(page);
  for(const path of ['booking','booking/manage','staff/calendar','staff/inquiries','staff/settings']) {
   await page.goto(`/${locale}/${path}`+(path==='booking/manage'?`#id=${booking.id}&token=${'a'.repeat(64)}`:''));
   if(path==='booking')await expect(page.locator('.booking-choice-grid')).toBeVisible();
   if(path==='booking/manage') {
    await expect(page.locator('.appointment-status')).toHaveText(bookingCopy(locale).CONFIRMED);
    await expect(page.locator('.calendar-actions a')).toHaveAttribute('href',/calendar.google.com/);
    await expect(page.locator('.change-choice')).toHaveCount(2);
   }
   if(path==='staff/calendar')await expect(page.locator('.calendar-appointment')).toBeVisible();
   if(path==='staff/inquiries')await expect(page.getByRole('link',{name:'+1 202 555 0100',exact:true})).toHaveAttribute('href','tel:+12025550100');
   if(path==='staff/settings')await expect(page.locator('.booking-settings > fieldset')).toBeEnabled();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
   if(width===390||width===1440)await fixtureScreenshot(page,`docs/reviews/booking-experience/${locale}-${theme}-${width}-${path.replaceAll('/','-')}.png`,true);
  }
 });
}
test('closed appointments hide calendar and change actions',async({page})=>{
 await mockOperations(page);await page.route('**/api/booking/manage',route=>route.fulfill({json:{booking:{...booking,status:'CANCELLED'},schedule}}));
 await page.goto(`/en/booking/manage#id=${booking.id}&token=${'a'.repeat(64)}`);
 await expect(page.locator('.appointment-status')).toHaveText('Cancelled');
 await expect(page.locator('.calendar-actions')).toHaveCount(0);await expect(page.locator('.change-choices')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Email appointment details',exact:true})).toHaveCount(0);
});
test('format filtering reaches the API and staff can add an online meeting link',async({page})=>{
 await mockOperations(page);await page.goto('/en/staff/calendar');
 await page.locator('.agenda-filter-panel > summary').click();await page.getByRole('combobox',{name:'Meeting format',exact:true}).click();await page.getByRole('option',{name:'Online',exact:true}).click();
 const filtered=page.waitForRequest(r=>r.url().includes('/staff/appointments?')&&new URL(r.url()).searchParams.get('format')==='ONLINE');
 await page.getByRole('button',{name:'Apply filters',exact:true}).click();await filtered;
 await page.locator('.calendar-appointment').click();await expect(page.locator('input[name="meetingUrl"]')).toBeVisible();
});
for(const locale of ['en','ar'])test(`inquiry includes the visitor phone ${locale}`,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await mockOperations(page);let submitted:Record<string,unknown>|undefined;
 await page.route('**/api/contact/submit',route=>{submitted=route.request().postDataJSON();return route.fulfill({json:{accepted:true}});});
 await page.goto(`/${locale}/contact`);
 await expect(page.locator('.amc-preloader[data-hidden="false"]')).toHaveCount(0);
 await page.locator('#contact-name').fill('UI Fixture Inquiry');await page.locator('#contact-email').fill('inquiry@example.invalid');
 await page.locator('#contact-phone').fill('+1 202 555 0100');await page.locator('#contact-message').fill('Synthetic inquiry for browser testing only.');
 await page.locator('#contact-message').press('Tab');await expect(page.locator('#contact-err-message')).toBeVisible();
 await page.locator('.contact-consent input').check();await page.locator('.contact-form-panel button[type="submit"]').click();
 await expect(page.locator('.contact-success')).toBeVisible();expect(submitted?.phone).toBe('+1 202 555 0100');
});

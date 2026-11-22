import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {booking,mockOperations,fixtureScreenshot} from './fixtures/operations';
import {bookingCopy} from '../../apps/web/src/features/booking/copy';

for(const locale of ['en','ar'] as const)for(const theme of ['light','dark'])for(const width of [390,1440]){
 test(`client recovery and status ${locale} ${theme} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(value=>localStorage.setItem('theme',value),theme);await mockOperations(page);
  await page.goto(`/${locale}/booking/manage`);await expect(page.locator('.appointment-recovery')).toBeVisible();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  let submitted:Record<string,unknown>|undefined;
  await page.route('**/api/booking/recover',async route=>{submitted=route.request().postDataJSON();await route.fulfill({json:{accepted:true}});});
  await page.locator('.appointment-recovery input').fill('+20 100 123 4567');
  await page.locator('.appointment-recovery button').click();
  await expect(page.locator('.appointment-recovery [role=status]')).toBeVisible();expect(submitted?.identifier).toBe('+20 100 123 4567');
  await fixtureScreenshot(page,`docs/reviews/client-access/${locale}-${theme}-${width}-recovery.png`,true);
  await page.goto(`/${locale}/booking/manage#id=${booking.id}&token=${'a'.repeat(64)}`);
  await expect(page.locator('.appointment-status')).toBeVisible();
  let release!:()=>void;const waiting=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/booking/manage',async route=>{await waiting;await route.fulfill({json:{booking,schedule:(await import('./fixtures/operations')).schedule}});});
  const refresh=page.getByRole('button',{name:locale==='ar'?'تحديث الحالة':'Refresh status',exact:true});
  await refresh.click();await expect(refresh).toHaveAttribute('aria-busy','true');await expect(refresh.locator('svg')).toBeVisible();release();
  await expect(refresh).toHaveAttribute('aria-busy','false');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await fixtureScreenshot(page,`docs/reviews/client-access/${locale}-${theme}-${width}-appointment.png`,true);
  await page.goto(`/${locale}/booking/manage`);await expect(page.locator('.appointment-status')).toBeVisible();
 });
}

test('manager can edit an assigned meeting but cannot reassign or delete it',async({page})=>{
 await mockOperations(page,'MANAGER');await page.goto('/en/staff/calendar');
 await page.locator('.calendar-appointment').click();await expect(page.locator('input[name=meetingUrl]')).toBeVisible();
 await expect(page.locator('input[name=assignedToId]')).toHaveCount(0);
 const action=page.getByRole('combobox',{name:'Action',exact:true});await action.click();
 await expect(page.getByRole('option',{name:'Delete appointment',exact:true})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Meeting inquiries',exact:true})).toHaveCount(0);
});

test('admin can choose a manager and delete with an explicit reason',async({page})=>{
 await mockOperations(page,'ADMIN');await page.goto('/en/staff/calendar');await page.locator('.calendar-appointment').click();
 await expect(page.getByRole('combobox',{name:'Assigned manager',exact:true})).toBeVisible();
 await page.getByRole('combobox',{name:'Action',exact:true}).click();await page.getByRole('option',{name:'Delete appointment',exact:true}).click();
 await expect(page.getByRole('note')).toContainText('audit history');await expect(page.locator('textarea[name=reason]')).toBeVisible();
});

test('booking goes directly to the appointment and recovery remains available after browser storage is cleared',async({page})=>{
 const copy=bookingCopy('en');await mockOperations(page);await page.goto('/en/booking');
 await page.getByRole('button',{name:copy.next,exact:true}).click();
 await page.locator('.booking-slots label').first().click();await page.getByRole('button',{name:copy.next,exact:true}).click();
 await page.locator('input[name=clientName]').fill('UI Fixture Client');await page.locator('input[name=clientTitle]').fill('Founder');await page.locator('input[name=company]').fill('Fixture Co');await page.locator('input[name=email]').fill('fixture@example.invalid');await page.locator('input[name=phone]').fill('+1 202 555 0100');
 await page.locator('.booking-check input').check();await page.getByRole('button',{name:copy.confirm,exact:true}).click();
 await page.getByRole('link',{name:'Go to your appointment',exact:true}).click();await expect(page.locator('.appointment-status')).toBeVisible();
 await page.evaluate(()=>sessionStorage.clear());await page.goto('/en/booking/manage');await expect(page.locator('.appointment-recovery')).toBeVisible();
});

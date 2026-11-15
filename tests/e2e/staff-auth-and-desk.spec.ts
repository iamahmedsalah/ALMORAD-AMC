import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {booking,schedule,mockOperations,fixtureScreenshot} from './fixtures/operations';
import {authCopy} from '../../apps/web/src/features/staff/auth-copy';
import {deskCopy} from '../../apps/web/src/features/booking/desk-copy';
import {bookingCopy} from '../../apps/web/src/features/booking/copy';

const managers=[{id:'00000000-0000-4000-8000-000000000002',email:'first@example.invalid',firstName:'First',lastName:'Manager'},{id:'00000000-0000-4000-8000-000000000003',email:'second@example.invalid',firstName:'Second',lastName:'Manager'}];
const detail={...booking,assignees:managers.map(staff=>({staff})),meetingUrl:'https://meet.google.com/abc-defg-hij',hubspotMeetingUrl:'https://app.hubspot.com/contacts/123/record/0-47/456'};
async function mocks(page:import('@playwright/test').Page,role:'ADMIN'|'MANAGER'|'RECEPTIONIST'='ADMIN'){
 await mockOperations(page,role);
 await page.route('**/api/staff/appointments/assignees',route=>route.fulfill({json:managers}));
 await page.route('**/api/staff/appointments/detail?*',route=>route.fulfill({json:{booking:detail}}));
 await page.route('**/api/staff/appointments?*',route=>route.fulfill({json:{items:[detail],total:1,page:0,timezone:'Africa/Cairo',isDemo:true,googleMeetEnabled:true}}));
 await page.route('**/api/staff/auth/forgot-password',route=>route.fulfill({json:{accepted:true}}));
 await page.route('**/api/staff/auth/reset-password',route=>route.fulfill({status:400,json:{message:'Invalid or expired reset code'}}));
}

for(const locale of ['en','ar'] as const)for(const theme of ['light','dark'])for(const width of [320,360,390,430,768,834,1024,1280,1440]){
 test(`auth and desk accessibility ${locale} ${theme} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:width===1024?768:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(value=>localStorage.setItem('theme',value),theme);await mocks(page);
  for(const path of ['staff/login','staff/forgot-password','booking','staff/calendar']){
   await page.goto(`/${locale}/${path}`);await expect(page.locator('.amc-preloader')).toHaveAttribute('data-hidden','true');
   if(path==='staff/login')await expect(page.locator('input[name="email"]')).toBeEnabled();
   if(path==='staff/forgot-password')await expect(page.getByRole('heading',{name:authCopy(locale).title})).toBeVisible();
   if(path==='booking')await expect(page.locator('.booking-summary')).toBeVisible();
   if(path==='staff/calendar'){await page.locator('.calendar-appointment').first().click();await expect(page.locator('.appointment-detail-panel')).toBeVisible();await expect(page.getByRole('tab',{name:deskCopy(locale).detail,exact:true})).toBeVisible();}
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  }
  await fixtureScreenshot(page,`docs/reviews/auth-overhaul/${locale}-${theme}-${width}.png`,true);
 });
}
for(const locale of ['en','ar'] as const){
 test(`OTP feedback, resend cooldown and successful reset ${locale}`,async({page})=>{
  const c=authCopy(locale);await mocks(page);await page.goto(`/${locale}/staff/forgot-password`);await page.locator('input[name="email"]').fill('staff@example.invalid');
  await page.getByRole('button',{name:c.send,exact:true}).click();await expect(page.getByText(c.sent,{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:new RegExp(c.resend)})).toBeDisabled();
  await page.locator('input[name="code"]').fill('123456');await page.locator('input[name="newPassword"]').fill('Synthetic password only 123');await page.getByRole('button',{name:c.show,exact:true}).click();await expect(page.locator('input[name="newPassword"]')).toHaveAttribute('type','text');
  await page.getByRole('button',{name:c.reset,exact:true}).click();await expect(page.locator('.auth-recovery [role="alert"]')).toHaveText(c.invalid);
  await page.route('**/api/staff/auth/reset-password',route=>route.fulfill({json:{reset:true}}));await page.getByRole('button',{name:c.reset,exact:true}).click();await expect(page.getByText(c.done,{exact:true})).toBeVisible();
 });
 test(`dialog focus and mounted edit fields across tabs ${locale}`,async({page})=>{
  const c=deskCopy(locale);await mocks(page);await page.emulateMedia({reducedMotion:'reduce'});await page.goto(`/${locale}/staff/calendar`);
  const trigger=page.getByRole('button',{name:c.newBooking,exact:true});await trigger.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();
  await page.locator('.calendar-appointment').first().click();await page.locator('input[name="clientName"]').fill('Preserved draft');
  await page.getByRole('tab').nth(1).click();await expect(page.locator('input[name="meetingUrl"]')).toBeVisible();await page.locator('.appointment-detail-panel .assignee-picker button').click();
  await page.getByRole('checkbox',{name:'Second Manager'}).uncheck();await page.keyboard.press('Escape');await page.getByRole('tab',{name:c.detail,exact:true}).click();await expect(page.locator('input[name="clientName"]')).toHaveValue('Preserved draft');
  let payload:Record<string,unknown>|undefined;await page.route('**/api/staff/appointments/action',async route=>{payload=route.request().postDataJSON();await route.fulfill({json:{booking:detail}});});
  await page.locator('textarea[name="reason"]').fill('Synthetic staff review');await page.getByRole('button',{name:c.save,exact:true}).click();await expect.poll(()=>payload?.assigneeIds).toEqual([managers[0]!.id]);expect(payload?.clientName).toBe('Preserved draft');
 });
 test(`manager default range, permissions and public slot buckets ${locale}`,async({page})=>{
  await mocks(page,'MANAGER');let query='';page.on('request',request=>{if(new URL(request.url()).pathname==='/api/staff/appointments')query=request.url();});await page.goto(`/${locale}/staff/calendar`);await expect(page.locator('.calendar-appointment')).toBeVisible();
  const url=new URL(query);expect((Date.parse(url.searchParams.get('to')!)-Date.parse(url.searchParams.get('from')!))/86400000).toBe(30);await expect(page.getByRole('button',{name:locale==='ar'?'غير معين':'Unassigned',exact:true})).toHaveCount(0);
  await page.goto(`/${locale}/booking`);await page.getByRole('button',{name:bookingCopy(locale).next,exact:true}).click();await expect(page.locator('.slot-bucket h3')).toHaveCount(1);
  await page.route('**/api/booking/slots?*',route=>{const date=new URL(route.request().url()).searchParams.get('date');return route.fulfill({json:{slots:date===new Date().toISOString().slice(0,10)?[]:[{startsAt:booking.startsAt,endsAt:booking.endsAt}],timezone:schedule.timezone,isDemo:true}});});
 });
 test(`bounded next available day and Meet generation ${locale}`,async({page})=>{
  await mocks(page);let calls=0;
  await page.route('**/api/booking/slots?*',route=>{calls++;return route.fulfill({json:{slots:calls===1?[]:[{startsAt:booking.startsAt,endsAt:booking.endsAt}],timezone:schedule.timezone,isDemo:true}});});
  await page.goto(`/${locale}/booking`);await page.getByRole('button',{name:bookingCopy(locale).next,exact:true}).click();
  await page.getByRole('button',{name:locale==='ar'?'أقرب يوم متاح':'Next available day',exact:true}).click();await expect(page.getByRole('radio')).toHaveCount(1);expect(calls).toBeLessThanOrEqual(15);
  let generated=false;const pending={...detail,isDemo:false,meetingUrl:null};
  await page.route('**/api/staff/appointments/detail?*',route=>route.fulfill({json:{booking:generated?{...pending,meetingUrl:detail.meetingUrl}:pending}}));
  await page.route('**/api/staff/appointments/meet-link',route=>{expect(route.request().headers()['x-csrf-token']).toBe('ui-fixture-csrf');generated=true;return route.fulfill({json:{meetingUrl:detail.meetingUrl,googleEventId:'synthetic-event'}});});
  await page.goto(`/${locale}/staff/calendar`);await page.locator('.calendar-appointment').first().click();await page.getByRole('tab').nth(1).click();
  await page.getByRole('button',{name:locale==='ar'?'إنشاء رابط Google Meet':'Generate Google Meet link',exact:true}).click();await expect(page.getByRole('link',{name:locale==='ar'?'الانضمام للاجتماع':'Join meeting',exact:true})).toBeVisible();expect(generated).toBe(true);await expect(page.locator('input[name="meetingUrl"]')).toHaveValue(detail.meetingUrl);
 });
}

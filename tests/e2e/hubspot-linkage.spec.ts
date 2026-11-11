import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {booking,mockOperations,fixtureScreenshot} from './fixtures/operations';
for(const locale of ['en','ar'] as const)for(const theme of ['light','dark'])for(const width of [390,1440]){
 test(`staff HubSpot links ${locale} ${theme} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(value=>localStorage.setItem('theme',value),theme);await mockOperations(page);
  const contactUrl='https://app.hubspot.com/contacts/123456/record/0-1/42';let refreshed=false;
  await page.route('**/api/staff/appointments/detail**',route=>route.fulfill({json:{booking:{...booking,hubspotMeetingId:'88',hubspotContactUrl:contactUrl,notifications:[{kind:'BOOKING_EDIT:HUBSPOT',status:refreshed?'DELIVERED':'PENDING',createdAt:booking.createdAt}]}}}));
  await page.goto(`/${locale}/staff/calendar?appointment=${booking.id}`);
  await expect(page.locator('.amc-preloader')).toBeHidden();
  const detail=page.locator('#appointment-'+booking.id);await expect(detail).toBeVisible();await expect(detail).toBeFocused();
  await expect(detail.getByText(locale==='ar'?'المزامنة في الانتظار':'Sync queued',{exact:true})).toBeVisible();
  await expect(detail.getByRole('link',{name:locale==='ar'?'فتح جهة الاتصال في HubSpot':'Open contact in HubSpot'})).toHaveAttribute('href',contactUrl);
  refreshed=true;await detail.getByRole('button',{name:locale==='ar'?'تحديث حالة HubSpot':'Refresh HubSpot status'}).click();
  await expect(detail.getByText(locale==='ar'?'تمت المزامنة':'Synced',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await fixtureScreenshot(page,`docs/reviews/hubspot-linkage/${locale}-${theme}-${width}-booking.png`,true);
  await page.route('**/api/staff/inquiries**',route=>route.fulfill({json:{items:[{id:'fixture',name:'UI fixture',email:'test@example.invalid',phone:'+1 202 555 0100',message:'Synthetic inquiry with separate CRM and email states.',createdAt:booking.createdAt,ownerEmailStatus:'FAILED',visitorEmailStatus:'FAILED',hubspotStatus:'SENT',hubspotContactUrl:contactUrl}],page:0,total:1}}));
  await page.goto(`/${locale}/staff/inquiries`);
  await expect(page.locator('.amc-preloader')).toBeHidden();
  await expect(page.locator('.inquiry-delivery').getByText(locale==='ar'?'تمت المزامنة':'Synced',{exact:true})).toBeVisible();
  await expect(page.locator('.inquiry-delivery a')).toHaveAttribute('href',contactUrl);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await fixtureScreenshot(page,`docs/reviews/hubspot-linkage/${locale}-${theme}-${width}-inquiry.png`,true);
 });
}

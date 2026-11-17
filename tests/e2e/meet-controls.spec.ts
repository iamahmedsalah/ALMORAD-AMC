import {test,expect} from '@playwright/test';
import {mockOperations,booking} from './fixtures/operations';

for(const locale of ['en','ar'])for(const theme of ['light','dark'])test(`Meet controls and mail status ${locale} ${theme}`,async({page})=>{
 await page.setViewportSize({width:locale==='ar'?390:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(t=>localStorage.setItem('theme',t),theme);
 await mockOperations(page,'MANAGER');
 let current={...booking,assignedToId:'ui-fixture',isDemo:false,googleEventId:'synthetic-event',meetingUrl:'https://meet.google.com/old-link-abc',notifications:[{kind:'BOOKING_UPDATED:EMAIL',status:'DELIVERED',createdAt:booking.createdAt},{kind:'BOOKING_UPDATED:OWNER:EMAIL',status:'FAILED',createdAt:booking.createdAt}]};
 await page.route('**/api/staff/appointments?*',route=>route.fulfill({json:{items:[current],total:1,page:0,timezone:'Africa/Cairo',isDemo:false,googleMeetEnabled:true,googleMeetControlsEnabled:true}}));
 await page.route('**/api/staff/appointments/detail?*',route=>route.fulfill({json:{booking:current}}));
 const attempts:Record<string,unknown>[]=[];
 await page.route('**/api/staff/appointments/meet-link',route=>{
  const body=route.request().postDataJSON();attempts.push(body);
  current={...current,version:current.version+1,...(body.action==='REGENERATE'?{meetingUrl:'https://meet.google.com/new-link-abc'}:{})};
  return route.fulfill({json:{meetingUrl:current.meetingUrl,googleEventId:current.googleEventId}});
 });
 await page.goto('/'+locale+'/staff/calendar?appointment='+booking.id);
 await page.getByRole('tab',{name:/Assign|تعيين/}).click();
 const replace=page.getByRole('button',{name:locale==='ar'?'إنشاء رابط بديل':'Generate replacement link',exact:true});
 await expect(replace).toBeVisible();await replace.click();
 const dialog=page.getByRole('dialog').last();await expect(dialog).toContainText(locale==='ar'?'الرابط القديم قد يظل صالحًا':'The old URL may remain usable');
 await dialog.getByRole('button',{name:locale==='ar'?'تراجع':'Cancel',exact:true}).click();expect(attempts).toHaveLength(0);
 await replace.click();await page.getByRole('dialog').last().getByRole('button',{name:locale==='ar'?'تأكيد':'Confirm',exact:true}).click();
 await expect.poll(()=>attempts.length).toBe(1);expect(attempts[0]).toMatchObject({action:'REGENERATE',version:1,id:booking.id});expect(attempts[0]?.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);
 await expect(page.getByRole('link',{name:locale==='ar'?'الانضمام للاجتماع':'Join meeting',exact:true})).toHaveAttribute('href','https://meet.google.com/new-link-abc');
 await page.getByRole('button',{name:locale==='ar'?'إنهاء المكالمة الحالية':'End active call',exact:true}).click();
 await page.getByRole('dialog').last().getByRole('button',{name:locale==='ar'?'تأكيد':'Confirm',exact:true}).click();
 await expect.poll(()=>attempts.length).toBe(2);expect(attempts[1]).toMatchObject({action:'END',version:2});
 await expect(page.getByText(locale==='ar'?/قبله مزود البريد/:/Accepted by email provider/)).toBeVisible();
 await expect(page.getByText(locale==='ar'?/المديرون المعينون وصندوق الحجوزات: فشل الإرسال/:/Assigned managers \/ booking inbox: Sending failed/)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`docs/reviews/meet-controls-${locale}-${theme}.png`,fullPage:true});
});

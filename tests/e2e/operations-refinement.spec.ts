import {test,expect} from '@playwright/test';
import {mockOperations,booking} from './fixtures/operations';
const widths=[320,360,390,430,768,834,1024,1280,1440];
for(const locale of ['en','ar'])for(const theme of ['light','dark']){
 test(`operations responsive surfaces ${locale} ${theme}`,async({page})=>{
  test.setTimeout(90000);await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(value=>localStorage.setItem('theme',value),theme);await mockOperations(page,'ADMIN');
  await page.goto('/'+locale+'/staff/login');
  await expect(page.locator('.amc-preloader')).toBeHidden();
  for(const width of widths){await page.setViewportSize({width,height:900});const icon=await page.locator('.staff-login-emblem').boundingBox();const header=await page.locator('.staff-login-heading').boundingBox();expect(icon&&header).toBeTruthy();expect(Math.abs(icon!.x+icon!.width/2-header!.x-header!.width/2)).toBeLessThan(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.setViewportSize({width:locale==='ar'?390:1440,height:1000});await page.screenshot({path:`docs/reviews/operations-login-${locale}-${theme}.png`,fullPage:true});
  await page.goto('/'+locale+'/staff/inquiries');await expect(page.locator('.amc-preloader')).toBeHidden();await expect(page.getByRole('heading',{level:2,name:locale==='ar'?'استفسارات التواصل':'Contact inquiries',exact:true})).toBeVisible();
  for(const width of widths){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  if(theme==='dark')await expect(page.locator('.operations-logo-dark')).toBeVisible();else await expect(page.locator('.operations-logo-light')).toBeVisible();
  await page.setViewportSize({width:locale==='ar'?390:1440,height:1000});await page.screenshot({path:`docs/reviews/operations-inquiries-${locale}-${theme}.png`,fullPage:true});
  await page.route('**/api/staff/accounts',route=>route.fulfill({json:[]}));
  await page.route('**/api/staff/security/audit*',route=>route.fulfill({json:{items:[{id:'audit-fixture',createdAt:booking.createdAt,action:'STAFF_ACCOUNT_DELETED',actor:{email:'very-long-staff-identity-for-responsive-check@example.invalid'}}],page:0,total:1}}));
  await page.goto('/'+locale+'/staff');await page.getByRole('tab',{name:locale==='ar'?'الأمان':'Security',exact:true}).click();
  for(const width of widths){await page.setViewportSize({width,height:900});const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);if(!fits){console.log(await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('main *')].map(e=>({tag:e.tagName,cls:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})).filter(e=>e.left<0||e.right>innerWidth).slice(0,25)})));await page.screenshot({path:`docs/reviews/operations-overflow-${locale}-${theme}.png`});}expect(fits).toBe(true);}
 });
 test(`phone social list ${locale} ${theme}`,async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(value=>localStorage.setItem('theme',value),theme);
  await page.setViewportSize({width:390,height:844});await page.goto('/'+locale);
  const social=page.locator('.social-disclosure-sidebar');await social.locator('.social-trigger').click();
  const links=social.locator('.social-item a');await expect(links).toHaveCount(6);
  for(const width of [320,360,390,430]){await page.setViewportSize({width,height:844});const rects=await links.evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));expect(new Set(rects.map(r=>Math.round(r.x))).size).toBe(1);expect(rects.every((r,i)=>r.h>=44&&r.x>=0&&r.x+r.w<=width&&(i===0||r.y>=rects[i-1]!.y+rects[i-1]!.h))).toBe(true);}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`docs/reviews/operations-social-${locale}-${theme}.png`});
 });
}

test('admin contact intake and archival remain separate from appointments',async({page})=>{
 await mockOperations(page,'ADMIN');let records:Record<string,unknown>[]=[];let created:Record<string,unknown>|undefined,removed:Record<string,unknown>|undefined;
 await page.route('**/api/staff/inquiries?*',route=>route.fulfill({json:{items:records,total:records.length,page:0}}));
 await page.route('**/api/staff/inquiries/create',route=>{created=route.request().postDataJSON();records=[{...created,id:booking.id,createdAt:booking.createdAt,source:'STAFF',ownerEmailStatus:'SKIPPED',visitorEmailStatus:'SKIPPED'}];return route.fulfill({json:{id:booking.id}});});
 await page.route('**/api/staff/inquiries/delete',route=>{removed=route.request().postDataJSON();records=[];return route.fulfill({json:{deleted:true}});});
 await page.goto('/en/staff/inquiries');await page.getByRole('button',{name:'Add contact inquiry',exact:true}).click();
 const form=page.locator('.inquiry-create');await form.locator('[name=name]').fill('Internal contact fixture');await form.locator('[name=email]').fill('fixture@example.invalid');await form.locator('[name=message]').fill('Discuss an upcoming branding project');await form.getByRole('button',{name:'Save inquiry',exact:true}).click();
 await expect.poll(()=>created?.name).toBe('Internal contact fixture');expect(created).not.toHaveProperty('consent');expect(created?.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);
 await page.locator('.dash-compact-row-main').click();await page.getByRole('button',{name:'Delete inquiry',exact:true}).click();
 const dialog=page.getByRole('dialog').last();await dialog.locator('textarea').fill('Duplicate internal inquiry');await dialog.getByRole('button',{name:'Confirm deletion',exact:true}).click();
 await expect.poll(()=>removed?.id).toBe(booking.id);await expect(page.getByRole('heading',{name:'No matching inquiries'})).toBeVisible();
});

test('admin staff delete uses its own confirmation without submitting the edit form',async({page})=>{
 await mockOperations(page,'ADMIN');let deleted=false,updates=0;
 const account={id:booking.id,email:'manager@example.invalid',firstName:'Manager',lastName:'Fixture',role:'MANAGER',active:true};
 await page.route('**/api/staff/accounts',route=>route.fulfill({json:deleted?[]:[account]}));
 await page.route('**/api/staff/accounts/update',route=>{updates++;return route.fulfill({json:account});});
 await page.route('**/api/staff/accounts/delete',route=>{expect(route.request().postDataJSON()).toMatchObject({id:booking.id,reason:'Account no longer required'});deleted=true;return route.fulfill({json:{deleted:true}});});
 await page.goto('/en/staff');await page.getByRole('button',{name:'Delete staff account',exact:true}).click();
 const dialog=page.getByRole('dialog').last();await dialog.locator('textarea').fill('Account no longer required');await dialog.getByRole('button',{name:'Confirm deletion',exact:true}).click();
 await expect.poll(()=>deleted).toBe(true);expect(updates).toBe(0);await expect(page.locator('.staff-account-row')).toHaveCount(0);
});

test('receptionist removes and regenerates the managed link, but generation requires saved managers',async({page})=>{
 await mockOperations(page,'RECEPTIONIST');let current={...booking,isDemo:false,assignedToId:'manager-fixture',googleEventId:'event',meetingUrl:'https://meet.google.com/old-link-abc'};const commands:Record<string,unknown>[]=[];
 await page.route('**/api/staff/appointments?*',route=>route.fulfill({json:{items:[current],total:1,page:0,googleMeetEnabled:true,googleMeetControlsEnabled:false}}));
 await page.route('**/api/staff/appointments/detail?*',route=>route.fulfill({json:{booking:current}}));
 await page.route('**/api/staff/appointments/meet-link',route=>{const body=route.request().postDataJSON();commands.push(body);current={...current,version:current.version+1,meetingUrl:body.action==='REMOVE'?'':'https://meet.google.com/new-link-abc'};return route.fulfill({json:{meetingUrl:current.meetingUrl}});});
 await page.goto('/en/staff/calendar?appointment='+booking.id);await page.getByRole('tab',{name:/Assign/}).click();await page.getByRole('button',{name:'Remove appointment link',exact:true}).click();await page.getByRole('dialog').last().getByRole('button',{name:'Confirm',exact:true}).click();
 await expect.poll(()=>commands.length).toBe(1);expect(commands[0]?.action).toBe('REMOVE');await page.getByRole('button',{name:'Generate Google Meet link',exact:true}).click();await expect.poll(()=>commands.length).toBe(2);expect(commands[1]?.action).toBe('CREATE');
 current={...current,assignedToId:'',meetingUrl:''};await page.reload();await page.getByRole('tab',{name:/Assign/}).click();await expect(page.getByRole('button',{name:'Generate Google Meet link',exact:true})).toBeDisabled();await expect(page.getByText('Choose a manager and save the assignment in Appointment details before generating a link.')).toBeVisible();
 await page.goto('/en/staff/inquiries');await expect(page.getByRole('button',{name:'Add contact inquiry',exact:true})).toHaveCount(0);await page.locator('.dash-compact-row-main').click();await expect(page.getByRole('button',{name:'Delete inquiry',exact:true})).toHaveCount(0);
});

test('receptionist can remove a manual URL even when Calendar integration is disabled',async({page})=>{
 await mockOperations(page,'RECEPTIONIST');let current={...booking,isDemo:false,assignedToId:'manager-fixture',meetingUrl:'https://zoom.us/j/123456789'};
 await page.route('**/api/staff/appointments?*',route=>route.fulfill({json:{items:[current],total:1,page:0,googleMeetEnabled:false}}));
 await page.route('**/api/staff/appointments/detail?*',route=>route.fulfill({json:{booking:current}}));
 await page.route('**/api/staff/appointments/meet-link',route=>{expect(route.request().postDataJSON().action).toBe('REMOVE');current={...current,version:2,meetingUrl:''};return route.fulfill({json:{meetingUrl:null}});});
 await page.goto('/en/staff/calendar?appointment='+booking.id);await page.getByRole('tab',{name:/Assign/}).click();await page.getByRole('button',{name:'Remove appointment link',exact:true}).click();await page.getByRole('dialog').last().getByRole('button',{name:'Confirm',exact:true}).click();
 await expect(page.getByRole('button',{name:'Generate Google Meet link',exact:true})).toBeDisabled();await expect(page.getByRole('link',{name:'Join meeting',exact:true})).toHaveCount(0);
});

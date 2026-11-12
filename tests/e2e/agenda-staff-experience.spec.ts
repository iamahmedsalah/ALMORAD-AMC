import {test,expect} from '@playwright/test';
import {mockOperations,booking,fixtureScreenshot} from './fixtures/operations';
for(const role of ['MANAGER','RECEPTIONIST','ADMIN'] as const)for(const locale of ['en','ar'])for(const theme of ['light','dark'])for(const width of [390,834,1440])test(`named staff agenda ${role} ${locale} ${theme} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(t=>localStorage.setItem('theme',t),theme);await mockOperations(page,role);
 await page.route('**/api/staff/auth/session',route=>route.fulfill({json:{staff:{id:'ui-fixture',email:'manager@example.invalid',firstName:'Mohamed',lastName:'Khaled Morad',role},csrfToken:'fixture-csrf'}}));
 await page.route('**/api/staff/appointments/assignees',route=>route.fulfill({json:[{id:'00000000-0000-4000-8000-000000000002',email:'manager@example.invalid',firstName:'Mohamed',lastName:'Khaled Morad'}]}));
 await page.goto('/'+locale+'/staff/calendar');await expect(page.locator('.staff-identity strong')).toHaveText('Mohamed Khaled Morad');await expect(page.locator('.calendar-appointment')).toBeVisible();
 await expect(page.locator('.agenda-bulk')).toHaveCount(role==='ADMIN'?1:0);await expect(page.locator('.agenda-select-record')).toHaveCount(role==='ADMIN'?1:0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(role==='RECEPTIONIST'){await page.locator('details.staff-panel').first().locator('summary').click();const manager=page.locator('.booking-choice-form .booking-select-field').first().getByRole('combobox');await manager.click();await page.getByRole('option',{name:'Mohamed Khaled Morad',exact:true}).click();await expect(manager).toContainText('Mohamed Khaled Morad');await manager.click();await page.getByRole('option').first().click();await expect(manager).not.toHaveText('');}
 if(width===390)await fixtureScreenshot(page,`docs/reviews/agenda-staff/${role}-${locale}-${theme}.png`,true);
 await page.route('**/api/staff/auth/logout',route=>route.fulfill({json:{signedOut:true}}));await page.locator('.staff-identity button').click();await expect(page).toHaveURL(new RegExp('/'+locale+'/staff/login$'));
});
test('admin page selection uses guarded appointment action with reason',async({page})=>{
 await mockOperations(page,'ADMIN');let body:Record<string,unknown>|undefined;
 await page.route('**/api/staff/appointments/action',route=>{body=route.request().postDataJSON();return route.fulfill({json:{booking}});});
 await page.goto('/en/staff/calendar');const form=page.locator('.agenda-bulk');await form.locator('input[type=checkbox]').first().check();await form.locator('[name=bulkReason]').fill('Reviewed appointment with client');await form.locator('input[type=checkbox]').last().check();await form.getByRole('button',{name:'Save action',exact:true}).click();await expect.poll(()=>body?.action).toBe('CONFIRM');expect(body?.id).toBe(booking.id);expect(body?.version).toBe(booking.version);expect(body?.reason).toBe('Reviewed appointment with client');
});
test('staff account fields include first and last name',async({page})=>{
 await mockOperations(page,'ADMIN');await page.route('**/api/staff/accounts',route=>route.fulfill({json:[]}));await page.goto('/en/staff');await expect(page.locator('.staff-accounts-create [name=firstName]')).toBeVisible();await expect(page.locator('.staff-accounts-create [name=lastName]')).toBeVisible();
});
test('manager sign in opens the agenda directly',async({page})=>{
 await mockOperations(page,'MANAGER');await page.route('**/api/staff/auth/login',route=>route.fulfill({json:{signedIn:true}}));
 await page.goto('/en/staff/login');await page.locator('[name=email]').fill('manager@example.invalid');await page.locator('[name=password]').fill('synthetic-browser-password');await page.locator('button[type=submit]').click();
 await expect(page).toHaveURL(/\/en\/staff\/calendar$/);await expect(page.locator('.calendar-appointment')).toBeVisible();
});
test('admin assignment selector preserves the empty unassigned form value',async({page})=>{
 await mockOperations(page,'ADMIN');let body:Record<string,unknown>|undefined;
 await page.route('**/api/staff/appointments/action',route=>{body=route.request().postDataJSON();return route.fulfill({json:{booking}});});
 await page.goto('/en/staff/calendar');await page.locator('.calendar-appointment').click();
 const form=page.locator('form[action="/api/staff/appointments/action"]');const manager=form.getByRole('combobox',{name:'Assigned manager'});
 await expect(manager).toContainText('Unassigned');await manager.click();await page.getByRole('option',{name:'manager@example.invalid',exact:true}).click();await expect(form.locator('[name=assignedToId]')).toHaveValue('00000000-0000-4000-8000-000000000002');
 await manager.click();await page.getByRole('option',{name:'Unassigned',exact:true}).click();await expect(form.locator('[name=assignedToId]')).toHaveValue('');
 await form.locator('[name=reason]').fill('Reviewed manager assignment');await form.getByRole('button',{name:'Save action',exact:true}).click();await expect.poll(()=>body?.action).toBe('EDIT');expect(body?.assignedToId).toBeNull();
});

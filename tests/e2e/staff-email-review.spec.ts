import {test,expect} from '@playwright/test';
import {mockOperations} from './fixtures/operations';
for(const locale of ['en','ar'])test(`staff typo review preserves input and requires confirmation ${locale}`,async({page})=>{
 await mockOperations(page);
 await page.route('**/api/staff/accounts',route=>route.fulfill({json:[]}));
 const attempts:Record<string,unknown>[]=[];
 await page.route('**/api/staff/accounts/create',async route=>{
  const body=route.request().postDataJSON();attempts.push(body);
  await route.fulfill(body.confirmSimilarEmail?{json:{id:'fixture-account'}}:{status:409,json:{code:'STAFF_EMAIL_REVIEW_REQUIRED',similarEmails:['person@example.invalid']}});
 });
 await page.goto('/'+locale+'/staff');
 const form=page.locator('.staff-accounts-create');await expect(form).toBeVisible();
 await form.locator('[name=email]').fill('persno@example.invalid');
 await form.locator('[name=password]').fill('Synthetic-browser-password-73');
 page.once('dialog',dialog=>dialog.dismiss());await form.locator('button[type=submit]').click();
 await expect.poll(()=>attempts.length).toBe(1);await expect(form.locator('button[type=submit]')).toBeEnabled();
 await expect(form.locator('[name=email]')).toHaveValue('persno@example.invalid');
 page.once('dialog',async dialog=>{expect(dialog.message()).toContain('person@example.invalid');await dialog.accept();});
 await form.locator('button[type=submit]').click();await expect.poll(()=>attempts.length).toBe(3);
 expect(attempts[2]?.confirmSimilarEmail).toBe(true);expect(attempts[2]?.email).toBe('persno@example.invalid');
 await expect(form.locator('[name=email]')).toHaveValue('');
});

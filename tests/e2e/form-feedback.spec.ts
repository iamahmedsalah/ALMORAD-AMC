import {test, expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

for (const locale of ['en', 'ar'] as const) {
  test(`contact fields show useful red and green feedback in ${locale}`, async ({page}) => {
    await page.goto(`/${locale}/contact`);
    const name = page.locator('#contact-name');
    const email = page.locator('#contact-email');
    await name.fill('A');
    await name.blur();
    await email.fill('broken-address');
    await email.blur();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#contact-err-name')).toHaveAttribute('data-state', 'invalid');
    await expect(page.locator('#contact-err-email')).toHaveAttribute('data-state', 'invalid');
    expect(await email.evaluate(element => getComputedStyle(element).borderTopColor))
      .toBe(await page.locator('#contact-err-email').evaluate(element => getComputedStyle(element).color));

    await name.fill('Local browser fixture');
    await email.fill('fixture@example.invalid');
    await expect(name).toHaveAttribute('data-valid', 'true');
    await expect(email).toHaveAttribute('data-valid', 'true');
    await expect(page.locator('#contact-err-name')).toHaveAttribute('data-state', 'valid');
    await expect(page.locator('#contact-err-email')).toHaveAttribute('data-state', 'valid');
    expect(await email.evaluate(element => getComputedStyle(element).borderTopColor))
      .toBe(await page.locator('#contact-err-email').evaluate(element => getComputedStyle(element).color));
  });

  test(`staff sign in validates email and presents failed login in ${locale}`, async ({page}) => {
    if (locale === 'ar') await page.setViewportSize({width: 390, height: 844});
    await page.goto(`/${locale}/staff/login`);
    const form = page.locator('.staff-form');
    const email = form.locator('[name="email"]');
    const password = form.locator('[name="password"]');
    await email.fill('broken-address');
    await email.blur();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#staff-email-feedback')).toHaveAttribute('data-state', 'invalid');
    expect(await email.evaluate(element => getComputedStyle(element).borderTopColor))
      .toBe(await page.locator('#staff-email-feedback').evaluate(element => getComputedStyle(element).color));
    await form.locator('[type="submit"]').click();
    await expect(form.locator('[role="alert"]')).toBeVisible();

    await email.fill('fixture@example.invalid');
    await expect(email).toHaveAttribute('data-valid', 'true');
    await expect(page.locator('#staff-email-feedback')).toHaveAttribute('data-state', 'valid');
    expect(await email.evaluate(element => getComputedStyle(element).borderTopColor))
      .toBe(await page.locator('#staff-email-feedback').evaluate(element => getComputedStyle(element).color));
    await password.fill('synthetic-test-password');
    const eye = form.locator('.staff-password-toggle');
    const expectEyeAtPasswordEnd = async () => {
      const [inputBox, eyeBox] = await Promise.all([password.boundingBox(), eye.boundingBox()]);
      expect(inputBox).not.toBeNull();
      expect(eyeBox).not.toBeNull();
      expect(eyeBox!.x).toBeGreaterThan(inputBox!.x + inputBox!.width - 56);
      expect(eyeBox!.x + eyeBox!.width).toBeLessThanOrEqual(inputBox!.x + inputBox!.width + 1);
    };
    await expectEyeAtPasswordEnd();
    const show = form.getByRole('button', {name: locale === 'ar' ? 'إظهار كلمة المرور' : 'Show password'});
    await show.click();
    await expect(password).toHaveAttribute('type', 'text');
    await expectEyeAtPasswordEnd();
    const hide = form.getByRole('button', {name: locale === 'ar' ? 'إخفاء كلمة المرور' : 'Hide password'});
    await hide.click();
    await expect(password).toHaveAttribute('type', 'password');
    await expectEyeAtPasswordEnd();
    await page.route('**/api/staff/auth/login', route => route.fulfill({status: 401, contentType: 'application/json', body: '{}'}));
    await form.locator('[type="submit"]').click();
    await expect(form.locator('[role="alert"]')).toBeVisible();
    await expect(form.locator('[role="alert"]')).toHaveCSS('opacity', '1');
    await expect(password).toHaveValue('synthetic-test-password');
    await mkdir('docs/reviews/form-feedback', {recursive: true});
    await page.screenshot({path: `docs/reviews/form-feedback/sign-in-${locale}.png`});
    await email.fill('another@example.invalid');
    await expect(form.locator('[data-variant="destructive"]')).toHaveAttribute('data-state', 'closed');
  });

  test(`successful staff sign in shows confirmation before navigation in ${locale}`, async ({page}) => {
    await page.goto(`/${locale}/staff/login`);
    const form = page.locator('.staff-form');
    await form.locator('[name="email"]').fill('fixture@example.invalid');
    await form.locator('[name="password"]').fill('synthetic-test-password');
    await page.route('**/api/staff/auth/login', route => route.fulfill({status: 200, contentType: 'application/json', body: '{}'}));
    await form.locator('[type="submit"]').click();
    await expect(form.locator('[data-variant="success"]')).toHaveAttribute('data-state', 'open');
  });
}

test('staff controls stay disabled without JavaScript', async ({browser}) => {
  const context = await browser.newContext({javaScriptEnabled: false});
  try {
    const page = await context.newPage();
    await page.goto('/ar/staff/login');
    await expect(page.locator('form')).toHaveAttribute('method', 'post');
    await expect(page.locator('input[name="password"]')).toBeDisabled();
    await expect(page.locator('form button[type="submit"]')).toBeDisabled();
    await expect(page.locator('form button[type="button"]')).toBeDisabled();
  } finally {
    await context.close();
  }
});

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { bookingCopy } from '../../apps/web/src/features/booking/copy';
import { deskCopy } from '../../apps/web/src/features/booking/desk-copy';
import { booking, fixtureScreenshot, mockOperations } from './fixtures/operations';

for (const locale of ['en', 'ar'] as const) for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
  test(`mocked booking and operations UI ${locale} ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await mockOperations(page);
    const paths = ['booking', 'staff/calendar', 'staff/analytics', 'staff/settings', 'staff', 'staff/login'];
    for (const path of paths) {
      await page.goto(`/${locale}/${path}`);
      if (path === 'booking') await expect(page.locator('.booking-steps li')).toHaveCount(4);
      if (path === 'staff/calendar') await expect(page.getByText(booking.clientName, { exact: true })).toBeVisible();
      if (path === 'staff/analytics') await expect(page.locator('.booking-metrics dd')).toHaveCount(10);
      if (path === 'staff/settings') await expect(page.locator('.booking-settings > fieldset')).toBeEnabled();
      if (path === 'staff') await expect(page.locator('.staff-metrics dd')).toHaveCount(3);
      if (path === 'staff/login') await expect(page.locator('input[name="email"]')).toBeEnabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
      await fixtureScreenshot(page, `test-results/operations-${locale}-${theme}-${width}-${path.replaceAll('/', '-')}.png`);
    }
  });
}

for (const locale of ['en', 'ar'] as const) {
  test(`mocked booking wizard keeps its four-step behavior in ${locale}`, async ({ page }) => {
    const c = bookingCopy(locale);
    await mockOperations(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${locale}/booking`);
    await page.getByRole('button', { name: c.next, exact: true }).click();
    await expect(page.getByRole('button', { name: c.next, exact: true })).toBeDisabled();
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: c.next, exact: true }).click();
    await page.locator('input[name="clientName"]').fill('UI Fixture Client');
    await page.locator('input[name="email"]').fill('ui-fixture@example.invalid');
    await page.locator('.booking-check input').check();
    await page.getByRole('button', { name: c.confirm, exact: true }).click();
    await expect(page.locator('.booking-confirmation')).toContainText('UI-FIXTURE-001');
    await expect(page.locator('.booking-steps [aria-current="step"]')).toContainText(c.confirmation);
    await page.goto(`/${locale}/booking/manage#id=${booking.id}&token=${'a'.repeat(64)}`);
    await expect(page.getByRole('heading', { name: c.current, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: c.sendRequest, exact: true })).toBeDisabled();
  });
}

test('mocked receptionist navigation remains limited to its existing role', async ({ page }) => {
  await mockOperations(page, 'RECEPTIONIST');
  await page.goto('/en/staff/calendar');
  const c = deskCopy('en');
  await expect(page.getByText(booking.clientName, { exact: true })).toBeVisible();
  await expect(page.locator('.operations-nav').getByRole('link', { name: c.analytics })).toHaveCount(0);
  await expect(page.locator('.operations-nav').getByRole('link', { name: c.settings })).toHaveCount(0);
  await expect(page.locator('.operations-nav').getByRole('link', { name: c.account })).toBeVisible();
});

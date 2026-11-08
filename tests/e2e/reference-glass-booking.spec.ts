import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { services } from '../../packages/shared/src/index';
import { mockOperations, schedule } from './fixtures/operations';
import { bookingCopy } from '../../apps/web/src/features/booking/copy';

for (const locale of ['en', 'ar'] as const) for (const width of [390, 1440]) for (const onsite of [false, true]) {
  test(`shadcn booking dropdown and onsite ${locale} ${width} ${onsite}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockOperations(page);
    if (onsite) await page.route('**/api/booking/config', route => route.fulfill({ json: { enabled: true, schedule: { ...schedule, inPersonEnabled: true,
      officeAddressEn: 'UI fixture office — not a real business address', officeAddressAr: 'مكتب اختبار للواجهة — ليس عنوان الشركة', directionsUrl: 'https://www.google.com/maps?ui_fixture=1' } } }));
    const c = bookingCopy(locale);
    await page.goto(`/${locale}/booking`);
    const service = page.getByRole('combobox', { name: c.service, exact: true });
    await service.focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.getByRole('option', { name: services[3][locale], exact: true }).click();
    await expect(service).toContainText(services[3][locale]);
    const format = page.getByRole('combobox', { name: c.format, exact: true });
    await format.click();
    const option = page.getByRole('option', { name: c.IN_PERSON, exact: true });
    if (onsite) {
      await option.click();
      await expect(page.locator('.booking-office-panel')).toBeVisible();
      await expect(page.locator('.booking-office-panel a')).toHaveAttribute('href', 'https://www.google.com/maps?ui_fixture=1');
      const request = page.waitForRequest(request => request.url().includes('/booking/slots?') && request.url().includes('format=IN_PERSON'));
      await page.getByRole('button', { name: c.next, exact: true }).click();
      await request;
      await expect(page.getByRole('radio').first()).toBeVisible();
    } else {
      await expect(option).toHaveAttribute('aria-disabled', 'true');
      await page.keyboard.press('Escape');
      await expect(format).toBeFocused();
      await expect(page.locator('.booking-format-note')).toBeVisible();
      await expect(page.locator('.booking-office-panel')).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  });
}

for (const locale of ['en', 'ar']) for (const width of [390, 1440]) {
  test(`reference glass and service scroll choreography ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/${locale}`);
    const gallery = page.locator('[data-gallery-track]');
    await expect(gallery).toHaveAttribute('data-service-stack', 'true');
    await expect(page.locator('[data-service-card]')).toHaveCount(11);
    await expect(page.locator('.amc-mark-stage')).toHaveCSS('z-index', '0');
    await expect(page.locator('.studio-content')).toHaveCSS('z-index', '1');
    const card = page.locator('[data-service-card]').nth(2);
    const before = await card.evaluate(el => getComputedStyle(el).transform);
    await page.evaluate(() => { const card = document.querySelectorAll('[data-service-card]')[2]!; scrollTo(0, scrollY + card.getBoundingClientRect().top - 200); });
    await expect.poll(async () => card.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
    await page.evaluate(() => { const card = document.querySelectorAll('[data-service-card]')[2]!; scrollTo(0, scrollY + card.getBoundingClientRect().top - 150); });
    await expect.poll(async () => (await page.locator('[data-service-card]').first().boundingBox())!.y).toBeGreaterThanOrEqual(80);
    const first = (await page.locator('[data-service-card]').first().boundingBox())!;
    await expect.poll(async () => (await card.boundingBox())!.y).toBeLessThan(first.y + first.height);
    await expect(card).toHaveCSS('backdrop-filter', /blur/);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(gallery).not.toHaveAttribute('data-service-stack', 'true');
    await expect(card).toHaveCSS('position', 'relative');
  });
}

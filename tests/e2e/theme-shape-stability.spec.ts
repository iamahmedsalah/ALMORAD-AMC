import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['en', 'ar']) for (const width of [320, 390, 768, 1440]) {
  test(`dark artwork, unified squircles and repeated social opening ${locale} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(`/${locale}`);
    const artwork = page.locator('.site-header .brand-symbol img:visible');
    await expect(artwork).toHaveCount(1);
    await expect(artwork).toHaveAttribute('src', '/brand/amc-mark-on-orange.svg');
    await expect(page.locator('.site-header')).toHaveCSS('background-color', 'rgb(247, 118, 30)');
    await expect(page.locator('.site-header .theme-icon-motion')).toHaveCSS('color', 'rgb(11, 31, 68)');
    await expect(page.locator('.site-header .brand-symbol')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    for (const selector of ['.site-header .locale-switch-btn', '.site-header .theme-cycle-button', '.social-disclosure-sidebar .social-trigger', '.button-primary', '.badge', '.pillar-symbol', '.back-to-top']) {
      await expect(page.locator(selector).first()).toHaveCSS('border-top-left-radius', '20px');
    }
    const sidebar = page.locator('.social-disclosure-sidebar');
    for (let iteration = 0; iteration < 3; iteration += 1) {
      await sidebar.locator('.social-trigger').click();
      await expect(sidebar.locator('.social-trigger')).toHaveAttribute('aria-expanded', 'true');
      await expect(sidebar.locator('.social-tray')).toHaveCSS('scrollbar-width', 'none');
      expect(await sidebar.locator('.social-tray').evaluate(el => el.clientWidth >= el.getBoundingClientRect().width - 3)).toBe(true);
      await expect(sidebar.locator('.social-tray a')).toHaveCount(6);
      await page.keyboard.press('Escape');
      await expect(sidebar.locator('.social-trigger')).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  });
}

for (const preference of ['dark', 'system']) for (const width of [390, 1440]) {
  test(`no light paint while switching locales ${preference} ${width}`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: preference === 'system' ? 'dark' : 'light' });
    await page.addInitScript(value => {
      localStorage.setItem('theme', value);
      const sample = () => {
        const root = document.documentElement;
        if (document.body && getComputedStyle(root).getPropertyValue('--background').trim() && (!root.classList.contains('dark') || root.dataset.theme === 'light')) {
          const failures = JSON.parse(sessionStorage.getItem('amc-theme-flashes') || '[]') as string[];
          if (failures.length < 10) { failures.push(`${location.pathname}:${root.className}`); sessionStorage.setItem('amc-theme-flashes', JSON.stringify(failures)); }
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, preference);
    const html = await (await request.get('/en')).text();
    expect(html.indexOf('id="amc-theme-init"')).toBeGreaterThan(0);
    expect(html.indexOf('id="amc-theme-init"')).toBeLessThan(html.indexOf('<body'));
    await page.goto('/en');
    await expect(page.locator('.site-header .theme-cycle-button')).toHaveAttribute('data-theme-ready', 'true');
    for (const locale of ['ar', 'en']) {
      await page.locator('.site-header .locale-switch-btn').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}$`));
      await expect(page.locator('.site-header .theme-cycle-button')).toHaveAttribute('data-theme-choice', preference);
      await expect(page.locator('html')).toHaveClass(/dark/);
    }
    await page.reload();
    await expect(page.locator('.site-header .theme-cycle-button')).toHaveAttribute('data-theme-choice', preference);
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('amc-theme-flashes') || '[]'))).toEqual([]);
  });
}

import { expect, type Page } from '@playwright/test';

export async function chooseTheme(page: Page, choice: 'system' | 'light' | 'dark') {
  const button = page.locator('.site-header .theme-cycle-button');
  await expect(button).toBeEnabled();
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await button.getAttribute('data-theme-choice') === choice) break;
    await button.click();
  }
  await expect(button).toHaveAttribute('data-theme-choice', choice);
}

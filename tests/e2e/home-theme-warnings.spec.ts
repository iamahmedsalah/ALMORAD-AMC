import {test, expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

const scenes = ['marketing', 'advertising', 'consulting', 'web-development'] as const;

test('service illustrations use each theme and redraw after switching', async ({page}) => {
  test.setTimeout(120000);
  await page.setViewportSize({width: 1440, height: 1000});
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/en');
  await expect(page.locator('.amc-preloader')).toHaveAttribute('data-hidden', 'true');
  await mkdir('docs/reviews/home-theme',{recursive:true});
  for (const scene of scenes) {
    const stage = page.locator(`.service-motion-stage[data-scene="${scene}"]`);
    await stage.scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute('data-active', 'true');
    await expect(stage).toHaveAttribute('data-failed', 'false');
    await expect(stage).toHaveCSS('background-color', 'rgb(251, 241, 230)');
    await stage.screenshot({path:`docs/reviews/home-theme/${scene}-light.png`});
  }
  await page.locator('.site-header .theme-cycle-button').click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('.service-motion-stage[data-scene="web-development"]')).toHaveCSS('background-color', 'rgb(6, 20, 48)');
  const darkPage = await page.context().newPage();
  await darkPage.goto('/en');
  await expect(darkPage.locator('.amc-preloader')).toHaveAttribute('data-hidden', 'true');
  await expect(darkPage.locator('html')).toHaveClass(/dark/);
  for (const scene of scenes) {
    const stage = darkPage.locator(`.service-motion-stage[data-scene="${scene}"]`);
    await stage.scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute('data-active', 'true');
    await expect(stage).toHaveCSS('background-color', 'rgb(6, 20, 48)');
    await stage.screenshot({path:`docs/reviews/home-theme/${scene}-dark.png`});
  }
  await darkPage.close();
});

test('home and locale navigation do not emit the reported browser warnings', async ({page}) => {
  test.setTimeout(60000);
  await page.setViewportSize({width: 1440, height: 1000});
  const warnings:string[] = [];
  page.on('console', message => {
    if (/either width or height modified|Encountered a script tag|Detected `scroll-behavior: smooth`/.test(message.text())) warnings.push(message.text());
  });
  await page.goto('/en');
  await expect(page.locator('.amc-preloader')).toHaveAttribute('data-hidden', 'true');
  await page.locator('.site-header .locale-link').click();
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator('.amc-preloader')).toHaveAttribute('data-hidden', 'true');
  expect(warnings).toEqual([]);
});

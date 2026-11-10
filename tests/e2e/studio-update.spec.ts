import {test,expect} from '@playwright/test';
import {services} from '../../packages/shared/src/index';

for(const locale of ['en','ar']) for(const width of [320,390,768,1024,1366,1440]) {
 test(`compact studio and separate team ${locale} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:768});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(`/${locale}`);
  await expect(page.locator('#chapter-team,#chapter-together')).toHaveCount(0);
  const monitor=page.locator('.lp-tv-bezel.lp-showreel');
  if(width>=1024) expect((await monitor.boundingBox())!.height).toBeLessThan(600);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(width>=1180) await page.locator('.desktop-nav a[href$="/team"]').click();
  else {await page.locator('.burger-trigger').click();await page.locator('.side-drawer-link[href$="/team"]').click();}
  await expect(page).toHaveURL(new RegExp(`/${locale}/team$`));
  await expect(page.locator('#chapter-team h1')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}

for(const locale of ['en','ar']) test(`eleven distinct service pages ${locale}`,async({page})=>{
 for(const service of services){
  await page.goto(`/${locale}/services/${service.slug}`);
  await expect(page.locator('h1')).toHaveText(service[locale as 'en'|'ar']);
  await expect(page.locator('.service-detail-highlights > div')).toHaveCount(3);
  await expect(page.locator('.service-audience')).not.toBeEmpty();
  await expect(page.locator('.page-intro a')).toHaveAttribute('href',`/${locale}/booking?service=${service.slug}`);
 }
});

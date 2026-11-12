import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
for(const locale of ['en','ar'])for(const width of [390,1440])for(const kind of ['visitor','owner','confirmation']){
 test(`email ${locale} ${kind} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.setContent(readFileSync(`docs/reviews/client-access/email-${locale}-${kind}.html`,'utf8'));
  await expect(page.locator('h1')).toBeVisible();
  for(const image of await page.locator('img').all())expect(await image.evaluate((element:HTMLImageElement)=>element.complete&&element.naturalWidth>0)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(kind==='visitor')await expect(page.locator('body')).not.toContainText('Synthetic inquiry preview');
  await page.screenshot({path:`docs/reviews/client-access/email-${locale}-${kind}-${width}.png`,fullPage:true});
 });
}

import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

for(const locale of ['en','ar']) for(const theme of ['dark','light']) for(const width of [320,390,768,1440]) {
 test(`conversion design ${locale} ${theme} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(value=>localStorage.setItem('theme',value),theme);
  await page.goto(`/${locale}`);
  await expect(page.locator('.desktop-nav a[href$="/about"]')).toHaveText(locale==='ar'?'\u0645\u0646 \u0646\u062d\u0646':'About us');
  await expect(page.locator('a[href$="/credits"]')).toHaveCount(0);
  await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href',theme==='dark'?'/favicon-navy.svg':'/favicon-light.svg');
  await expect(page.locator('.amc-preloader')).toBeHidden();
  await page.locator('.approach-journey').scrollIntoViewIfNeeded();
  await expect(page.locator('.approach-card')).toHaveCount(4);
  await expect(page.locator('.approach-traveller')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await mkdir('docs/reviews/conversion-motion',{recursive:true});
  await page.screenshot({path:`docs/reviews/conversion-motion/${locale}-${theme}-${width}.png`});
 });
}
test('process mark travels through four cards then hides after completion',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/en');
 await expect(page.locator('.amc-preloader')).toBeHidden();
  await page.locator('.approach-journey').scrollIntoViewIfNeeded();
 const marker=page.locator('.approach-traveller');
 await expect(marker).toBeVisible();
 await expect(page.locator('.approach-card[data-visited="true"]')).toHaveCount(4);
 await expect(page.locator('.approach-card[data-active="true"]')).toHaveCount(1);
 await expect(page.locator('.approach-card').nth(3)).toHaveAttribute('data-active','true');
 await expect(marker).toBeHidden();
 await expect(marker).toHaveCSS('border-top-color','rgb(247, 118, 30)');
 await page.setViewportSize({width:390,height:1000});
 await expect(marker).toBeHidden();
});
test('monitor redraws for light and dark themes and ticker keeps the official mark',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>localStorage.setItem('theme','light'));
 await page.goto('/en');
 await expect(page.locator('.amc-preloader')).toBeHidden();
 const sample=()=>page.locator('.lp-showreel-canvas').evaluate((canvas:HTMLCanvasElement)=>{
  const pixels=canvas.getContext('2d')!.getImageData(24,24,1,1).data;
  return Array.from(pixels).slice(0,3);
 });
 const light=await sample();
 await mkdir('docs/reviews/home-motion',{recursive:true});
 await page.locator('.manifesto-tv-wrap').screenshot({path:'docs/reviews/home-motion/monitor-light.png'});
 await page.evaluate(()=>{localStorage.setItem('theme','dark');document.documentElement.classList.add('dark');});
 await expect.poll(async()=>(await sample())[0]).toBeLessThan(light[0]! - 100);
 await page.locator('.manifesto-tv-wrap').screenshot({path:'docs/reviews/home-motion/monitor-dark.png'});
 await expect(page.locator('.lp-tv-bezel')).toHaveCSS('background-color','rgb(11, 31, 68)');
 const ticker=page.locator('.brand-ticker');
 await expect(ticker.locator('.brand-ticker-item').first()).toContainText('Marketing');
 await expect(ticker.locator('.brand-ticker-logo img:visible').first()).toHaveAttribute('src','/brand/amc-mark-on-dark.svg');
 await expect(ticker.locator('.brand-ticker-track')).toHaveCSS('animation-name','none');
 await ticker.locator('.brand-ticker-item').first().hover();
 await expect(ticker.locator('.brand-ticker-logo img:visible').first()).toHaveCSS('filter','none');
 await ticker.screenshot({path:'docs/reviews/home-motion/ticker-dark-hover.png'});
});
test('company strip moves from left to right when motion is enabled',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/ar');
 await expect(page.locator('.amc-preloader')).toBeHidden();
 const ticker=page.locator('.brand-ticker');
 await ticker.scrollIntoViewIfNeeded();
 const track=ticker.locator('.brand-ticker-track');
 await expect(track).toHaveCSS('animation-name','brand-ticker-right');
 const first=await track.evaluate(element=>new DOMMatrix(getComputedStyle(element).transform).m41);
 await expect.poll(()=>track.evaluate(element=>new DOMMatrix(getComputedStyle(element).transform).m41)).toBeGreaterThan(first+2);
});
test('removed Credits route returns 404',async({page})=>{
 expect((await page.goto('/en/credits'))?.status()).toBe(404);
 expect((await page.goto('/ar/credits'))?.status()).toBe(404);
});

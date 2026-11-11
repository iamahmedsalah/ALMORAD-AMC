import {test,expect} from '@playwright/test';

for(const locale of ['en','ar'])for(const width of [390,1440]){
 test(`logo priority and bounded video playback ${locale} ${width}`,async({page})=>{
  const warnings:string[]=[];
  page.on('console',message=>{if(/GSAP target.*not found|Largest Contentful Paint|preloaded.*not used/i.test(message.text()))warnings.push(message.text());});
  page.on('pageerror',error=>warnings.push(error.message));
  await page.setViewportSize({width,height:1000});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(`/${locale}`);
  await expect(page.locator('.amc-preloader')).toBeHidden();
  for(const logo of await page.locator('.site-header .brand-symbol img').all()){
   await expect(logo).toHaveAttribute('loading','eager');await expect(logo).toHaveAttribute('fetchpriority','high');
  }
  const video=page.locator('.lp-showreel-video');
  const paused=()=>video.evaluate(element=>element.paused);
  const time=()=>video.evaluate(element=>element.currentTime);
  const control=page.getByRole('button',{name:locale==='ar'?'إيقاف الشاشة مؤقتًا':'Pause monitor',exact:true});
  await expect.poll(paused).toBe(true);
  const offscreen=await time();await page.waitForTimeout(350);expect(await time()).toBeCloseTo(offscreen,1);
  await video.scrollIntoViewIfNeeded();
  await expect.poll(paused).toBe(false);await expect.poll(time).toBeGreaterThan(.2);
  expect(await video.evaluate(element=>element.muted)).toBe(true);
  await control.click();await expect.poll(paused).toBe(true);
  const stopped=await time();await page.waitForTimeout(350);expect(await time()).toBeCloseTo(stopped,1);
  const play=page.getByRole('button',{name:locale==='ar'?'تشغيل الشاشة':'Play monitor',exact:true});
  await page.locator('.lp-showreel-chapter').nth(2).click();
  await expect(page.locator('.lp-showreel-chapter').nth(2)).toHaveAttribute('data-active','true');
  await expect(video.locator('source')).toHaveAttribute('src','/studio/monitor/videos/amc-03-outdoor-campaign.mp4');
  await expect.poll(paused).toBe(true);await expect(play).toBeVisible();
  await expect(page.locator('.lp-showreel-pause-poster')).toBeVisible();
  await play.click();await expect.poll(paused).toBe(false);await expect.poll(time).toBeGreaterThan(.2);
  await page.locator('h1').scrollIntoViewIfNeeded();await expect.poll(paused).toBe(true);
  const hidden=await time();await page.waitForTimeout(350);expect(await time()).toBeCloseTo(hidden,1);
  await page.emulateMedia({reducedMotion:'reduce'});await video.scrollIntoViewIfNeeded();
  await expect(play).toBeDisabled();await expect.poll(paused).toBe(true);
  const still=await time();await page.waitForTimeout(350);expect(await time()).toBeCloseTo(still,1);
  await expect(page.locator('.lp-showreel-pause-poster')).toBeVisible();
  expect(warnings).toEqual([]);
 });
}

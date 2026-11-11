import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const scenes=['marketing','advertising','consulting','web-development','devices'];
const stageFor=(page:import('@playwright/test').Page,scene:string)=>page.locator(`.service-motion-stage[data-scene="${scene}"]`);
async function instrument(page:import('@playwright/test').Page){
 await page.addInitScript(()=>{
  for(const Context of [WebGLRenderingContext,WebGL2RenderingContext])for(const key of ['drawArrays','clear'] as const){
   const original=Context.prototype[key];
   Object.defineProperty(Context.prototype,key,{value:function(this:WebGLRenderingContext,...args:number[]){
    const canvas=this.canvas as HTMLCanvasElement;
    if(canvas.classList.contains('service-motion-canvas') && (canvas.parentElement?.dataset.scene==='devices'?key==='clear':key==='drawArrays'))canvas.dataset.frames=String(Number(canvas.dataset.frames??0)+1);
    return Reflect.apply(original,this,args);
   },configurable:true});
  }
 });
}
for(const locale of ['en','ar'])for(const theme of ['light','dark'])for(const width of [390,1440]){
 test(`service scenes ${locale} ${theme} ${width}`,async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width,height:1000});await page.addInitScript(t=>localStorage.setItem('theme',t),theme);await instrument(page);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/${locale}`);await expect(page.locator('.amc-preloader')).toHaveAttribute('data-hidden','true');
  await expect(page.locator('.service-motion-stage')).toHaveCount(5);
  for(const scene of scenes){
   const stage=stageFor(page,scene);await stage.scrollIntoViewIfNeeded();
   await expect(stage).toHaveAttribute('data-active','true');await expect(stage).toHaveAttribute('data-failed','false');
   await expect(page.locator('.service-motion-stage[data-active="true"]')).toHaveCount(1);
   const count=()=>stage.locator('canvas').evaluate(c=>Number(c.dataset.frames??0));
   const before=await count();await page.waitForTimeout(700);expect(await count()).toBeGreaterThan(before);
   const start=Date.now(),initial=await count();await page.waitForTimeout(1000);expect((await count()-initial)/((Date.now()-start)/1000)).toBeLessThanOrEqual(31);
   const pause=stage.locator('button');await pause.click();await expect(pause).toHaveAttribute('aria-pressed','true');await expect(stage).toHaveAttribute('data-active','false');
   await page.waitForTimeout(150);const stopped=await count();await page.waitForTimeout(300);expect(await count()).toBe(stopped);
   await pause.press('Enter');await expect(stage).toHaveAttribute('data-active','true');
   await pause.evaluate(button=>button.blur()); // Release the existing focus-within stack elevation before scrolling to the next card.
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await stageFor(page,'devices').screenshot({path:`docs/reviews/services-motion-evidence/devices-${locale}-${theme}-${width}.png`});
  const result=await new AxeBuilder({page}).include('.service-motion-stage').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations).toEqual([]);
  await page.locator('h1').scrollIntoViewIfNeeded();await expect(page.locator('.service-motion-stage[data-active="true"]')).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const scene of scenes){const stage=stageFor(page,scene);await stage.scrollIntoViewIfNeeded();await expect(stage).toHaveAttribute('data-active','false');await expect(stage.locator('button')).toBeDisabled();await expect(stage.locator('img:visible')).toBeVisible();}
  await page.emulateMedia({reducedMotion:'no-preference'});
  // Existing GSAP stack changes document height when motion is restored. Revisit the device section after layout refresh.
  await expect.poll(async()=>{await stageFor(page,'devices').scrollIntoViewIfNeeded();return stageFor(page,'devices').getAttribute('data-active');}).toBe('true');
  await page.goto(`/${locale}/services`);await expect(page.locator('.service-group')).toHaveCount(4);expect(await page.locator('.service-group li a').count()).toBe(11);
  await page.goBack();await expect(page.locator('.amc-preloader')).toHaveAttribute('data-hidden','true');
  await page.locator('#expertise-title').scrollIntoViewIfNeeded(); // Return to the start of the sticky stack, rather than a covered card.
  await expect.poll(async()=>{await stageFor(page,'marketing').scrollIntoViewIfNeeded();return stageFor(page,'marketing').getAttribute('data-active');}).toBe('true');
  await stageFor(page,'marketing').screenshot({path:`docs/reviews/services-motion-evidence/marketing-${locale}-${theme}-${width}.png`});
  expect(errors).toEqual([]);
 });
}

test('blocked WebGL retains artwork and readable controls',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,kind:string,...args:unknown[]){if(kind==='webgl'||kind==='webgl2')return null;return Reflect.apply(original,this,[kind,...args]);} as typeof original;});
 await page.goto('/en');
 for(const scene of scenes){const stage=stageFor(page,scene);await stage.scrollIntoViewIfNeeded();await expect(stage).toHaveAttribute('data-failed','true');await expect(stage.locator('img:visible')).toBeVisible();await expect(stage.locator('button')).toBeDisabled();}
});

test('context loss and tab visibility release drawing',async({page})=>{
 await instrument(page);await page.goto('/en');
 const stage=stageFor(page,'marketing');await stage.scrollIntoViewIfNeeded();await expect(stage).toHaveAttribute('data-active','true');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('.service-motion-stage[data-active="true"]')).toHaveCount(0);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(stage).toHaveAttribute('data-active','true');
 await expect.poll(()=>stage.locator('canvas').evaluate(c=>Number(c.dataset.frames??0))).toBeGreaterThan(2);
 await stage.locator('canvas').evaluate(canvas=>{canvas.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext();});
 await expect(stage).toHaveAttribute('data-failed','true');await expect(stage.locator('img:visible')).toBeVisible();
 const device=stageFor(page,'devices');await device.scrollIntoViewIfNeeded();await expect(device).toHaveAttribute('data-active','true');
 await expect.poll(()=>device.locator('canvas').evaluate(c=>Number(c.dataset.frames??0))).toBeGreaterThan(2);
 await device.locator('canvas').evaluate(canvas=>{canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();});
 await expect(device).toHaveAttribute('data-failed','true');await expect(device.locator('img:visible')).toBeVisible();
});

for(const width of [320,768])test(`small and tablet layout ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/ar');
 for(const scene of scenes){await stageFor(page,scene).scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('reviewed pillar and service content remains server-rendered and claim-free',async({page})=>{
 test.setTimeout(90000);
 for(const locale of ['en','ar'])for(const slug of ['marketing','advertising','consulting','web-development','social-media-management','personal-branding','market-research-analysis','branding','media-buying','outdoor-advertising','corporate-events','ecommerce-consulting','management-consulting','ecommerce-website-development','company-websites-landing-pages']){
  const response=await page.request.get(`/${locale}/services/${slug}`);expect(response.status()).toBe(200);
  const html=await response.text();expect(html).toContain('<h1>');expect(html).not.toMatch(/Lighthouse|90\+|Under 2 s|two-week|three weeks|four weeks|الإسكندرية|ثلاثة أسابيع/);
 }
});

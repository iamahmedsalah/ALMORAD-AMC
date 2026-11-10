import {chooseTheme} from './theme';
import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {pillars,services} from '../../packages/shared/src/index';
for (const locale of ['en','ar']) test(`responsive service posters load and retain their SVG fallback ${locale}`, async ({page}) => {
 await page.setViewportSize({width:locale==='en'?1440:390,height:1000});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(`/${locale}`);
 const poster=page.locator('.service-motion-poster').first();
 await poster.scrollIntoViewIfNeeded();
 await expect(poster).toHaveAttribute('srcset', /\/_next\/image\?/);
 await expect.poll(()=>poster.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 await page.route('**/_next/image?**',route=>route.abort());
 await page.reload();
 await poster.scrollIntoViewIfNeeded();
 await expect(poster).toHaveAttribute('src', /\.svg$/);
 await expect.poll(()=>poster.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});
test('all offering pages contain localised HTML and valid navigation without JavaScript',async({browser,request})=>{
 const context=await browser.newContext({javaScriptEnabled:false,baseURL:test.info().project.use.baseURL});const page=await context.newPage();
 for(const locale of ['en','ar'] as const)for(const item of [...pillars,...services]){const slug='slug' in item?item.slug:item.id;const response=await page.goto(`/${locale}/services/${slug}`);expect(response?.status()).toBe(200);await expect(page.locator('h1')).toHaveText(item[locale]);await expect(page.locator('main')).toContainText(item[locale]);expect(await page.title()).toContain(item[locale]);}
 await context.close();expect((await request.get('/favicon.svg')).headers()['content-type']).toContain('image/svg+xml');
});
for (const locale of ['en','ar']) for (const theme of ['light','dark']) {
 test(`additional public pages remain usable in ${locale} ${theme}`, async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:844});
  for (const path of ['about','work','contact','services/branding']) {
   await page.goto(`/${locale}/${path}`);
   await chooseTheme(page, theme as 'light' | 'dark');
   await expect(page.locator('h1')).toHaveCount(1);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  }
 });
}
test('reduced motion and phones use the official static mark without the scene bundle', async ({page}) => {
 const sceneRequests: string[] = [];
 page.on('request', r => { if (/amc-mark-scene|amc-mark-anim/.test(r.url())) sceneRequests.push(r.url()); });
 await page.emulateMedia({reducedMotion: 'reduce'});
 await page.goto('/en');
 await expect(page.locator('.amc-mark-stage')).toHaveAttribute('data-scene-state', 'static');
 await expect(page.locator('.amc-mark-static:visible')).toBeVisible();
 await expect(page.locator('.amc-mark-stage canvas')).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(page.locator('.amc-mark-stage')).toHaveAttribute('data-scene-state','static');
 expect(sceneRequests).toEqual([]);
});

for (const locale of ['en', 'ar']) test(`3D renders and follows semantic chapters in ${locale}`, async ({page}) => {
 const errors: string[] = [];
 page.on('pageerror', e => errors.push(e.message));
 await page.setViewportSize({width:1440,height:1000});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto(`/${locale}`);
 const stage=page.locator('.amc-mark-stage');
 await expect(stage).toHaveAttribute('data-scene-state','ready',{timeout:20000});
 await expect(stage.locator('canvas')).toBeVisible();
 await expect(page.locator('.amc-mark-poster')).toHaveAttribute('data-hidden','true');
 const box=await stage.boundingBox();
 expect(box!.width).toBeGreaterThan(300);
 expect(locale==='ar' ? box!.x + box!.width / 2 < 720 : box!.x + box!.width / 2 > 720).toBe(true);
 await expect(page.locator('.amc-mark-poster')).toHaveCSS('opacity','0');
 const first=await stage.screenshot({path:`test-results/mark-${locale}-hero.png`});
 await page.evaluate(()=>{
   const el=document.getElementById('chapter-strategy')!;
   window.scrollTo({top:el.getBoundingClientRect().top+scrollY-139,behavior:'instant'});
 });
 await expect(stage).toHaveAttribute('data-chapter','1');
 await expect(page.locator('.scroll-hud-dot[aria-current="step"]')).toHaveAttribute('data-active','true');
 await expect.poll(async()=>Number(await stage.getAttribute('data-progress'))).toBeGreaterThan(0.089);
 // Wait for the supplied camera/piece damping to settle before comparing poses.
 await page.waitForTimeout(1400);
 const second=await stage.screenshot({path:`test-results/mark-${locale}-layers.png`});
 expect(second.equals(first)).toBe(false);
 await page.reload();
 await expect(stage).toHaveAttribute('data-chapter','1');
 await expect(stage).toHaveAttribute('data-scene-state','ready',{timeout:20000});
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(stage).toHaveAttribute('data-scene-state','static');
 await expect(stage.locator('canvas')).toHaveCount(0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(stage).toHaveAttribute('data-scene-state','ready',{timeout:20000});
 await page.locator('.desktop-nav a').first().click();
 await expect(stage).toHaveCount(0);
 await page.goBack();
 await expect(stage).toHaveAttribute('data-scene-state','ready',{timeout:20000});
 await expect(stage.locator('canvas')).toHaveCount(1);
 expect(errors).toEqual([]);
});

test('WebGL initialization failure retains the official SVG and usable HTML', async ({page}) => {
 await page.addInitScript(()=>{
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(...args: Parameters<typeof original>) {
     if (String(args[0]).startsWith('webgl')) return null;
     return original.apply(this,args);
   } as typeof original;
 });
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('/ar');
 await expect(page.locator('.amc-mark-stage')).toHaveAttribute('data-scene-state','fallback',{timeout:20000});
 await expect(page.locator('.amc-mark-static:visible')).toBeVisible();
 await expect(page.locator('.hero-copy .button').first()).toBeVisible();
});

test('WebGL context loss replaces the canvas with SVG', async ({page}) => {
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('/en');
 await expect(page.locator('.amc-mark-stage')).toHaveAttribute('data-scene-state','ready',{timeout:20000});
 await page.locator('.amc-mark-stage canvas').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(page.locator('.amc-mark-stage')).toHaveAttribute('data-scene-state','fallback');
 await expect(page.locator('.amc-mark-stage canvas')).toHaveCount(0);
 await expect(page.locator('.amc-mark-static:visible')).toBeVisible();
});

test('System default and one theme button follow OS, explicit choice and locale navigation', async ({page}) => {
 await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
 await page.goto('/en');
 const icons=page.locator('link[rel="icon"]');
 const control=page.locator('.site-header .theme-cycle-button');
 await expect(control).toHaveCount(1);
 await expect(control).toHaveAttribute('data-theme-choice','system');
 await expect(icons).toHaveCount(1);
 await expect(icons).toHaveAttribute('href','/favicon-light.svg');
 await chooseTheme(page,'dark');
 await expect(icons).toHaveAttribute('href','/favicon-navy.svg');
 await expect(page.locator('.site-header')).toHaveCSS('background-color','rgb(247, 118, 30)');
 await page.reload();
 await expect(control).toHaveAttribute('data-theme-choice','dark');
 await expect(icons).toHaveAttribute('href','/favicon-navy.svg');
 await page.locator('.site-header .locale-link').click();
 await expect(page).toHaveURL(/\/ar$/);
 await expect(icons).toHaveCount(1);
 await expect(icons).toHaveAttribute('href','/favicon-navy.svg');
 await chooseTheme(page,'system');
 await page.emulateMedia({colorScheme:'light'});
 await expect(icons).toHaveAttribute('href','/favicon-light.svg');
 await page.emulateMedia({colorScheme:'dark'});
 await expect(icons).toHaveAttribute('href','/favicon-navy.svg');
 await chooseTheme(page,'light');
 await expect(icons).toHaveAttribute('href','/favicon-light.svg');
});

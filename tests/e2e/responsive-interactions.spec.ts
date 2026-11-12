import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {booking,mockOperations,fixtureScreenshot} from './fixtures/operations';
import {deskCopy} from '../../apps/web/src/features/booking/desk-copy';

for(const locale of ['en','ar'] as const)for(const theme of ['light','dark'])for(const width of [320,390,834,1440]){
 test(`readable menu FAQ and password ${locale} ${theme} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(value=>localStorage.setItem('theme',value),theme);
  await page.goto(`/${locale}/faq`);
  if(width<1180){
   const trigger=page.locator('.burger-trigger');await expect(trigger).toHaveAttribute('aria-label',locale==='ar'?'فتح القائمة':'Open menu');
   await trigger.click();const drawer=page.locator('.side-drawer');
   await expect(trigger).toHaveAttribute('aria-expanded','true');
   const labels=await drawer.locator('.side-drawer-link-label').evaluateAll(nodes=>nodes.map(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,line:parseFloat(getComputedStyle(node).lineHeight)})));
   for(const box of labels){expect(box.width).toBeGreaterThan(150);expect(box.height).toBeLessThanOrEqual(box.line*2+1);}
   await expect(drawer.getByRole('button',{name:locale==='ar'?'إغلاق القائمة':'Close menu',exact:true})).toHaveAttribute('title',locale==='ar'?'إغلاق القائمة':'Close menu');
   if(width===390)await fixtureScreenshot(page,`docs/reviews/responsive-motion/menu-${locale}-${theme}.png`);
   await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(trigger).toHaveAttribute('aria-expanded','false');
  }else await expect(page.locator('.burger-trigger')).toBeHidden();
  const summary=page.locator('.faq-accordion summary').first();const question=summary.locator('.faq-accordion-question');
  expect(await question.evaluate(node=>node.getBoundingClientRect().width)).toBeGreaterThan(120);
  await summary.focus();await page.keyboard.press('Enter');await expect(summary).toHaveAttribute('aria-expanded','true');
  await expect(summary.locator('..')).toHaveAttribute('open','');
  await page.keyboard.press('Space');await expect(summary).toHaveAttribute('aria-expanded','false');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(width===390){expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);await fixtureScreenshot(page,`docs/reviews/responsive-motion/faq-${locale}-${theme}.png`,true);}
  await page.goto(`/${locale}/staff/login`);const password=page.locator('input[name=password]');await password.fill('synthetic-not-a-real-password');
  const eye=page.locator('.staff-password-toggle');await expect(eye.locator('.animated-icon')).toHaveAttribute('data-active','false');await expect(password).toHaveAttribute('type','password');
  await eye.click();await expect(password).toHaveAttribute('type','text');await expect(eye.locator('.animated-icon')).toHaveAttribute('data-active','true');
  await expect(eye).toHaveAttribute('aria-label',locale==='ar'?'إخفاء كلمة المرور':'Hide password');
  await eye.click();await expect(password).toHaveAttribute('type','password');
  expect(await eye.evaluate(node=>node.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}

for(const locale of ['en','ar'] as const)for(const role of ['MANAGER','RECEPTIONIST'] as const)for(const width of [390,834]){
 test(`responsive assigned or shared agenda ${locale} ${role} ${width}`,async({page})=>{
  const c=deskCopy(locale);await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await mockOperations(page,role);
  await page.goto(`/${locale}/staff/calendar`);await expect(page.locator('.calendar-appointment')).toBeEnabled();
  await expect(page.locator('.social-disclosure-sidebar')).toHaveCount(0);
  await expect(page.locator('.agenda-scope')).toHaveText(role==='MANAGER'?(locale==='ar'?'مواعيدي المعيّنة':'My assigned meetings'):(locale==='ar'?'أجندة الفريق':'Team agenda'));
  await page.getByRole('button',{name:c.agenda,exact:true}).click();await expect(page.locator('.appointment-agenda-list')).toBeVisible();
  let release!:()=>void;const waiting=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/staff/appointments?**',async route=>{await waiting;await route.fulfill({json:{items:[booking],total:1,page:0,timezone:booking.timezone,isDemo:true}});});
  const refresh=page.locator('.agenda-refresh');await refresh.click();await expect(refresh).toHaveAttribute('aria-busy','true');
  await expect(page.locator('.calendar-appointment')).toBeVisible();await expect(page.locator('.calendar-appointment')).toBeDisabled();release();
  await expect(refresh).toHaveAttribute('aria-busy','false');await page.locator('.calendar-appointment').click();
  await expect(page.locator('input[name=meetingUrl]')).toBeVisible();
  await expect(page.locator('.appointment-detail-panel')).toBeFocused();
  await expect(page.getByRole('combobox',{name:locale==='ar'?'المسؤول عن الاجتماع':'Assigned manager',exact:true})).toHaveCount(role==='MANAGER'?0:1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await fixtureScreenshot(page,`docs/reviews/responsive-motion/agenda-${locale}-${role}-${width}.png`,true);
 });
}

test('FAQ motion is transform/opacity only and settles on latest toggle and reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/en/faq');
 const item=page.locator('.faq-accordion details').first(),summary=item.locator('summary');await summary.click();
 const animatedProperties=await item.locator('.faq-accordion-answer').evaluate(node=>node.getAnimations().flatMap(animation=>(animation.effect as KeyframeEffect).getKeyframes().flatMap(frame=>Object.keys(frame))));
 expect(animatedProperties).not.toContain('height');expect(animatedProperties).not.toContain('width');expect(animatedProperties).toContain('opacity');
 await summary.click();await summary.click();await expect(summary).toHaveAttribute('aria-expanded','true');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(item).toHaveAttribute('open','');
 await summary.click();await expect(item).not.toHaveAttribute('open','');
});

test('tablet landscape menu and FAQ remain usable',async({page})=>{
 await page.setViewportSize({width:1024,height:600});await page.goto('/en/faq');await page.locator('.burger-trigger').click();
 await page.locator('.side-drawer .side-drawer-link').last().scrollIntoViewIfNeeded();await expect(page.locator('.side-drawer .side-drawer-link').last()).toBeInViewport();
 await page.keyboard.press('Escape');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const width of [360,430,768,1024])test(`additional phone and tablet text width ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===1024?768:932});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/ar/faq');
 expect(await page.locator('.faq-accordion-question').first().evaluate(node=>node.getBoundingClientRect().width)).toBeGreaterThan(120);
 await page.locator('.burger-trigger').click();
 expect(await page.locator('.side-drawer-link-label').first().evaluate(node=>node.getBoundingClientRect().width)).toBeGreaterThan(150);
 await page.keyboard.press('Escape');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('agenda refresh failure retains records and exposes recovery feedback',async({page})=>{
 await mockOperations(page,'RECEPTIONIST');await page.goto('/en/staff/calendar');await expect(page.locator('.calendar-appointment')).toBeEnabled();
 await expect(page.locator('.booking-filters')).toBeHidden();await page.locator('.agenda-filter-panel > summary').click();await expect(page.locator('.booking-filters')).toBeVisible();
 await page.route('**/api/staff/appointments?**',route=>route.fulfill({status:503,json:{message:'Synthetic offline response'}}));
 await page.locator('.agenda-refresh').click();await expect(page.locator('.agenda-results')).toContainText('Showing the last loaded appointments');
 await expect(page.locator('.calendar-appointment')).toBeVisible();await expect(page.locator('.agenda-refresh')).toHaveAttribute('aria-busy','false');
});

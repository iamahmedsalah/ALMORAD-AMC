import {test,expect} from '@playwright/test';
for(const locale of ['en','ar'])for(const theme of ['light','dark'])test(`static team portraits ${locale} ${theme}`,async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(t=>localStorage.setItem('theme',t),theme);
 const optimized:string[]=[];page.on('request',request=>{if(new URL(request.url()).pathname==='/_next/image')optimized.push(request.url());});
 await page.goto('/'+locale+'/team');
 await expect(page.locator('.lp-team-verified-pill')).toHaveCount(0);
 if(locale==='en')await expect(page.locator('[data-team-card] h3,[data-team-card] h4')).toHaveText(['Eng. Khaled Morad','Eng. Mohamed Khaled Morad','Dr. Belal Khaled Morad','Gina Raafat','Farah','Omar Allam','Ahmed Soliman','Mayar Alaa','Alaa Hassan']);
 const images=page.locator('[data-team-card] img');await expect(images).toHaveCount(8);
 for(const image of await images.all()){
  await image.scrollIntoViewIfNeeded();await expect(image).toHaveAttribute('src',/^\/images\/team\/.*\.webp$/);
  await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0)).toBe(true);
 }
 expect(optimized).toEqual([]);
 const image=images.first();const source=await image.getAttribute('src');const response=await page.request.get(source!);expect(response.status()).toBe(200);expect(response.headers()['content-type']).toContain('image/webp');
});

/** Optional visual QA for the synthetic previews; no network or email provider. */
import {readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';

const directory=resolve('docs/reviews/email-template-preview');
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:680,height:900},deviceScaleFactor:1});
  for(const file of readdirSync(directory).filter(name=>name.endsWith('.html')&&name!=='index.html')){
    await page.goto(pathToFileURL(join(directory,file)).href);
    await page.locator('h1').waitFor();
    await page.screenshot({path:join(directory,file.replace('.html','.png')),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(pathToFileURL(join(directory,'index.html')).href);
  await page.locator('img').last().waitFor();
  await page.screenshot({path:join(directory,'overview.png'),fullPage:true});
  console.log('Captured all local email previews');
} finally {await browser.close();}

import {expect,it} from 'vitest';
import {NextRequest} from 'next/server';
import {unstable_getResponseFromNextConfig} from 'next/experimental/testing/server';
import config from '../../next.config';
it('redirects only public aliases with paths and query strings intact',async()=>{
 const redirects=await config.redirects!();
 const nextConfig={redirects:async()=>redirects};
 for(const host of ['almorad-amc.vercel.app','www.almorad-amc.com']){
  const response=await unstable_getResponseFromNextConfig({url:new NextRequest('https://'+host+'/ar/team?source=old').url,nextConfig});
  expect(response.status).toBe(308);expect(response.headers.get('location')).toBe('https://almorad-amc.com/ar/team?source=old');
 }
 for(const host of ['almorad-amc.com','candidate-123.vercel.app','almorad-amcXvercelXapp','localhost:3000']){
  const response=await unstable_getResponseFromNextConfig({url:'https://'+host+'/en/contact',nextConfig});
  expect(response.headers.get('location')).toBeNull();
 }
});

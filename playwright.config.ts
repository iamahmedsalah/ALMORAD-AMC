import {defineConfig} from '@playwright/test';
const target=process.env.PLAYWRIGHT_BASE_URL;
if(target){const url=new URL(target);if(!['http:','https:'].includes(url.protocol)||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('PLAYWRIGHT_BASE_URL must be a local HTTP(S) origin');}
const baseURL=target||'http://127.0.0.1:3000';
export default defineConfig({testDir:'./tests/e2e',fullyParallel:true,workers:process.env.CI?1:undefined,forbidOnly:!!process.env.CI,timeout:30000,use:{launchOptions:{args:['--enable-unsafe-swiftshader']},baseURL},webServer:target?undefined:{command:'node --run start -- --hostname 127.0.0.1',cwd:'./apps/web',url:`${baseURL}/en`,reuseExistingServer:false,timeout:120000},reporter:[['list'],['html',{open:'never'}]]});

import {randomBytes} from 'node:crypto';
import {defineConfig} from '@playwright/test';
const proxySecret=randomBytes(32).toString('hex');
const testDatabase=process.env.TEST_DATABASE_URL;
if(!testDatabase)throw new Error('TEST_DATABASE_URL is required for staff browser tests');
const url=new URL(testDatabase);if(!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw new Error('Staff browser tests require isolated local *_test PostgreSQL');
export default defineConfig({
 testDir:'./apps/api/tests',testMatch:'staff.browser.ts',workers:1,timeout:30000,
 use:{baseURL:'http://127.0.0.1:4300',reducedMotion:'reduce'},
 webServer:[
  {command:'node --env-file-if-exists=../../.env dist/apps/api/src/main.js',cwd:'./apps/api',url:'http://127.0.0.1:4301/health/ready',reuseExistingServer:false,timeout:120000,env:{NODE_ENV:'test',STAFF_PROXY_SECRET:proxySecret,BOOKING_TOKEN_SECRET:proxySecret,DATABASE_URL:testDatabase,API_PORT:'4301',WEB_ORIGIN:'http://127.0.0.1:4300'}},
  {command:'node --run start -- --hostname 127.0.0.1 --port 4300',cwd:'./apps/web',url:'http://127.0.0.1:4300/en/staff/login',reuseExistingServer:false,timeout:120000,env:{NODE_ENV:'production',STAFF_PROXY_SECRET:proxySecret,WEB_ORIGIN:'http://127.0.0.1:4300',STAFF_API_ORIGIN:'http://127.0.0.1:4301'}}
 ],reporter:[['list'],['html',{outputFolder:'playwright-staff-report',open:'never'}]]
});

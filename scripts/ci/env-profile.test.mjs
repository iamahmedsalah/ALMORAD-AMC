import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep,basename} from 'node:path';
import {profileEnvironment,auditEnvironment} from '../env-profile.mjs';
import {spawnSync} from 'node:child_process';

test('local overlays base, injected variables win and prod never loads local/base files',()=>{
 const root=mkdtempSync(join(tmpdir(),'amc-env-profile-'));
 try{
  writeFileSync(join(root,'.env'),'BASE_ONLY=base\nSHARED=base\n');
  writeFileSync(join(root,'.env.local'),'LOCAL_ONLY=local\nSHARED=local\n');
  writeFileSync(join(root,'.env.prod'),'SHARED=prod\nNODE_ENV=prod\n');
  assert.deepEqual(profileEnvironment('local',root,{SHARED:'injected'}),{BASE_ONLY:'base',LOCAL_ONLY:'local',SHARED:'injected',NODE_ENV:'development'});
  assert.deepEqual(profileEnvironment('prod',root,{}),{BASE_ONLY:'',SHARED:'prod',NODE_ENV:'production'});
  const legacy=spawnSync(process.execPath,['--env-file='+join(root,'.env'),'--input-type=module','-e',"import {loadEnvFile} from 'node:process';loadEnvFile(process.argv[1]);process.stdout.write(JSON.stringify({base:process.env.BASE_ONLY,shared:process.env.SHARED}));",join(root,'.env')],{env:profileEnvironment('prod',root,{}),encoding:'utf8',timeout:5000});
  assert.equal(legacy.status,0);assert.deepEqual(JSON.parse(legacy.stdout),{base:'',shared:'prod'});
 }finally{assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep)&&basename(root).startsWith('amc-env-profile-'));rmSync(root,{recursive:true,force:true});}
});
test('audit reports only key names, never values, and rejects malformed origins/secrets',()=>{
 const secret='sensitive-fixture-value';const report=auditEnvironment({DATABASE_URL:secret,WEB_ORIGIN:secret,EMAIL_SITE_URL:secret,STAFF_PROXY_SECRET:secret});
 assert.equal(report.ok,false);assert.ok(report.invalid.includes('EMAIL_SITE_URL'));assert.ok(report.missing.includes('CRON_SECRET'));assert.ok(!JSON.stringify(report).includes(secret));
});
test('prod audits require valid sender configuration and retain explicit approval/indexing gates',()=>{
 const env={DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1/amc_test',WEB_ORIGIN:'https://studio.example.invalid',STAFF_PROXY_SECRET:'p'.repeat(64),STAFF_CSRF_SECRET:'c'.repeat(64),BOOKING_TOKEN_SECRET:'b'.repeat(64),CRON_SECRET:'r'.repeat(64),RESEND_API_KEY:'fixture',RESEND_FROM_EMAIL:'Studio <onboarding@resend.dev>'};
 const report=auditEnvironment(env,{production:true});assert.equal(report.ok,false);assert.ok(report.invalid.includes('RESEND_FROM_EMAIL / RESEND_BOOKING_FROM_EMAIL'));assert.ok(report.warnings.some(value=>value.startsWith('BOOKING_APPROVED:')));
});

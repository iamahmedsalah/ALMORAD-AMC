import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('candidate bypass is masked, exported and revoked without changing existing protection',()=>{
 const directory=mkdtempSync(join(tmpdir(),'amc-protection-test-'));
 const env={...process.env,GITHUB_ACTIONS:'true',RUNNER_TEMP:directory,GITHUB_ENV:join(directory,'github-env'),VERCEL_PROJECT_ID:'fixture-project',VERCEL_ORG_ID:'fixture-team',VERCEL_TOKEN:'fixture',VERCEL_AUTOMATION_BYPASS_SECRET:''};
 const capture=join(directory,'request.json');
 const stub=`import fs from 'node:fs';globalThis.fetch=async(url,options)=>{if(!String(url).startsWith('https://api.vercel.com/v1/projects/fixture-project/protection-bypass?teamId=fixture-team'))throw new Error('Unexpected destination');fs.writeFileSync(${JSON.stringify(capture)},options.body);return new Response('{}',{status:200});};`;
 function run(mode,extra={}){return spawnSync(process.execPath,['--input-type=module','-e',`${stub}process.argv[2]=${JSON.stringify(mode)};await import(${JSON.stringify(new URL('./protection-bypass.mjs',import.meta.url).href)});`],{env:{...env,...extra},encoding:'utf8'});}
 try{
  writeFileSync(env.GITHUB_ENV,'');
  const generated=run('prepare');assert.equal(generated.status,0,generated.stderr);
  const record=JSON.parse(readFileSync(capture,'utf8'));assert.match(record.generate.secret,/^[a-f0-9]{64}$/);assert.equal(record.revoke,undefined);
  assert.ok(generated.stdout.includes('::add-mask::'+record.generate.secret));
  assert.ok(readFileSync(env.GITHUB_ENV,'utf8').includes(record.generate.secret));
  const cleaned=run('cleanup');assert.equal(cleaned.status,0,cleaned.stderr);
  assert.equal(JSON.parse(readFileSync(capture,'utf8')).revoke.secret,record.generate.secret);
  assert.equal(existsSync(join(directory,'amc-release-protection.json')),false);
  const existing=run('prepare',{VERCEL_AUTOMATION_BYPASS_SECRET:'fixture-existing'});assert.equal(existing.status,0,existing.stderr);assert.equal(existsSync(join(directory,'amc-release-protection.json')),false);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

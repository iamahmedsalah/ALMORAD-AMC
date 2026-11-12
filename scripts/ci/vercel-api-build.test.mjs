import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildVercelApi} from './vercel-api-build.mjs';

test('explicitly authorized production migration check runs after every successful build, including cached compilation',async()=>{
  const calls=[],env={VERCEL_ENV:'production',AMC_RELEASE_MIGRATIONS:'1'};
  const dependencies={execute:()=>{calls.push('build');return {status:0};},migrate:async supplied=>{assert.equal(supplied,env);calls.push('migrations');}};
  await buildVercelApi(env,dependencies);await buildVercelApi(env,dependencies);
  assert.deepEqual(calls,['build','migrations','build','migrations']);
});

test('failed API compilation prevents production migration execution',async()=>{
  let migrated=false;
  await assert.rejects(buildVercelApi({VERCEL_ENV:'production'},{execute:()=>({status:1}),migrate:async()=>{migrated=true;}}),/build failed/);
  assert.equal(migrated,false);
});

test('production/preview without authorization and local builds do not invoke migrations',async()=>{
  let migrated=false;
  for(const env of [{VERCEL_ENV:'production'},{VERCEL_ENV:'preview'},{AMC_RELEASE_MIGRATIONS:'1'},{}])await buildVercelApi(env,{execute:()=>({status:0}),migrate:async()=>{migrated=true;}});
  assert.equal(migrated,false);
});

test('authorized staging preview migrates before it can pass deployment verification',async()=>{
  const calls=[];
  await buildVercelApi({VERCEL_ENV:'preview',AMC_RELEASE_MIGRATIONS:'1'},{execute:()=>{calls.push('build');return {status:0};},migrate:async()=>{calls.push('migrate');}});
  assert.deepEqual(calls,['build','migrate']);
});

test('migration/backup gate failure stops the Vercel build',async()=>{
  await assert.rejects(buildVercelApi({VERCEL_ENV:'production',AMC_RELEASE_MIGRATIONS:'1'},{execute:()=>({status:0}),migrate:async()=>{throw new Error('reviewed release required');}}),/reviewed release required/);
});

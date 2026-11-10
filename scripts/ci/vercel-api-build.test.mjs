import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildVercelApi} from './vercel-api-build.mjs';

test('Vercel production migration check runs after every successful build, including cached compilation',async()=>{
  const calls=[],env={VERCEL_ENV:'production'};
  const dependencies={execute:()=>{calls.push('build');return {status:0};},migrate:async supplied=>{assert.equal(supplied,env);calls.push('migrations');}};
  await buildVercelApi(env,dependencies);await buildVercelApi(env,dependencies);
  assert.deepEqual(calls,['build','migrations','build','migrations']);
});

test('failed API compilation prevents production migration execution',async()=>{
  let migrated=false;
  await assert.rejects(buildVercelApi({VERCEL_ENV:'production'},{execute:()=>({status:1}),migrate:async()=>{migrated=true;}}),/build failed/);
  assert.equal(migrated,false);
});

test('preview and local Vercel builds do not invoke production migration checks',async()=>{
  let migrated=false;
  for(const env of [{VERCEL_ENV:'preview'},{}])await buildVercelApi(env,{execute:()=>({status:0}),migrate:async()=>{migrated=true;}});
  assert.equal(migrated,false);
});

test('migration/backup gate failure stops the Vercel build',async()=>{
  await assert.rejects(buildVercelApi({VERCEL_ENV:'production'},{execute:()=>({status:0}),migrate:async()=>{throw new Error('reviewed release required');}}),/reviewed release required/);
});

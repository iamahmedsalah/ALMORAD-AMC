import {test} from 'node:test';
import assert from 'node:assert/strict';
import {developmentTarget,migrateDevelopment} from '../dev-migrations.mjs';

const local={NODE_ENV:'development',DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1:5432/amc_dev'};
test('development migration guard accepts local dev but rejects hosted, production, CI and mismatched targets',()=>{
  assert.equal(developmentTarget(local).url.pathname,'/amc_dev');
  for(const env of [
    {...local,NODE_ENV:'production'}, {...local,VERCEL:'1'}, {...local,CI:'true'},
    {...local,DATABASE_URL:'postgresql://fixture:fixture@database.example.invalid/amc_dev'},
    {...local,DIRECT_URL:'postgresql://fixture:fixture@database.example.invalid/amc_dev'},
    {...local,DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1:5432/production'},
    {...local,DIRECT_URL:'postgresql://fixture:fixture@127.0.0.1:5433/amc_dev'},
    {...local,DIRECT_URL:'postgresql://fixture:fixture@127.0.0.1:5432/amc_other_dev'},
  ])assert.throws(()=>developmentTarget(env));
});

test('development command applies pending migrations, verifies and then generates the client',async()=>{
  const calls=[];let inspected=0;
  const result=await migrateDevelopment(local,{
    inspect:async()=>{calls.push('inspect');return {pending:inspected++?[]:['new_migration']};},
    execute:(_exe,args)=>{calls.push(args.slice(1).join(' '));return {status:0};},
  });
  assert.deepEqual(calls,['inspect','migrate deploy','inspect','generate']);
  assert.equal(result.applied,1);assert.equal(result.pending,0);
});

test('development command skips migration writes when already current',async()=>{
  const calls=[];
  const result=await migrateDevelopment(local,{inspect:async()=>({pending:[]}),execute:(_exe,args)=>{calls.push(args.slice(1));return {status:0};}});
  assert.deepEqual(calls,[['generate']]);assert.equal(result.applied,0);
});

test('development command rejects hosted targets before inspection or execution',async()=>{
  let called=false;
  await assert.rejects(migrateDevelopment({...local,DIRECT_URL:'postgresql://fixture:fixture@database.example.invalid/amc_dev'},{inspect:async()=>{called=true;},execute:()=>{called=true;}}));
  assert.equal(called,false);
});

test('explicit development policy permits hosted Prisma migrations from a local shell',()=>{
  const env={NODE_ENV:'development',DATABASE_URL:'postgresql://fixture:fixture@pool.example.invalid/studio',DIRECT_URL:'postgresql://fixture:fixture@direct.example.invalid/studio',AMC_RELEASE_MIGRATIONS:'1',AMC_MIGRATION_POLICY:'development'};
  assert.equal(developmentTarget(env).url.hostname,'direct.example.invalid');
  for(const change of [{AMC_RELEASE_MIGRATIONS:'invalid'},{AMC_MIGRATION_POLICY:'production'},{VERCEL:'1'},{CI:'1'},{DIRECT_URL:'postgresql://other:fixture@direct.example.invalid/studio'},{DIRECT_URL:'postgresql://fixture:different@direct.example.invalid/studio'},{DIRECT_URL:'postgresql://fixture:fixture@direct.example.invalid/other'}])assert.throws(()=>developmentTarget({...env,...change}));
});

test('zero disables hosted startup migrations while still generating the client',async()=>{
  const env={NODE_ENV:'development',DATABASE_URL:'postgresql://fixture:fixture@db.example.invalid/studio',AMC_RELEASE_MIGRATIONS:'0'};
  const calls=[];
  const result=await migrateDevelopment(env,{inspect:async()=>({pending:['not_applied']}),execute:(_exe,args)=>{calls.push(args.slice(1));return {status:0};}});
  assert.deepEqual(calls,[['generate']]);
  assert.equal(result.applied,0);assert.equal(result.pending,1);assert.equal(result.event,'development_migrations_skipped');
});

test('development migration failures stop verification/client generation without leaking output',async()=>{
  const calls=[];
  await assert.rejects(migrateDevelopment(local,{inspect:async()=>({pending:['new']}),execute:(_exe,args)=>{calls.push(args.slice(1));return {status:1,stderr:'private provider fixture'};}}),/Local migration failed/);
  assert.deepEqual(calls,[['migrate','deploy']]);
  await assert.rejects(migrateDevelopment(local,{inspect:async()=>({pending:['new']}),execute:()=>({status:0})}),/still has pending/);
});

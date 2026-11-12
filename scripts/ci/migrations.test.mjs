import {test} from 'node:test';
import assert from 'node:assert/strict';
import {migrationTarget,reviewSql,pendingMigrations,authorizeMigration,migrationManifest,deployMigrations} from './migrations.mjs';
import {deploymentUrl} from './deployment-url.mjs';
const remote={DIRECT_URL:'postgresql://release:private@db.example.invalid/studio?schema=public',NODE_ENV:'production'};
test('migration target rejects non-TCP sources and unsafe schemas without leaking credentials',()=>{
  assert.throws(()=>migrationTarget({DIRECT_URL:'prisma+postgres://host/?api_key=secret'}),/PostgreSQL TCP/);
  assert.throws(()=>migrationTarget({DIRECT_URL:'postgresql://user:secret@host/db?schema=public;drop'}),/schema/);
  const target=migrationTarget(remote);assert.match(target.fingerprint,/^[a-f0-9]{64}$/);
  assert.equal(target.fingerprint,migrationTarget({...remote,DIRECT_URL:remote.DIRECT_URL.replace('private','rotated')}).fingerprint);
});
test('production migration requires matching reviewed release, backup and database',()=>{
  const state={pending:['new'],fingerprint:migrationTarget(remote).fingerprint,digest:'d'.repeat(64)};
  assert.throws(()=>authorizeMigration(remote,state),/reviewed release/);
  const approved={...remote,AMC_RELEASE_MIGRATIONS:'1',AMC_RELEASE_SHA:'a'.repeat(40),AMC_MIGRATION_BACKUP_REF:'github:owner/repository:123:1',AMC_RELEASE_DATABASE_FINGERPRINT:state.fingerprint,AMC_RELEASE_MIGRATION_DIGEST:state.digest};
  assert.doesNotThrow(()=>authorizeMigration(approved,state));
  for(const key of ['AMC_RELEASE_MIGRATIONS','AMC_RELEASE_SHA','AMC_MIGRATION_BACKUP_REF','AMC_RELEASE_DATABASE_FINGERPRINT','AMC_RELEASE_MIGRATION_DIGEST'])assert.throws(()=>authorizeMigration({...approved,[key]:'invalid'},state));
  assert.doesNotThrow(()=>authorizeMigration(remote,{...state,pending:[]}));
});
test('only isolated local test databases bypass production release prerequisites',()=>{
  assert.doesNotThrow(()=>authorizeMigration({DIRECT_URL:'postgresql://test:test@localhost/amc_release_test'}, {pending:['new']}));
  assert.throws(()=>authorizeMigration({DIRECT_URL:'postgresql://test:test@localhost/amc_dev'}, {pending:['new']}));
  assert.throws(()=>authorizeMigration({DIRECT_URL:'postgresql://test:test@remote.invalid/amc_test'}, {pending:['new']}));
});

test('development/testing releases explicitly opt into migrations without a backup reference',()=>{
  const state={pending:['new'],fingerprint:migrationTarget(remote).fingerprint,digest:'d'.repeat(64)};
  const env={...remote,AMC_RELEASE_MIGRATIONS:'1',AMC_MIGRATION_POLICY:'development'};
  assert.doesNotThrow(()=>authorizeMigration(env,state));
  assert.throws(()=>authorizeMigration({...env,AMC_RELEASE_MIGRATIONS:'0'},state));
  assert.throws(()=>authorizeMigration({...env,AMC_MIGRATION_POLICY:'unknown'},state));
  assert.throws(()=>authorizeMigration({...env,AMC_RELEASE_DATABASE_FINGERPRINT:'wrong'},state),/database does not match/);
  assert.throws(()=>authorizeMigration({...env,AMC_RELEASE_MIGRATION_DIGEST:'wrong'},state),/manifest does not match/);
});

test('migration deployment verifies history after execution and refuses residual pending migrations',async()=>{
  const state={pending:['new'],fingerprint:migrationTarget(remote).fingerprint,digest:'d'.repeat(64)};
  const env={...remote,AMC_RELEASE_MIGRATIONS:'1',AMC_MIGRATION_POLICY:'development'};
  let reads=0;const calls=[];
  await deployMigrations(env,{inspect:async()=>reads++?{...state,pending:[]}:state,execute:(_exe,args)=>{calls.push(args.slice(1));return {status:0};}});
  assert.deepEqual(calls,[['migrate','deploy']]);assert.equal(reads,2);
  await assert.rejects(deployMigrations(env,{inspect:async()=>state,execute:()=>({status:0})}),/verification failed/);
  await assert.rejects(deployMigrations(env,{inspect:async()=>state,execute:()=>({status:1,stderr:'private connection details'})}),/Prisma migration deployment failed/);
});
test('applied history cannot be silently baselined, modified, failed or gapped',()=>{
  const entries=[{name:'one',checksum:'a'},{name:'two',checksum:'b'}];
  const done={migration_name:'one',checksum:'a',finished_at:'done',rolled_back_at:null};
  assert.deepEqual(pendingMigrations(entries,null,[]),['one','two']);
  assert.throws(()=>pendingMigrations(entries,null,['ContactInquiry']),/baseline/);
  assert.deepEqual(pendingMigrations(entries,[done],['ContactInquiry']),['two']);
  assert.throws(()=>pendingMigrations(entries,[{...done,checksum:'modified'}],[]),/differs/);
  assert.throws(()=>pendingMigrations(entries,[{...done,finished_at:null}],[]),/unfinished/);
  assert.throws(()=>pendingMigrations(entries,[{...done,migration_name:'two',checksum:'b'}],[]),/gap/);
});
test('SQL risk gate rejects unreviewed destructive and data-changing SQL',()=>{
  assert.doesNotThrow(()=>reviewSql('CREATE TABLE "Example" (id UUID);','a',[]));
  for(const sql of ['DROP TABLE "Booking";','TRUNCATE "ContactInquiry";','UPDATE "Booking" SET status=1;','ALTER TABLE t ALTER COLUMN x TYPE text;'])assert.throws(()=>reviewSql(sql,'a',[]),/checksum review/);
  assert.doesNotThrow(()=>reviewSql('DROP INDEX old;','reviewed',['reviewed']));
});
test('all current migration files have reproducible, reviewed checksums',async()=>{
  const manifest=await migrationManifest();assert.ok(manifest.entries.length>=8);assert.match(manifest.digest,/^[a-f0-9]{64}$/);
});
test('release URL extraction rejects ambiguous or lookalike deployment domains',()=>{
  assert.equal(deploymentUrl('Production: https://almorad-example-team.vercel.app\n{"url":"https://almorad-example-team.vercel.app"}'),'https://almorad-example-team.vercel.app');
  assert.throws(()=>deploymentUrl('https://almorad-example.vercel.app.evil.invalid'));
  assert.throws(()=>deploymentUrl('https://almorad-one.vercel.app https://almorad-two.vercel.app'));
  assert.throws(()=>deploymentUrl('https://almorad-amc.vercel.app'));
});

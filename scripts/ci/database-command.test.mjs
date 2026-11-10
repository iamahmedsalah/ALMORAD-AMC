import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,access,rm} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {databaseCommandFailure,runDatabaseCommand} from './database-command.mjs';

test('release diagnostics distinguish actionable restore failures without raw output',()=>{
  const cases=[
    ['Cannot connect to the Docker daemon','docker_unavailable'],
    ['failed to resolve reference postgres:fixture','container_image_unavailable'],
    ['connection to server at fixture failed: Connection refused','database_connection'],
    ['FATAL: password authentication failed for user fixture','database_authentication'],
    ['ERROR: extension fixture is not available','extension_unavailable'],
    ['ERROR: role fixture does not exist','missing_database_role'],
    ['ERROR: permission denied for schema fixture','database_permissions'],
    ['ERROR: schema fixture already exists','restore_target_conflict'],
    ['aborting because of server version mismatch','server_version_mismatch'],
    ['ERROR: unrecognized configuration parameter fixture','server_setting_incompatible'],
    ['unsupported version (99) in file header','archive_incompatible'],
    ['bad decrypt','backup_decryption'],
    ['pg_restore: error: could not execute query','database_query_failed'],
    ['unrecognized failure fixture','unclassified'],
  ];
  for(const [stderr,category] of cases){
    const diagnostic=databaseCommandFailure('rehearsal_restore',{status:1,stderr:`${stderr}\nsynthetic-client@example.invalid`});
    assert.deepEqual(diagnostic,{event:'database_release_command_failed',stage:'rehearsal_restore',category,exitCode:1});
    assert.ok(!JSON.stringify(diagnostic).includes('fixture'));
    assert.ok(!JSON.stringify(diagnostic).includes('synthetic-client'));
  }
});

test('spawn errors and exit statuses stay bounded and contain no error message',()=>{
  for(const [code,category] of [['ENOENT','command_unavailable'],['ETIMEDOUT','command_timeout'],['ENOBUFS','output_limit']]){
    const result=databaseCommandFailure('rehearsal_connect',{status:null,error:{code,message:'sensitive fixture'}});
    assert.equal(result.category,category);assert.equal(result.exitCode,null);
    assert.ok(!JSON.stringify(result).includes('sensitive'));
  }
  assert.equal(databaseCommandFailure('backup_dump',{status:'sensitive fixture'}).exitCode,null);
});

test('command failure remains blocking and never prints captured SQL or credentials',()=>{
  assert.throws(()=>runDatabaseCommand('rehearsal_restore','docker',[],{},()=>({status:1,stdout:'sensitive SQL fixture',stderr:'ERROR: relation fixture already exists'})),error=>{
    assert.deepEqual(JSON.parse(error.message),{event:'database_release_command_failed',stage:'rehearsal_restore',category:'restore_target_conflict',exitCode:1});
    return true;
  });
  assert.doesNotThrow(()=>runDatabaseCommand('rehearsal_connect','docker',[],{},()=>({status:0,stdout:'sensitive fixture'})));
  assert.throws(()=>runDatabaseCommand('sensitive fixture','docker',[],{},()=>{throw new Error('Must not execute');}),/Unknown database release stage/);
});

test('unsafe rehearsal target is rejected before Docker and failed rehearsal removes plaintext',async()=>{
  const parent=resolve('.tmp');await mkdir(parent,{recursive:true});
  const directory=await mkdtemp(join(parent,'release-diagnostic-test-'));
  try{
    const artifacts=join(directory,'amc-database-release');await mkdir(artifacts);
    const plaintext=join(artifacts,'database.dump');await writeFile(plaintext,'synthetic fixture');
    const result=spawnSync(process.execPath,['scripts/ci/database-release.mjs','rehearse'],{
      env:{...process.env,RUNNER_TEMP:directory,REHEARSAL_DATABASE_URL:'postgresql://fixture:fixture@database.example.invalid/rehearsal_test'},encoding:'utf8',timeout:30000,
    });
    assert.equal(result.status,1);
    assert.match(result.stderr,/Rehearsal requires isolated local/);
    assert.ok(!result.stderr.includes('database.example.invalid'));
    await assert.rejects(access(plaintext),{code:'ENOENT'});
  }finally{
    assert.ok(directory.startsWith(parent+sep)&&directory.slice(parent.length+1).startsWith('release-diagnostic-test-'));
    await rm(directory,{recursive:true,force:true});
  }
});

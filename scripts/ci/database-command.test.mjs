import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile,access,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {databaseCommandFailure,runDatabaseCommand,postgresEnvironment} from './database-command.mjs';

test('native PostgreSQL clients use decoded environment credentials and retain remote TLS verification',()=>{
  const local=postgresEnvironment('postgresql://amc_ci:fixture%40value@127.0.0.1:55432/amc_test',{PGHOST:'wrong',PGOPTIONS:'unsafe',PGSERVICE:'',PGSERVICEFILE:'unrelated'});
  assert.equal(local.PGHOST,'127.0.0.1');assert.equal(local.PGPORT,'55432');
  assert.equal(local.PGPASSWORD,'fixture@value');assert.equal(local.PGDATABASE,'amc_test');
  assert.equal(local.PGSSLMODE,'disable');assert.equal(local.PGOPTIONS,'');
  assert.equal(Object.hasOwn(local,'PGSERVICE'),false);
  assert.equal(Object.hasOwn(local,'PGSERVICEFILE'),false);
  const remote=postgresEnvironment('postgresql://fixture:fixture@database.example.invalid/app',{});
  assert.equal(remote.PGSSLMODE,'verify-full');assert.equal(remote.PGSSLROOTCERT,'system');
  assert.equal(remote.PGPORT,'5432');
  assert.throws(()=>postgresEnvironment('prisma+postgres://fixture.invalid/?api_key=fixture',{}),/PostgreSQL TCP/);
});

test('release diagnostics distinguish actionable restore failures without raw output',()=>{
  const cases=[
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
  assert.throws(()=>runDatabaseCommand('rehearsal_restore','pg_restore',[],{},()=>({status:1,stdout:'sensitive SQL fixture',stderr:'ERROR: relation fixture already exists'})),error=>{
    assert.deepEqual(JSON.parse(error.message),{event:'database_release_command_failed',stage:'rehearsal_restore',category:'restore_target_conflict',exitCode:1});
    return true;
  });
  assert.doesNotThrow(()=>runDatabaseCommand('rehearsal_connect','psql',[],{},()=>({status:0,stdout:'sensitive fixture'})));
  assert.throws(()=>runDatabaseCommand('sensitive fixture','psql',[],{},()=>{throw new Error('Must not execute');}),/Unknown database release stage/);
});

test('unsafe rehearsal target is rejected before PostgreSQL commands and failed rehearsal removes plaintext',async()=>{
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

test('rehearsal invokes native clients, keeps failed restore blocking and preserves encrypted recovery',async()=>{
  const parent=resolve('.tmp');await mkdir(parent,{recursive:true});
  const directory=await mkdtemp(join(parent,'release-diagnostic-test-'));
  try{
    const artifacts=join(directory,'amc-database-release');await mkdir(artifacts);
    const encrypted=Buffer.from('synthetic encrypted fixture');
    await writeFile(join(artifacts,'database.dump.enc'),encrypted);
    await writeFile(join(artifacts,'backup.json'),JSON.stringify({sha256:createHash('sha256').update(encrypted).digest('hex')}));
    const preload=join(directory,'native-clients.mjs'),commands=join(directory,'commands.jsonl');
    await writeFile(preload,`
      import cp from 'node:child_process';
      import {syncBuiltinESMExports} from 'node:module';
      import {appendFileSync,writeFileSync} from 'node:fs';
      cp.spawnSync=(executable,args)=>{
        appendFileSync(process.env.NATIVE_COMMAND_LOG,JSON.stringify({executable,args})+'\\n');
        if(executable==='psql')return {status:0,stdout:process.env.NATIVE_MISSING==='1'?'plpgsql\\n':'btree_gist\\n'};
        if(executable==='openssl'){writeFileSync(args[args.indexOf('-out')+1],'synthetic plaintext fixture');return {status:0};}
        if(executable==='pg_restore'&&args.includes('--list'))return {status:0,stdout:'2; 3079 1 EXTENSION - btree_gist\\n'};
        if(executable==='pg_restore')return {status:1,stderr:'ERROR: relation private_fixture already exists'};
        throw new Error('Unexpected executable');
      };
      syncBuiltinESMExports();
    `);
    const result=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,'scripts/ci/database-release.mjs','rehearse'],{
      env:{...process.env,RUNNER_TEMP:directory,NATIVE_COMMAND_LOG:commands,REHEARSAL_DATABASE_URL:'postgresql://amc_release:fixture@127.0.0.1:55432/amc_release_test'},encoding:'utf8',timeout:30000,
    });
    assert.equal(result.status,1);
    assert.deepEqual(JSON.parse(result.stderr.trim()),{event:'database_release_command_failed',stage:'rehearsal_restore',category:'restore_target_conflict',exitCode:1});
    const calls=(await readFile(commands,'utf8')).trim().split('\n').map(line=>JSON.parse(line));
    assert.deepEqual(calls.map(call=>call.executable),['psql','openssl','pg_restore','psql','pg_restore']);
    assert.ok(calls.every(call=>!JSON.stringify(call.args).includes('postgresql://')));
    await assert.rejects(access(join(artifacts,'database.dump')),{code:'ENOENT'});
    assert.deepEqual(await readFile(join(artifacts,'database.dump.enc')),encrypted);
    await writeFile(commands,'');
    const unavailable=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,'scripts/ci/database-release.mjs','rehearse'],{
      env:{...process.env,RUNNER_TEMP:directory,NATIVE_COMMAND_LOG:commands,NATIVE_MISSING:'1',REHEARSAL_DATABASE_URL:'postgresql://amc_release:fixture@127.0.0.1:55432/amc_release_test'},encoding:'utf8',timeout:30000,
    });
    assert.equal(unavailable.status,1);
    const diagnostic=JSON.parse(unavailable.stderr.trim());
    assert.equal(diagnostic.event,'rehearsal_extensions_missing');
    assert.deepEqual(diagnostic.extensions,['btree_gist']);
    const blockedCalls=(await readFile(commands,'utf8')).trim().split('\n').map(line=>JSON.parse(line));
    assert.deepEqual(blockedCalls.map(call=>call.executable),['psql','openssl','pg_restore','psql']);
    assert.ok(blockedCalls.find(call=>call.executable==='pg_restore').args.includes('--list'));
    await assert.rejects(access(join(artifacts,'database.dump')),{code:'ENOENT'});
    assert.deepEqual(await readFile(join(artifacts,'database.dump.enc')),encrypted);
  }finally{
    assert.ok(directory.startsWith(parent+sep)&&directory.slice(parent.length+1).startsWith('release-diagnostic-test-'));
    await rm(directory,{recursive:true,force:true});
  }
});

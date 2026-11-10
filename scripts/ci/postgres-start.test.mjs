import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdtemp,mkdir,writeFile,readFile,access,rm} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
const options={skip:process.platform==='win32'&&!existsSync(bash)};
const script=fileURLToPath(new URL('../../.github/actions/setup-postgres/start.sh',import.meta.url));
const shellPath=path=>process.platform==='win32'?'/'+path[0].toLowerCase()+path.slice(2).replaceAll('\\','/'):path;

async function fixture(check){
  const parent=resolve('.tmp');await mkdir(parent,{recursive:true});
  const directory=await mkdtemp(join(parent,'postgres-start-test-'));
  try{
    const bin=join(directory,'bin'),runner=join(directory,'runner'),log=join(directory,'commands');
    await mkdir(bin);await mkdir(runner);
    const mock=`#!/usr/bin/env bash
set -euo pipefail
command_name="$(basename "$0")"
if [[ -v PGSERVICE || -v PGSERVICEFILE ]]; then
  echo 'Unexpected libpq service environment' >&2
  exit 42
fi
printf '%s ' "$command_name" "$@" >> "$COMMAND_LOG"
printf '\\n' >> "$COMMAND_LOG"
if [[ "\${MOCK_FAIL_COMMAND:-}" == "$command_name" ]]; then
  echo 'synthetic native client failure' >&2
  exit 3
fi
`;
    for(const command of ['initdb','pg_ctl','createdb'])await writeFile(join(bin,command),mock,{mode:0o755});
    const run=env=>spawnSync(bash,['--noprofile','--norc','-c','export PATH="$MOCK_BIN:$PATH"; exec bash "$START_SCRIPT"'],{
      env:{...process.env,MOCK_BIN:shellPath(bin),START_SCRIPT:shellPath(script),RUNNER_TEMP:shellPath(runner),COMMAND_LOG:shellPath(log),PGUSER:'amc_ci',PGDATABASE:'amc_test',PGPASSWORD:'fixture',...env},encoding:'utf8',timeout:15000,
    });
    await check({run,runner,log});
  }finally{
    assert.ok(directory.startsWith(parent+sep)&&directory.slice(parent.length+1).startsWith('postgres-start-test-'));
    await rm(directory,{recursive:true,force:true});
  }
}

for(const database of ['amc_test','amc_release_test'])test(`native startup accepts workflow database ${database}`,options,async()=>{
  await fixture(async({run,runner,log})=>{
    const result=run({PGDATABASE:database,PGSERVICE:'',PGSERVICEFILE:'unrelated'});
    assert.equal(result.status,0,result.stderr);
    const commands=await readFile(log,'utf8');
    assert.deepEqual(commands.trim().split('\n').map(line=>line.split(' ')[0]),['initdb','pg_ctl','createdb']);
    assert.match(commands,/--auth-host=scram-sha-256/);
    assert.match(commands,/-h 127\.0\.0\.1 -p 55432/);
    assert.ok(commands.includes(database));
    await assert.rejects(access(join(runner,'amc-ci-postgres','password')),{code:'ENOENT'});
  });
});

test('startup rejects non-test names before creating files or invoking clients',options,async()=>{
  for(const database of ['postgres','amc_prod','amc_test_prod','amc_test;echo','remote/amc_test'])await fixture(async({run,runner,log})=>{
    const result=run({PGDATABASE:database});
    assert.equal(result.status,1);assert.match(result.stderr,/Stage: validate_settings/);
    await assert.rejects(access(log),{code:'ENOENT'});
    await assert.rejects(access(join(runner,'amc-ci-postgres')),{code:'ENOENT'});
  });
});

for(const [command,stage] of [['initdb','initialize_database'],['pg_ctl','start_server'],['createdb','create_test_database']])test(`startup reports ${command} failure and removes temporary password`,options,async()=>{
  await fixture(async({run,runner})=>{
    const result=run({MOCK_FAIL_COMMAND:command});
    assert.equal(result.status,3);assert.match(result.stderr,new RegExp('Stage: '+stage));
    assert.match(result.stderr,/synthetic native client failure/);
    await assert.rejects(access(join(runner,'amc-ci-postgres','password')),{code:'ENOENT'});
  });
});

test('startup refuses an existing cluster directory without changing its password file',options,async()=>{
  await fixture(async({run,runner,log})=>{
    const cluster=join(runner,'amc-ci-postgres');await mkdir(cluster);
    const password=join(cluster,'password');await writeFile(password,'existing fixture');
    const result=run({});
    assert.notEqual(result.status,0);assert.match(result.stderr,/Stage: create_private_directory/);
    assert.equal(await readFile(password,'utf8'),'existing fixture');
    await assert.rejects(access(log),{code:'ENOENT'});
  });
});

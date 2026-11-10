import {spawnSync} from 'node:child_process';
import {ReleasePolicyError} from './migrations.mjs';

const stages=new Set(['backup_dump','backup_encrypt','rehearsal_connect','rehearsal_decrypt','rehearsal_restore','rehearsal_migrate']);

/** Classify captured failures; never return provider output, SQL, paths or credentials. */
export function databaseCommandFailure(stage,result){
  if(!stages.has(stage))throw new ReleasePolicyError('Unknown database release stage');
  const output=typeof result.stderr==='string'?result.stderr.toLowerCase():'';
  let category='unclassified';
  if(result.error?.code==='ENOENT')category='command_unavailable';
  else if(result.error?.code==='ETIMEDOUT')category='command_timeout';
  else if(result.error?.code==='ENOBUFS')category='output_limit';
  else if(/cannot connect to the docker daemon|failed to connect to the docker api|is the docker daemon running/.test(output))category='docker_unavailable';
  else if(/pull access denied|manifest unknown|error pulling image|failed to resolve reference/.test(output))category='container_image_unavailable';
  else if(/password authentication failed|no pg_hba.conf entry/.test(output))category='database_authentication';
  else if(/connection refused|could not connect to server|connection to server .* failed|could not translate host name|network is unreachable/.test(output))category='database_connection';
  else if(/extension .* is not available|could not open extension control file|could not access file .*no such file/.test(output))category='extension_unavailable';
  else if(/role .* does not exist/.test(output))category='missing_database_role';
  else if(/permission denied|must be owner|must be superuser/.test(output))category='database_permissions';
  else if(/schema .* already exists|relation .* already exists|multiple primary keys/.test(output))category='restore_target_conflict';
  else if(/server version mismatch/.test(output))category='server_version_mismatch';
  else if(/unrecognized configuration parameter/.test(output))category='server_setting_incompatible';
  else if(/unsupported version .*header|does not appear to be a valid archive|did not find magic string|unexpected end of file/.test(output))category='archive_incompatible';
  else if(/bad decrypt/.test(output))category='backup_decryption';
  else if(/could not execute query/.test(output))category='database_query_failed';
  return {event:'database_release_command_failed',stage,category,exitCode:Number.isInteger(result.status)&&result.status>=0&&result.status<=255?result.status:null};
}

export function runDatabaseCommand(stage,executable,args,options={},execute=spawnSync){
  if(!stages.has(stage))throw new ReleasePolicyError('Unknown database release stage');
  const result=execute(executable,args,{...options,encoding:'utf8',timeout:300000});
  if(result.error||result.status!==0)throw new ReleasePolicyError(JSON.stringify(databaseCommandFailure(stage,result)));
}

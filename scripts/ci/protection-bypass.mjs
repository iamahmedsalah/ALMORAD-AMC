import {randomBytes} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,appendFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';

// A short-lived project bypass lets CI probe the immutable candidate while
// retaining deployment protection. Never log API responses or credential values.
const mode=process.argv[2];
if(!['prepare','cleanup'].includes(mode)||!process.env.GITHUB_ACTIONS||!process.env.RUNNER_TEMP)throw new Error('Protection setup is only supported inside GitHub Actions');
const file=join(process.env.RUNNER_TEMP,'amc-release-protection.json');
if(mode==='cleanup'&&!existsSync(file))process.exit(0);
const project=process.env.VERCEL_PROJECT_ID,team=process.env.VERCEL_ORG_ID;
if(!project||!team||!process.env.VERCEL_TOKEN)throw new Error('Vercel release access is missing');
async function update(body){
 const response=await fetch(`https://api.vercel.com/v1/projects/${encodeURIComponent(project)}/protection-bypass?teamId=${encodeURIComponent(team)}`,{method:'PATCH',headers:{Authorization:`Bearer ${process.env.VERCEL_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 await response.body?.cancel();
 if(!response.ok)throw new Error(`Vercel release protection configuration failed (${response.status})`);
}
if(mode==='prepare'){
 if(process.env.VERCEL_AUTOMATION_BYPASS_SECRET){console.log('Using configured automation bypass.');}
 else{
  if(!process.env.GITHUB_ENV)throw new Error('GitHub environment output is unavailable');
  const secret=randomBytes(32).toString('hex');
  // Save before API mutation so the always() cleanup can revoke after a timeout.
  writeFileSync(file,JSON.stringify({project,team,secret}),{mode:0o600});
  console.log(`::add-mask::${secret}`);
  await update({generate:{secret,note:`GitHub CI ${process.env.GITHUB_RUN_ID||'release'}`}});
  appendFileSync(process.env.GITHUB_ENV,`VERCEL_AUTOMATION_BYPASS_SECRET=${secret}\n`);
  console.log('Short-lived candidate verification access prepared.');
 }
}else if(existsSync(file)){
 const saved=JSON.parse(readFileSync(file,'utf8'));
 if(saved.project!==project||saved.team!==team||!/^[a-f0-9]{64}$/.test(saved.secret))throw new Error('Unexpected release protection checkpoint');
 await update({revoke:{secret:saved.secret}});
 unlinkSync(file);
 console.log('Short-lived candidate verification access revoked.');
}

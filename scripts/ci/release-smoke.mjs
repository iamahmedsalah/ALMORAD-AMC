import {setTimeout} from 'node:timers/promises';
const origin=new URL(process.env.RELEASE_URL||'');
if(origin.protocol!=='https:'||!origin.hostname.endsWith('.vercel.app')||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('Release smoke requires a credential-free Vercel deployment origin');
const headers=process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{};
for(const path of ['/health','/health/ready','/api/booking/config','/en','/ar','/en/contact','/ar/contact','/en/booking','/ar/booking','/robots.txt','/sitemap.xml']){
  let passed=false;
  for(let attempt=0;attempt<4;attempt++){
    try{
      const response=await fetch(new URL(path,origin),{headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
      if(response.status===200){
        if(path==='/health/ready'){const json=await response.json();passed=json.status==='ok'&&json.database==='up';}
        else if(path==='/api/booking/config'){const json=await response.json();passed=typeof json.enabled==='boolean'&&Array.isArray(json.services);}
        else{await response.body?.cancel();passed=true;}
      }else await response.body?.cancel();
    }catch{/* Never print provider bodies, tokens or visitor data. */}
    if(passed)break;
    if(attempt<3)await setTimeout(2000);
  }
  console.log(JSON.stringify({path,passed}));
  if(!passed)throw new Error(`Release health gate failed: ${path}`);
}

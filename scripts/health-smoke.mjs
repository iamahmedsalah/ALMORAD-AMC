import {performance} from 'node:perf_hooks';
const targets=[['web',process.env.MONITOR_WEB_ORIGIN,'/en'],['api',process.env.MONITOR_API_ORIGIN,'/health/ready']];
if(targets.some(([,value])=>!value))throw new Error('Set MONITOR_WEB_ORIGIN and MONITOR_API_ORIGIN explicitly');
let failed=false;
for(const [service,origin,path] of targets){const url=new URL(origin);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Monitoring origins must contain no credentials/path/query');const start=performance.now();let status=0;try{const response=await fetch(`${url.origin}${path}`,{signal:AbortSignal.timeout(10000),redirect:'error'});status=response.status;await response.body?.cancel();}catch{/* Report availability without request details or credentials. */}const ok=status===200;failed ||= !ok;console.log(JSON.stringify({time:new Date().toISOString(),service,status,ok,durationMs:Math.round(performance.now()-start)}));}
if(failed)process.exitCode=1;

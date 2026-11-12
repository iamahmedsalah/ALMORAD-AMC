const origins=['https://almorad-amc.vercel.app','https://www.almorad-amc.com'];
for(const origin of origins)for(const path of ['/en/contact?source=redirect-check','/ar/team']){
 const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});
 await response.body?.cancel();
 if(response.status!==308||response.headers.get('location')!=='https://almorad-amc.com'+path)throw new Error('Production domain redirect verification failed');
 console.log(JSON.stringify({origin,path,passed:true}));
}

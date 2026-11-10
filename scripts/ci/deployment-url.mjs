import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
export function deploymentUrl(text){
const urls=[...text.matchAll(/https:\/\/[a-z0-9-]+\.vercel\.app\b(?![a-zA-Z0-9.-])/g)].map(x=>x[0]).filter(x=>x!=='https://almorad-amc.vercel.app');
const unique=[...new Set(urls)];
if(unique.length!==1)throw new Error('Cannot identify a single immutable Vercel deployment URL');
return unique[0];
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)console.log(`RELEASE_URL=${deploymentUrl(await readFile(process.argv[2],'utf8'))}`);

import type {NextRequest} from 'next/server';
import {forward} from '@/lib/server/api-proxy';
export const dynamic='force-dynamic';
export const runtime='nodejs';
async function proxy(request:NextRequest,{params}:{params:Promise<{path:string[]}>}){return forward(request,(await params).path.join('/'),'staff');}
export {proxy as GET,proxy as POST};

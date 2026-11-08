import type {NextRequest} from 'next/server';
import {forward} from '@/lib/server/api-proxy';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export function POST(request: NextRequest) { return forward(request, 'submit', 'contact'); }

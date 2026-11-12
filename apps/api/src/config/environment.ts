import {z} from 'zod';
const isPgTcpUrl = (value: string) => {
  try {const url = new URL(value); return ['postgresql:', 'postgres:'].includes(url.protocol) && Boolean(url.hostname) && url.pathname.length > 1;} catch {return false;}
};
const emailOrMailbox = z.string().min(3).refine(value => {
  const match = value.match(/<([^<>]+)>$/);
  const email = match ? match[1]!.trim() : value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}, 'Must be a valid email or Name <email@domain> format');
export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().refine(isPgTcpUrl, 'A PostgreSQL URL (postgres:// or postgresql://) with a database name is required'),
  API_HOST: z.enum(['127.0.0.1','0.0.0.0']).default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: emailOrMailbox.optional(),
  BOOKING_INBOX_EMAIL: z.email().optional(),
  CRON_SECRET: z.string().min(32).optional(),
  BOOKING_TOKEN_SECRET: z.string().min(32).optional()
});
export function parseEnvironment(input: Record<string, string | undefined>) {
  const normalized: Record<string, string | undefined> = {...input};
  // An explicit empty optional setting disables it and blocks cross-profile fallback.
  for(const key of ['RESEND_API_KEY','RESEND_FROM_EMAIL','BOOKING_INBOX_EMAIL','CRON_SECRET','BOOKING_TOKEN_SECRET'])if(normalized[key]==='')normalized[key]=undefined;
  if (normalized.DATABASE_URL && !isPgTcpUrl(normalized.DATABASE_URL)) {
    const tcpFallback = [input.POSTGRES_URL, input.DIRECT_URL].find(v => v && isPgTcpUrl(v));
    if (tcpFallback) normalized.DATABASE_URL = tcpFallback;
  }
  if (!normalized.WEB_ORIGIN) {
    const vercelHost = input.VERCEL_PROJECT_PRODUCTION_URL || input.VERCEL_URL;
    if (vercelHost) normalized.WEB_ORIGIN = `https://${vercelHost}`;
  }
  const parsed = environmentSchema.safeParse(normalized);
  if (!parsed.success) throw new Error(`Invalid API configuration: ${parsed.error.issues.map(i => i.path.join('.')).join(', ')}`);
  const origin = new URL(parsed.data.WEB_ORIGIN);
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash || !['http:', 'https:'].includes(origin.protocol)) throw new Error('WEB_ORIGIN must be an HTTP(S) origin');
  if (parsed.data.NODE_ENV === 'production' && origin.protocol !== 'https:') throw new Error('Production WEB_ORIGIN must use HTTPS');
  return parsed.data;
}

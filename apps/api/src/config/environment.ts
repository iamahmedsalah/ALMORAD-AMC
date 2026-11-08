import {z} from 'zod';
export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().refine(value => {
    try {const url = new URL(value); return ['postgresql:', 'postgres:'].includes(url.protocol) && Boolean(url.hostname) && url.pathname.length > 1;} catch {return false;}
  }, 'A PostgreSQL URL with a database name is required'),
  API_HOST: z.enum(['127.0.0.1','0.0.0.0']).default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  CRON_SECRET: z.string().min(32).optional(),
  BOOKING_TOKEN_SECRET: z.string().min(32).optional()
});
export function parseEnvironment(input: Record<string, string | undefined>) {
  const parsed = environmentSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid API configuration: ${parsed.error.issues.map(i => i.path.join('.')).join(', ')}`);
  const origin = new URL(parsed.data.WEB_ORIGIN);
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash || !['http:', 'https:'].includes(origin.protocol)) throw new Error('WEB_ORIGIN must be an HTTP(S) origin');
  if (parsed.data.NODE_ENV === 'production' && origin.protocol !== 'https:') throw new Error('Production WEB_ORIGIN must use HTTPS');
  return parsed.data;
}

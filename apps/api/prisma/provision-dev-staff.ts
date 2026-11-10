import {randomBytes} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '../src/generated/prisma/client.js';
import {hashPassword, verifyPassword} from '../src/modules/auth/security.js';

const database = new URL(process.env.DATABASE_URL ?? '');
if (process.env.NODE_ENV === 'production' || process.env.CI || process.env.VERCEL ||
    !['postgresql:', 'postgres:'].includes(database.protocol) ||
    !['127.0.0.1', 'localhost'].includes(database.hostname) || database.pathname !== '/amc_dev') {
  throw new Error('Dev staff provisioning requires local amc_dev PostgreSQL');
}
if (process.env.DIRECT_URL) {
  const direct = new URL(process.env.DIRECT_URL);
  if (direct.protocol !== database.protocol || direct.hostname !== database.hostname ||
      direct.port !== database.port || direct.pathname !== database.pathname) {
    throw new Error('Local DATABASE_URL and DIRECT_URL must target the same amc_dev database');
  }
}

const accounts = [
  {key: 'MANAGER', email: process.env.DEV_MANAGER_EMAIL ?? 'dev-manager@example.invalid', role: 'MANAGER' as const},
  {key: 'RECEPTIONIST', email: process.env.DEV_RECEPTIONIST_EMAIL ?? 'dev-receptionist@example.invalid', role: 'RECEPTIONIST' as const},
];
if (new Set(accounts.map(account => account.email)).size !== accounts.length ||
    accounts.some(account => !/^[a-z0-9._+-]+@example\.invalid$/.test(account.email))) {
  throw new Error('Use distinct example.invalid addresses for local staff accounts');
}

const credentialsPath = fileURLToPath(new URL('../../../.env.dev-staff', import.meta.url));
if (!existsSync(credentialsPath)) {
  const content = ['# LOCAL amc_dev staff only. Ignored by Git; never reuse in production.',
    ...accounts.flatMap(account => [
      `DEV_${account.key}_EMAIL=${account.email}`,
      `DEV_${account.key}_PASSWORD=${randomBytes(24).toString('base64url')}`,
    ]), ''].join('\n');
  writeFileSync(credentialsPath, content, {flag: 'wx', mode: 0o600});
}
const credentials = Object.fromEntries(readFileSync(credentialsPath, 'utf8').split(/\r?\n/)
  .filter(line => line && !line.startsWith('#')).map(line => {
    const equal = line.indexOf('=');
    if (equal < 1) throw new Error('Malformed local staff credentials file');
    return [line.slice(0, equal), line.slice(equal + 1)];
  }));
for (const account of accounts) {
  if (credentials[`DEV_${account.key}_EMAIL`] !== account.email ||
      !/^[A-Za-z0-9_-]{32}$/.test(credentials[`DEV_${account.key}_PASSWORD`] ?? '')) {
    throw new Error('Local staff credentials file is incomplete or does not match configured emails');
  }
}

const client = new PrismaClient({adapter: new PrismaPg({connectionString: database.href})});
try {
  await client.$transaction(async tx => {
    for (const account of accounts) {
      const existing = await tx.staffUser.findUnique({where: {email: account.email}});
      if (existing) {
        if (existing.role !== account.role || !existing.active ||
            !await verifyPassword(credentials[`DEV_${account.key}_PASSWORD`]!, existing.passwordHash)) {
          throw new Error('Existing local staff account differs; use reviewed staff provisioning for recovery');
        }
        continue;
      }
      const staff = await tx.staffUser.create({data: {
        email: account.email, role: account.role,
        passwordHash: await hashPassword(credentials[`DEV_${account.key}_PASSWORD`]!),
      }});
      await tx.staffAuditEvent.create({data: {subjectId: staff.id, action: 'STAFF_PROVISIONED'}});
    }
  });
  console.log('Local amc_dev manager and receptionist ready. Credentials: ignored .env.dev-staff');
} finally {
  await client.$disconnect();
}

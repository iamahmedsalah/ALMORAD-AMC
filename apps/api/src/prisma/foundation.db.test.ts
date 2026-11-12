import 'reflect-metadata';
import {afterAll, beforeAll, expect, it} from 'vitest';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '../generated/prisma/client.js';
import {randomUUID} from 'node:crypto';
const value = process.env.TEST_DATABASE_URL;
// Fail explicitly instead of silently skipping the database acceptance gate.
if (!value) throw new Error('TEST_DATABASE_URL is required for isolated PostgreSQL integration tests');
const url = new URL(value);
if (process.env.NODE_ENV === 'production' || !['localhost','127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test')) throw new Error('Database tests require a local *_test database');
const client = new PrismaClient({adapter:new PrismaPg({connectionString:value})});
const id = randomUUID();
beforeAll(async () => {await client.$connect();});
afterAll(async () => {await client.staffUser.deleteMany({where:{id}});await client.$disconnect();});
it('migration supports relational staff sessions and unique identities', async () => {
  expect(await client.$queryRaw`SELECT 1 AS ok`).toEqual([{ok:1}]);
  await client.staffUser.create({data:{id,email:`${id}@example.invalid`,role:'RECEPTIONIST'}});
  await expect(client.staffUser.create({data:{email:`${id}@example.invalid`,role:'ADMIN'}})).rejects.toThrow();
  const session = await client.staffSession.create({data:{userId:id,tokenHash:'f'.repeat(64),expiresAt:new Date(Date.now()+60000)}});
  expect(session.userId).toBe(id);
  await client.staffUser.delete({where:{id}});
  expect(await client.staffSession.findUnique({where:{id:session.id}})).toBeNull();
});

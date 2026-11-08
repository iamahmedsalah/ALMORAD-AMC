import 'reflect-metadata';
import {afterAll,beforeAll,expect,it} from 'vitest';
import {createHash,randomUUID} from 'node:crypto';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '../../generated/prisma/client.js';
import {PostgresThrottleStorage} from './throttle.storage.js';
import type {PrismaService} from '../../prisma/prisma.service.js';
const value=process.env.TEST_DATABASE_URL;if(!value)throw new Error('TEST_DATABASE_URL required');const url=new URL(value);if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw new Error('Isolated local *_test required');
const client=new PrismaClient({adapter:new PrismaPg({connectionString:value})});const key=createHash('sha256').update(randomUUID()).digest('hex');
beforeAll(async()=>{await client.$connect();});afterAll(async()=>{await client.requestThrottle.deleteMany({where:{key}});await client.$disconnect();});
it('shares a strict atomic limit across independent instances and concurrent requests',async()=>{
 const a=new PostgresThrottleStorage(client as unknown as PrismaService),b=new PostgresThrottleStorage(client as unknown as PrismaService);
 const records=await Promise.all(Array.from({length:20},(_,i)=>(i%2?a:b).increment(key,10000,8,10000)));
 expect(records.filter(r=>!r.isBlocked)).toHaveLength(8);expect(records.filter(r=>r.isBlocked)).toHaveLength(12);
 expect((await b.increment(key,10000,8,10000)).isBlocked).toBe(true);
 await client.requestThrottle.update({where:{key},data:{expiresAt:new Date(0),blockedUntil:new Date(0)}});
 const reset=await a.increment(key,10000,8,10000);expect(reset.totalHits).toBe(1);expect(reset.isBlocked).toBe(false);
});

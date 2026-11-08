import {afterEach,expect,it,vi} from 'vitest';
import type {Request} from 'express';
import {OperationsController} from './operations.controller.js';
import type {PrismaService} from './prisma/prisma.service.js';
afterEach(()=>vi.unstubAllEnvs());
it('requires a cron credential before deleting expired state',async()=>{
 const transaction=vi.fn().mockImplementation(async work=>work({staffSession:{deleteMany:vi.fn().mockResolvedValue({count:1})},requestThrottle:{deleteMany:vi.fn().mockResolvedValue({count:2})},staffAuditEvent:{create:vi.fn().mockResolvedValue({id:'audit'})}}));
 const controller=new OperationsController({$transaction:transaction} as unknown as PrismaService);
 vi.stubEnv('CRON_SECRET','test-only-cron-value-'.repeat(4));
 await expect(controller.maintenance({get:()=>undefined} as unknown as Request)).rejects.toThrow();expect(transaction).not.toHaveBeenCalled();
 const result=await controller.maintenance({get:()=>`Bearer ${process.env.CRON_SECRET}`} as unknown as Request);expect(result).toMatchObject({removedExpiredSessions:1,removedRateBuckets:2});
});

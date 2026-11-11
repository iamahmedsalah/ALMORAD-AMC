import {afterEach,expect,it,vi} from 'vitest';
import type {Request} from 'express';
import {OperationsController} from './operations.controller.js';
import type {PrismaService} from './prisma/prisma.service.js';
import type {NotificationsService} from './modules/notifications/notifications.service.js';
import type {ContactService} from './modules/contact/contact.service.js';
import type {BookingsService} from './modules/bookings/bookings.service.js';

afterEach(()=>vi.unstubAllEnvs());

it('requires a cron credential before deleting expired state',async()=>{
 const transaction=vi.fn().mockImplementation(async work=>work({staffSession:{deleteMany:vi.fn().mockResolvedValue({count:1})},requestThrottle:{deleteMany:vi.fn().mockResolvedValue({count:2})},staffAuditEvent:{create:vi.fn().mockResolvedValue({id:'audit'})}}));
 const controller=new OperationsController(
   {$transaction:transaction} as unknown as PrismaService,
   {} as unknown as NotificationsService,
   {} as unknown as ContactService,
   {} as unknown as BookingsService
 );
 vi.stubEnv('CRON_SECRET','test-only-cron-value-'.repeat(4));
 await expect(controller.maintenance({get:()=>undefined} as unknown as Request)).rejects.toThrow();expect(transaction).not.toHaveBeenCalled();
 const result=await controller.maintenance({get:()=>`Bearer ${process.env.CRON_SECRET}`} as unknown as Request);expect(result).toMatchObject({removedExpiredSessions:1,removedRateBuckets:2});
});

it('drains notifications, CRM events, and contacts with valid CRON_SECRET', async () => {
  const notificationsMock = {drain: vi.fn().mockResolvedValue({processed: 2, succeeded: 2, failed: 0})};
  const contactMock = {drain: vi.fn().mockResolvedValue({processed: 1})};
  const bookingsMock = {drainCrm: vi.fn().mockResolvedValue({processed: 1, succeeded: 1, failed: 0})};

  const controller = new OperationsController(
    {} as unknown as PrismaService,
    notificationsMock as unknown as NotificationsService,
    contactMock as unknown as ContactService,
    bookingsMock as unknown as BookingsService
  );

  vi.stubEnv('CRON_SECRET', 'test-only-cron-value-'.repeat(4));
  const res = await controller.drainNotifications({
    get: () => `Bearer ${process.env.CRON_SECRET}`
  } as unknown as Request);

  expect(res).toMatchObject({
    processed: 2,
    succeeded: 2,
    failed: 0,
    crm: {processed: 1, succeeded: 1, failed: 0},
    contacts: {processed: 1}
  });
  expect(notificationsMock.drain).toHaveBeenCalledTimes(1);
  expect(bookingsMock.drainCrm).toHaveBeenCalledTimes(1);
  expect(contactMock.drain).toHaveBeenCalledTimes(1);
});
it('continues CRM and contact retries when the email drain crashes',async()=>{
 const notifications={drain:vi.fn().mockRejectedValue(new Error('Synthetic provider failure'))};
 const contacts={drain:vi.fn().mockResolvedValue({processed:1})},bookings={drainCrm:vi.fn().mockResolvedValue({processed:1,succeeded:1,failed:0})};
 const controller=new OperationsController({} as PrismaService,notifications as unknown as NotificationsService,contacts as unknown as ContactService,bookings as unknown as BookingsService);
 vi.stubEnv('CRON_SECRET','test-only-cron-value-'.repeat(4));
 expect(await controller.drainNotifications({get:()=>`Bearer ${process.env.CRON_SECRET}`} as unknown as Request)).toMatchObject({emailError:'drain_failed',crm:{succeeded:1},contacts:{processed:1}});
});

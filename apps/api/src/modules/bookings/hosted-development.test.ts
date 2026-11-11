import {afterEach,expect,it,vi} from 'vitest';
import {BookingsService} from './bookings.service.js';
import type {PrismaService} from '../../prisma/prisma.service.js';

afterEach(()=>vi.unstubAllEnvs());
it('does not create default booking settings on a hosted database during development',async()=>{
  vi.stubEnv('NODE_ENV','development');vi.stubEnv('VITEST','');
  vi.stubEnv('DATABASE_URL','postgresql://fixture:fixture@database.example.invalid/studio');
  const upsert=vi.fn();const db={bookingSettings:{findUnique:vi.fn().mockResolvedValue(null),upsert},bookingService:{upsert}};
  const service=new BookingsService(db as unknown as PrismaService);
  expect(await service.getSettings()).toBeNull();expect(upsert).not.toHaveBeenCalled();
});

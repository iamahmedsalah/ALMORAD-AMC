import 'reflect-metadata';
import {describe, expect, it, vi} from 'vitest';
import {ServiceUnavailableException} from '@nestjs/common';
import {HealthController} from './health.controller.js';
import type {PrismaService} from '../../prisma/prisma.service.js';

describe('API health contract', () => {
  it('returns live status ok without database dependency', () => {
    const controller = new HealthController({} as PrismaService);
    expect(controller.live()).toEqual({status: 'ok'});
  });

  it('returns database up on readiness when schema probe succeeds', async () => {
    const query = vi.fn().mockResolvedValueOnce([{ok: 1}]);
    const controller = new HealthController({$queryRaw: query} as unknown as PrismaService);
    const result = await controller.ready();
    expect(result).toEqual({status: 'ok', database: 'up'});
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('throws ServiceUnavailableException when schema probe fails', async () => {
    const query = vi.fn().mockRejectedValueOnce(new Error('Connection terminated'));
    const controller = new HealthController({$queryRaw: query} as unknown as PrismaService);
    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
  });
});

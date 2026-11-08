import 'reflect-metadata';
import {describe, expect, it, vi} from 'vitest';
import {PublicBookingController, BookingOriginGuard} from './bookings.controller.js';
import {BookingsService} from './bookings.service.js';
import type {PrismaService} from '../../prisma/prisma.service.js';
import type {ExecutionContext} from '@nestjs/common';

describe('PublicBookingController unit tests', () => {
  it('delegates config retrieval to BookingsService', async () => {
    const mockService = {
      publicConfig: vi.fn().mockResolvedValue({
        slotDurationMinutes: 45,
        services: [{ slug: 'branding', title: 'Branding' }],
        formats: ['ONLINE', 'IN_PERSON']
      }),
    };

    const controller = new PublicBookingController(mockService as unknown as BookingsService);
    const config = await controller.config();
    expect(config.slotDurationMinutes).toBe(45);
    expect(mockService.publicConfig).toHaveBeenCalledTimes(1);
  });

  it('delegates slot lookup with date, service and format', async () => {
    const mockService = {
      slots: vi.fn().mockResolvedValue({
        date: '2026-11-10',
        available: ['10:00', '11:00']
      }),
    };

    const controller = new PublicBookingController(mockService as unknown as BookingsService);
    const result = await controller.slots('2026-11-10', 'branding', 'ONLINE');
    expect(result).toEqual({ date: '2026-11-10', available: ['10:00', '11:00'] });
    expect(mockService.slots).toHaveBeenCalledWith('2026-11-10', 'branding', 'ONLINE');
  });

  it('delegates reservation creation', async () => {
    const mockService = {
      create: vi.fn().mockResolvedValue({ id: 'bk_123', status: 'CONFIRMED' }),
    };

    const controller = new PublicBookingController(mockService as unknown as BookingsService);
    const booking = await controller.create({ clientName: 'Nour' });
    expect(booking).toEqual({ id: 'bk_123', status: 'CONFIRMED' });
    expect(mockService.create).toHaveBeenCalledWith({ clientName: 'Nour' });
  });

  it('validates booking origin guard against trusted origin', () => {
    const guard = new BookingOriginGuard();
    const contextMock = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          headers: {}
        })
      })
    };
    expect(guard.canActivate(contextMock as unknown as ExecutionContext)).toBe(true);
  });

  it('auto-provisions local development BookingSettings when missing in development mode', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VITEST', '');
    const seededRow = {
      id: 'agency',
      version: 1,
      enabled: true,
      isDemo: true,
      timezone: 'Africa/Cairo',
      durationMinutes: 30,
      stepMinutes: 15,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
      leadMinutes: 60,
      lookaheadDays: 30,
      changeCutoffMinutes: 60,
      onlineEnabled: true,
      inPersonEnabled: false,
      officeAddressEn: null,
      officeAddressAr: null,
      directionsUrl: null,
      weeklyHours: [{ day: 1, open: '09:00', close: '17:00' }],
      blackoutDates: [],
      serviceSlugs: ['branding'],
      updatedAt: new Date(),
    };
    const dbMock = {
      bookingSettings: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue(seededRow),
      },
      bookingService: {
        upsert: vi.fn().mockResolvedValue({ slug: 'branding' }),
      },
    };
    try {
      const service = new BookingsService(dbMock as unknown as PrismaService);
      const res = await service.publicConfig();
      expect(res.enabled).toBe(true);
      expect(res.schedule?.isDemo).toBe(true);
      expect(dbMock.bookingSettings.upsert).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

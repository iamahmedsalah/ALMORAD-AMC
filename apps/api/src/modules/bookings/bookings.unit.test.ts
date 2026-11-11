import 'reflect-metadata';
import {describe, expect, it, vi} from 'vitest';
import {PublicBookingController, BookingOriginGuard} from './bookings.controller.js';
import {BookingsService} from './bookings.service.js';
import type {PrismaService} from '../../prisma/prisma.service.js';
import type {ExecutionContext} from '@nestjs/common';
import type {HubSpotClient} from '../contact/hubspot.client.js';

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
    expect(mockService.slots).toHaveBeenCalledWith('2026-11-10', 'branding', 'ONLINE', undefined);
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
    vi.stubEnv('DATABASE_URL', 'postgresql://fixture:fixture@127.0.0.1/amc_dev');
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

  describe('drainCrm', () => {
    it('returns zero when hubspot is not configured or disabled', async () => {
      const dbMock = {$queryRaw: vi.fn()};
      const hubspotMock = {enabled: false};
      const service = new BookingsService(dbMock as unknown as PrismaService, hubspotMock as unknown as HubSpotClient);

      const res = await service.drainCrm();
      expect(res).toEqual({processed: 0, succeeded: 0, failed: 0});
      expect(dbMock.$queryRaw).not.toHaveBeenCalled();
    });

    it('processes BOOKING_CREATED:HUBSPOT by creating contact and meeting in HubSpot', async () => {
      const dbMock = {
        $queryRaw: vi.fn().mockResolvedValue([
          {id: 'outbox-1', bookingId: 'bk-1', kind: 'BOOKING_CREATED:HUBSPOT', attempts: 1}
        ]),
        booking: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'bk-1',
            reference: 'AMC-TEST01',
            clientName: 'Karim',
            email: 'karim@example.com',
            phone: '+2010000000',
            company: 'Brand Co',
            locale: 'ar',
            startsAt: new Date('2026-11-20T10:00:00Z'),
            endsAt: new Date('2026-11-20T10:30:00Z')
          }),
          update: vi.fn().mockResolvedValue({})
        },
        bookingOutbox: {
          update: vi.fn().mockResolvedValue({})
        }
      };

      const hubspotMock = {
        enabled: true,
        upsertBookingContact: vi.fn().mockResolvedValue('hs-contact-99'),
        createMeeting: vi.fn().mockResolvedValue('hs-meeting-88')
      };

      const service = new BookingsService(dbMock as unknown as PrismaService, hubspotMock as unknown as HubSpotClient);
      const res = await service.drainCrm();

      expect(res).toEqual({processed: 1, succeeded: 1, failed: 0});
      expect(hubspotMock.upsertBookingContact).toHaveBeenCalledWith({
        email: 'karim@example.com',
        name: 'Karim',
        phone: '+2010000000',
        company: 'Brand Co',
        locale: 'ar'
      });
      expect(hubspotMock.createMeeting).toHaveBeenCalledWith({
        contactId: 'hs-contact-99',
        title: 'ALMORAD AMC Consultation - AMC-TEST01',
        startsAt: expect.any(Date),
        endsAt: expect.any(Date),
        reference: 'AMC-TEST01'
      });
      expect(dbMock.booking.update).toHaveBeenCalledWith({
        where: {id: 'bk-1'},
        data: {hubspotContactId: 'hs-contact-99', hubspotMeetingId: 'hs-meeting-88'}
      });
      expect(dbMock.bookingOutbox.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {id: 'outbox-1'},
          data: expect.objectContaining({status: 'DELIVERED'})
        })
      );
    });

    it('updates meeting outcome to CANCELED for BOOKING_CANCELLED:HUBSPOT', async () => {
      const dbMock = {
        $queryRaw: vi.fn().mockResolvedValue([
          {id: 'outbox-2', bookingId: 'bk-2', kind: 'BOOKING_CANCELLED:HUBSPOT', attempts: 1}
        ]),
        booking: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'bk-2',
            reference: 'AMC-CANCEL01',
            hubspotMeetingId: 'hs-meeting-88'
          })
        },
        bookingOutbox: {
          update: vi.fn().mockResolvedValue({})
        }
      };

      const hubspotMock = {
        enabled: true,
        updateMeeting: vi.fn().mockResolvedValue(undefined)
      };

      const service = new BookingsService(dbMock as unknown as PrismaService, hubspotMock as unknown as HubSpotClient);
      const res = await service.drainCrm();

      expect(res).toEqual({processed: 1, succeeded: 1, failed: 0});
      expect(hubspotMock.updateMeeting).toHaveBeenCalledWith('hs-meeting-88', {outcome: 'CANCELED'});
      expect(dbMock.bookingOutbox.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {id: 'outbox-2'},
          data: expect.objectContaining({status: 'DELIVERED'})
        })
      );
    });
  });
});

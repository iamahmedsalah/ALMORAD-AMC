import {describe, it, expect, vi, beforeEach} from 'vitest';
import {NotificationsService} from './notifications.service.js';
import type {PrismaService} from '../../prisma/prisma.service.js';

function createPrismaMock() {
  return {
    $queryRaw: vi.fn(),
    $transaction: vi.fn(async (queries: Promise<unknown>[]) => Promise.all(queries)),
    booking: {findUnique: vi.fn()},
    bookingOutbox: {update: vi.fn()},
    bookingEvent: {create: vi.fn()}
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPrisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    mockPrisma = createPrismaMock();
    service = new NotificationsService(mockPrisma as unknown as PrismaService);
  });

  describe('deriveManagementToken', () => {
    it('produces a deterministic HMAC token matching booking identity', () => {
      const booking = {
        id: 'test-uuid-456',
        tokenNonce: 'fixture-nonce',
        tokenVersion: 0
      };

      const token1 = service.deriveManagementToken(booking);
      const token2 = service.deriveManagementToken(booking);

      expect(token1).toBeDefined();
      expect(token1).toBe(token2);
      expect(token1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates different tokens when tokenVersion increments', () => {
      const booking1 = {id: 'test-uuid-456', tokenNonce: 'nonce-123', tokenVersion: 0};
      const booking2 = {id: 'test-uuid-456', tokenNonce: 'nonce-123', tokenVersion: 1};

      expect(service.deriveManagementToken(booking1)).not.toBe(service.deriveManagementToken(booking2));
    });
  });

  it('does not report an email as sent without a provider', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const unconfigured = new NotificationsService(mockPrisma as unknown as PrismaService);
    await expect(unconfigured.sendEmail({to:'visitor@example.invalid',subject:'Receipt',text:'Receipt',html:'<p>Receipt</p>',idempotencyKey:'test-receipt'})).rejects.toThrow('not configured');
    vi.unstubAllEnvs();
  });

  describe('sanitizeError', () => {
    it('redacts explicit client email address', () => {
      const sanitized = service.sanitizeError('Failed delivery to client@example.com: mailbox full', 'client@example.com');
      expect(sanitized).not.toContain('client@example.com');
      expect(sanitized).toContain('[REDACTED_EMAIL]');
    });

    it('redacts generic leaked email addresses in stack traces', () => {
      const sanitized = service.sanitizeError('SMTP response from bounce-handler@resend.net: 550 User unknown');
      expect(sanitized).not.toContain('bounce-handler@resend.net');
      expect(sanitized).toContain('[REDACTED_EMAIL]');
    });
  });

  describe('drain', () => {
    it('returns zero counts when no pending outbox records exist', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.drain();

      expect(result).toEqual({processed: 0, succeeded: 0, failed: 0});
      expect(mockPrisma.booking.findUnique).not.toHaveBeenCalled();
    });

    it('processes pending record, generates email + calendar, and marks DELIVERED when Resend is configured', async () => {
      // Configure mock Resend provider
      const sendMock = vi.fn().mockResolvedValue({data: {id: 'resend-msg-1'}, error: null});
      (service as unknown as {resend: unknown}).resend = {emails: {send: sendMock}};

      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'outbox-uuid-1',
          bookingId: 'booking-uuid-1',
          eventId: 'event-uuid-1',
          kind: 'BOOKING_CREATED:EMAIL',
          attempts: 1
        }
      ]);

      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-uuid-1',
        reference: 'AMC-789XYZ',
        serviceSlug: 'branding',
        meetingType: 'ONLINE',
        clientName: 'Sarah Jenkins',
        email: 'sarah@example.com',
        locale: 'en',
        timezone: 'Africa/Cairo',
        startsAt: new Date('2026-11-12T10:00:00Z'),
        endsAt: new Date('2026-11-12T11:00:00Z'),
        tokenNonce: 'nonce-abc',
        tokenVersion: 0,
        calendar: {
          officeAddressEn: '100 Studio Way, Cairo',
          officeAddressAr: '100 شارع الاستوديو، القاهرة'
        }
      });

      const result = await service.drain();

      expect(result).toEqual({processed: 1, succeeded: 1, failed: 0});
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'sarah@example.com',
          from: expect.stringContaining('bookings@almorad-amc.com')
        }),
        expect.any(Object)
      );
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.bookingOutbox.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {id: 'outbox-uuid-1'},
          data: expect.objectContaining({status: 'DELIVERED'})
        })
      );
      expect(mockPrisma.bookingEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingId: 'booking-uuid-1',
            kind: 'EMAIL_DELIVERED'
          })
        })
      );
    });

    it('marks UNCONFIGURED when RESEND_API_KEY is not configured', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'outbox-uuid-unconfigured',
          bookingId: 'booking-uuid-1',
          eventId: 'event-uuid-1',
          kind: 'BOOKING_CREATED:EMAIL',
          attempts: 1
        }
      ]);

      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-uuid-1',
        reference: 'AMC-789XYZ',
        serviceSlug: 'branding',
        meetingType: 'ONLINE',
        clientName: 'Sarah Jenkins',
        email: 'sarah@example.com',
        locale: 'en',
        timezone: 'Africa/Cairo',
        startsAt: new Date('2026-11-12T10:00:00Z'),
        endsAt: new Date('2026-11-12T11:00:00Z'),
        tokenNonce: 'nonce-abc',
        tokenVersion: 0,
        calendar: {}
      });

      const result = await service.drain();

      expect(result).toEqual({processed: 1, succeeded: 0, failed: 1});
      expect(mockPrisma.bookingOutbox.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {id: 'outbox-uuid-unconfigured'},
          data: expect.objectContaining({status: 'UNCONFIGURED'})
        })
      );
    });

    it('marks FAILED immediately upon deterministic 422 error', async () => {
      const sendMock = vi.fn().mockResolvedValue({data: null, error: {name: '422', message: 'Unprocessable Entity - invalid domain'}});
      (service as unknown as {resend: unknown}).resend = {emails: {send: sendMock}};

      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'outbox-uuid-2',
          bookingId: 'booking-uuid-2',
          eventId: 'event-uuid-2',
          kind: 'BOOKING_CREATED:EMAIL',
          attempts: 1
        }
      ]);

      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-uuid-2',
        reference: 'AMC-789XYZ',
        serviceSlug: 'branding',
        meetingType: 'ONLINE',
        clientName: 'Sarah Jenkins',
        email: 'sarah@example.com',
        locale: 'en',
        timezone: 'Africa/Cairo',
        startsAt: new Date('2026-11-12T10:00:00Z'),
        endsAt: new Date('2026-11-12T11:00:00Z'),
        tokenNonce: 'nonce-abc',
        tokenVersion: 0,
        calendar: {}
      });

      const result = await service.drain();

      expect(result).toEqual({processed: 1, succeeded: 0, failed: 1});
      expect(mockPrisma.bookingOutbox.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {id: 'outbox-uuid-2'},
          data: expect.objectContaining({
            status: 'FAILED',
            lastError: expect.stringContaining('422')
          })
        })
      );
    });

    it('schedules exponential backoff retry upon transient 503 error', async () => {
      const sendMock = vi.fn().mockResolvedValue({data: null, error: {name: '503', message: 'Service Unavailable timeout'}});
      (service as unknown as {resend: unknown}).resend = {emails: {send: sendMock}};

      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'outbox-uuid-3',
          bookingId: 'booking-uuid-3',
          eventId: 'event-uuid-3',
          kind: 'BOOKING_CREATED:EMAIL',
          attempts: 2
        }
      ]);

      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-uuid-3',
        reference: 'AMC-789XYZ',
        serviceSlug: 'branding',
        meetingType: 'ONLINE',
        clientName: 'Sarah Jenkins',
        email: 'sarah@example.com',
        locale: 'en',
        timezone: 'Africa/Cairo',
        startsAt: new Date('2026-11-12T10:00:00Z'),
        endsAt: new Date('2026-11-12T11:00:00Z'),
        tokenNonce: 'nonce-abc',
        tokenVersion: 0,
        calendar: {}
      });

      const result = await service.drain();

      expect(result).toEqual({processed: 1, succeeded: 0, failed: 1});
      expect(mockPrisma.bookingOutbox.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {id: 'outbox-uuid-3'},
          data: expect.objectContaining({
            status: 'PENDING',
            nextRetryAt: expect.any(Date),
            lastError: expect.stringContaining('503')
          })
        })
      );
    });
  });
});

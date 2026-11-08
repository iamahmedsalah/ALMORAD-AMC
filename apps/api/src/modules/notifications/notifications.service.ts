import {Injectable, Logger, Inject} from '@nestjs/common';
import {createHmac} from 'node:crypto';
import {Resend} from 'resend';
import {PrismaService} from '../../prisma/prisma.service.js';
import {generateIcs} from '@amc/shared';
import {renderBookingConfirmationEmail} from './templates/booking-confirmation.template.js';

export interface DrainResult {
  processed: number;
  succeeded: number;
  failed: number;
}

interface ClaimedOutboxRow {
  id: string;
  bookingId: string;
  eventId: string;
  attempts: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly webOrigin: string;
  private readonly tokenSecret: string;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && apiKey !== 'mock') {
      this.resend = new Resend(apiKey);
    }
    const vercelOrigin = (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL)
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL}`
      : undefined;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'bookings@almorad-amc.com';
    this.webOrigin = process.env.WEB_ORIGIN || vercelOrigin || 'http://localhost:3000';
    this.tokenSecret = process.env.BOOKING_TOKEN_SECRET || 'development-booking-token-secret-must-be-long';
  }

  /**
   * Deterministically reconstructs the client management token without persisting raw secrets.
   */
  deriveManagementToken(booking: {id: string; tokenNonce: string; tokenVersion: number}): string {
    return createHmac('sha256', this.tokenSecret)
      .update(JSON.stringify([booking.id, booking.tokenNonce, booking.tokenVersion]))
      .digest('hex');
  }

  /**
   * Scrubs client email and sensitive PII from provider error messages before database persistence.
   */
  sanitizeError(message: string, clientEmail?: string): string {
    let sanitized = message;
    if (clientEmail) {
      sanitized = sanitized.replaceAll(clientEmail, '[REDACTED_EMAIL]');
    }
    // Generic email regex scrubber for any other leaked emails in provider stack traces
    sanitized = sanitized.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]');
    return sanitized.slice(0, 1000);
  }

  /**
   * Sends one transactional email through Resend (or logs it when no API key is set).
   * Returns the provider message id. The idempotency key makes retries safe.
   */
  async sendEmail(message: {to: string; subject: string; text: string; html: string; idempotencyKey: string; replyTo?: string; from?: string}): Promise<string> {
    if (!this.resend) {
      this.logger.log(`[MOCK_DISPATCH] Email "${message.subject.slice(0, 60)}" not sent: RESEND_API_KEY is not configured`);
      return 'mock-resend-id';
    }
    const response = await this.resend.emails.send(
      {from: message.from || this.fromEmail, to: message.to, subject: message.subject, text: message.text, html: message.html, replyTo: message.replyTo},
      {headers: {'Idempotency-Key': message.idempotencyKey}}
    );
    if (response.error) throw new Error(`Resend error: ${response.error.name} - ${response.error.message}`);
    return response.data?.id || '';
  }

  /**
   * Claims and processes a batch of pending outbox entries atomically using PostgreSQL SKIP LOCKED.
   */
  async drain(batchSize = 10): Promise<DrainResult> {
    const claimedRows = await this.prisma.$queryRaw<ClaimedOutboxRow[]>`
      WITH claimable AS (
        SELECT "id" FROM "BookingOutbox"
        WHERE (
          "status" = 'PENDING'
          OR ("status" = 'PROCESSING' AND "updatedAt" < NOW() - INTERVAL '5 minutes')
        )
        AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= NOW())
        AND "kind" = 'BOOKING_CREATED'
        ORDER BY "createdAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "BookingOutbox"
      SET "status" = 'PROCESSING', "attempts" = "attempts" + 1, "updatedAt" = NOW()
      WHERE "id" IN (SELECT "id" FROM claimable)
      RETURNING "id", "bookingId", "eventId", "attempts";
    `;

    if (!claimedRows || claimedRows.length === 0) {
      return {processed: 0, succeeded: 0, failed: 0};
    }

    let succeeded = 0;
    let failed = 0;

    for (const item of claimedRows) {
      try {
        const booking = await this.prisma.booking.findUnique({
          where: {id: item.bookingId},
          include: {calendar: true}
        });

        if (!booking) {
          // Booking was purged or missing; mark outbox as permanently failed
          await this.prisma.bookingOutbox.update({
            where: {id: item.id},
            data: {status: 'FAILED', lastError: 'Referenced booking not found'}
          });
          failed++;
          continue;
        }

        // Generate deterministic management link
        const token = this.deriveManagementToken(booking);
        const managementUrl = `${this.webOrigin}/${booking.locale}/booking/manage#id=${booking.id}&token=${token}`;

        // Generate .ics attachment
        const icsContent = generateIcs({
          id: booking.id,
          reference: booking.reference,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          summary: `ALMORAD AMC - ${booking.reference}`,
          description: `Booking reference: ${booking.reference}\nManage: ${managementUrl}`,
          location: booking.meetingType === 'IN_PERSON'
            ? (booking.calendar.officeAddressEn || 'ALMORAD AMC Agency')
            : 'Online Meeting'
        });

        // Render localized email body
        const emailContent = renderBookingConfirmationEmail({
          reference: booking.reference,
          clientName: booking.clientName,
          serviceTitle: booking.serviceSlug,
          locale: booking.locale,
          meetingType: booking.meetingType,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          timezone: booking.timezone,
          managementUrl,
          officeAddress: booking.locale === 'ar' ? booking.calendar.officeAddressAr : booking.calendar.officeAddressEn,
          directionsUrl: booking.calendar.directionsUrl || null
        });

        // Transmit email via Resend (or mock simulation)
        let resendId = 'mock-resend-id';
        if (this.resend) {
          const resendResponse = await this.resend.emails.send(
            {
              from: this.fromEmail,
              to: booking.email,
              subject: emailContent.subject,
              text: emailContent.text,
              html: emailContent.html,
              attachments: [
                {
                  filename: `${booking.reference}.ics`,
                  content: Buffer.from(icsContent, 'utf-8')
                }
              ]
            },
            {
              headers: {
                'Idempotency-Key': item.eventId
              }
            }
          );

          if (resendResponse.error) {
            throw new Error(`Resend error: ${resendResponse.error.name} - ${resendResponse.error.message}`);
          }
          resendId = resendResponse.data?.id || resendId;
        } else {
          this.logger.log(`[MOCK_DISPATCH] Confirmation email sent to ${booking.email} (ref: ${booking.reference})`);
        }

        // Commit success atomically
        await this.prisma.$transaction([
          this.prisma.bookingOutbox.update({
            where: {id: item.id},
            data: {
              status: 'DELIVERED',
              deliveredAt: new Date(),
              lastError: null
            }
          }),
          this.prisma.bookingEvent.create({
            data: {
              bookingId: booking.id,
              kind: 'EMAIL_DELIVERED',
              details: {
                outboxId: item.id,
                resendId,
                recipient: '[MASKED]'
              }
            }
          })
        ]);

        succeeded++;
      } catch (error: unknown) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isClientError = /400|401|403|422|Unprocessable|validation/i.test(errorMessage);
        const maxAttemptsReached = item.attempts >= 5;

        const sanitized = this.sanitizeError(errorMessage);

        if (isClientError || maxAttemptsReached) {
          this.logger.error(`[NOTIFICATION_TERMINAL_FAILURE] Outbox ${item.id} permanently failed: ${sanitized}`);
          await this.prisma.bookingOutbox.update({
            where: {id: item.id},
            data: {
              status: 'FAILED',
              lastError: sanitized
            }
          });
        } else {
          // Bounded exponential backoff: ~5s, 10s, 20s, 40s, capped at 15m
          const delaySeconds = Math.min(900, Math.round(5 * Math.pow(2, item.attempts - 1)));
          const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
          this.logger.warn(`[NOTIFICATION_TRANSIENT_RETRY] Outbox ${item.id} attempt ${item.attempts} failed, retrying in ${delaySeconds}s: ${sanitized}`);

          await this.prisma.bookingOutbox.update({
            where: {id: item.id},
            data: {
              status: 'PENDING',
              nextRetryAt,
              lastError: sanitized
            }
          });
        }
      }
    }

    return {
      processed: claimedRows.length,
      succeeded,
      failed
    };
  }
}

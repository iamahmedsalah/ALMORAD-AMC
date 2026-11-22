import {emailSender} from './sender.js';
import {staffPasswordResetEmail} from './templates/staff-password-reset.template.js';
import {emailArtwork} from './email-artwork.js';
import {renderBookingUpdateEmail} from './templates/booking-update.template.js';
import {Injectable, Logger, Inject} from '@nestjs/common';
import {createHmac, randomBytes} from 'node:crypto';
import {Resend} from 'resend';
import {PrismaService} from '../../prisma/prisma.service.js';
import {generateIcs,services,officeAddress} from '@amc/shared';
import {renderBookingConfirmationEmail} from './templates/booking-confirmation.template.js';
import {renderBookingRescheduledEmail} from './templates/booking-rescheduled.template.js';
import {renderBookingOwnerEmail} from './templates/booking-owner.template.js';
import {renderBookingCancelledEmail} from './templates/booking-cancelled.template.js';

export interface DrainResult {
  processed: number;
  succeeded: number;
  failed: number;
}

interface ClaimedOutboxRow {
  id: string;
  bookingId: string;
  eventId: string;
  kind: string;
  attempts: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly bookingFromEmail: string;
  private readonly replyTo: string;
  private readonly webOrigin: string;
  private readonly tokenSecret: string;

  get configured(): boolean { return this.resend !== null; }

  async sendStaffPasswordResetOtp(email:string,code:string,locale:string,tokenId:string) {
    if(!this.configured)return {status:'UNCONFIGURED' as const};
    const message=staffPasswordResetEmail(code,locale);
    await this.sendEmail({to:email,...message,idempotencyKey:`staff-reset:${tokenId}`});
    return {status:'DELIVERED' as const};
  }

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && apiKey !== 'mock') {
      this.resend = new Resend(apiKey);
    }
    const vercelOrigin = (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL)
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL}`
      : undefined;
    this.fromEmail = emailSender(process.env.RESEND_FROM_EMAIL,'contact');
    this.bookingFromEmail = emailSender(process.env.RESEND_BOOKING_FROM_EMAIL,'booking');
    this.replyTo = process.env.REPLY_TO_EMAIL || 'hello@almorad-amc.com';
    this.webOrigin = (process.env.VERCEL?vercelOrigin:undefined) || process.env.WEB_ORIGIN || vercelOrigin || 'http://localhost:3000';
    this.tokenSecret = process.env.BOOKING_TOKEN_SECRET || randomBytes(32).toString('hex');
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
   * Sends one transactional email through Resend. Missing configuration fails explicitly.
   * Returns the provider message id. The idempotency key makes retries safe.
   */
  async sendEmail(message: {to: string; subject: string; text: string; html: string; idempotencyKey: string; replyTo?: string; from?: string}): Promise<string> {
    if (!this.resend) {
      this.logger.warn('Email not sent: RESEND_API_KEY is not configured');
      throw new Error('Email delivery is not configured');
    }
    const response = await this.resend.emails.send(
      {from: message.from || this.fromEmail, to: message.to, subject: message.subject, text: message.text+'\n\n'+officeAddress.en, html: message.html, replyTo: message.replyTo || this.replyTo,attachments:message.html.includes('cid:almorad-logo')?emailArtwork():undefined},
      {headers: {'Idempotency-Key': message.idempotencyKey}}
    );
    if (response.error) throw new Error(`Resend error: ${response.error.name} - ${response.error.message}`);
    if(!response.data?.id)throw new Error('Email provider did not acknowledge the message');
    return response.data.id;
  }

  /**
   * Claims and processes a batch of pending email outbox entries atomically using PostgreSQL SKIP LOCKED.
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
        AND ("kind" = 'BOOKING_CREATED' OR "kind" LIKE '%:EMAIL' OR "kind" IN ('BOOKING_RESCHEDULED', 'BOOKING_CANCELLED'))
        ORDER BY "createdAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "BookingOutbox"
      SET "status" = 'PROCESSING', "attempts" = "attempts" + 1, "updatedAt" = NOW()
      WHERE "id" IN (SELECT "id" FROM claimable)
      RETURNING "id", "bookingId", "eventId", "kind", "attempts";
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
          include: {calendar: true,assignedTo:{select:{firstName:true,lastName:true,email:true,active:true}},assignees:{select:{staff:{select:{firstName:true,lastName:true,email:true,active:true}}}},events:{where:{id:item.eventId},take:1}}
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

        // Do not send an obsolete receipt after an admin has archived the meeting.
        if(booking.deletedAt&&item.kind.split(':')[0]!=='BOOKING_CANCELLED'){
          await this.prisma.bookingOutbox.update({where:{id:item.id},data:{status:'SKIPPED',lastError:null,nextRetryAt:null}});
          succeeded++;continue;
        }

        // If Resend is not configured, do NOT falsely commit 'DELIVERED'
        if (!this.resend) {
          this.logger.warn(`Email not sent for ${booking.reference}: RESEND_API_KEY is not configured`);
          await this.prisma.bookingOutbox.update({
            where: {id: item.id},
            data: {status: 'UNCONFIGURED', lastError: 'RESEND_API_KEY is not configured'}
          });
          failed++;
          continue;
        }

        const formatStaffName=(s:{firstName:string;lastName:string;email:string})=>[s.firstName,s.lastName].filter(Boolean).join(' ')||(s.email==='mo.khaledmorad@almorad-amc.com'?'Eng. Mohamed Khaled Morad':booking.locale==='ar'?'مدير الاجتماع':'Meeting manager');
        const assignedStaff=(booking.assignees?.length?booking.assignees.map(a=>a.staff):booking.assignedTo?[booking.assignedTo]:[]).filter(staff=>staff.active!==false);
        const managerName=assignedStaff.map(formatStaffName).join(', ')||undefined;
        const ownerAlert=item.kind.endsWith(':OWNER:EMAIL');
        const ownerInbox=process.env.BOOKING_INBOX_EMAIL;
        const staffRecipients=Array.from(new Set([ownerInbox,...assignedStaff.map(staff=>staff.email)].filter((v):v is string=>Boolean(v))));
        if(ownerAlert&&!staffRecipients.length){
          await this.prisma.bookingOutbox.update({where:{id:item.id},data:{status:'UNCONFIGURED',lastError:'BOOKING_INBOX_EMAIL is not configured'}});
          failed++;continue;
        }
        // Generate deterministic management link
        const token = this.deriveManagementToken(booking);
        const managementUrl = `${this.webOrigin}/${booking.locale}/booking/manage#id=${booking.id}&token=${token}`;

        const serviceTitle=services.find(service=>service.slug===booking.serviceSlug)?.[booking.locale==='ar'?'ar':'en']||booking.serviceSlug;
        const eventKind=item.kind.split(':')[0] || item.kind;
        const eventDetails=booking.events?.[0]?.details;
        const meetAction=eventDetails&&typeof eventDetails==='object'&&!Array.isArray(eventDetails)&&typeof eventDetails.action==='string'&&['CREATE','REMOVE','REGENERATE'].includes(eventDetails.action)?eventDetails.action:undefined;
        if(meetAction&&eventDetails&&typeof eventDetails==='object'&&!Array.isArray(eventDetails)&&Object.prototype.hasOwnProperty.call(eventDetails,'meetingUrl')&&eventDetails.meetingUrl!==booking.meetingUrl){
          await this.prisma.bookingOutbox.update({where:{id:item.id},data:{status:'SKIPPED',lastError:null,nextRetryAt:null}});succeeded++;continue;
        }
        const proposedStartAt=eventDetails&&typeof eventDetails==='object'&&!Array.isArray(eventDetails)&&typeof eventDetails.proposedStartAt==='string'?eventDetails.proposedStartAt:null;
        const isCancelled = eventKind==='BOOKING_CANCELLED';
        const isRescheduled = eventKind==='BOOKING_RESCHEDULED';

        let emailContent: {subject: string; text: string; html: string};
        let attachments: {filename: string; content: Buffer;contentId?:string;contentType?:string}[] | undefined;

        if(ownerAlert){
          emailContent=renderBookingOwnerEmail({meetAction,eventKind,reference:booking.reference,clientName:booking.clientName,clientTitle:booking.clientTitle,email:booking.email,phone:booking.phone,notes:booking.notes,company:booking.company,officeAddress:booking.calendar.officeAddressEn,directionsUrl:booking.calendar.directionsUrl||null,serviceTitle,meetingType:booking.meetingType,startsAt:booking.startsAt,endsAt:booking.endsAt,timezone:booking.timezone,meetingUrl:booking.meetingUrl,managerName,staffUrl:`${this.webOrigin}/en/staff/calendar`});
        } else if (!['BOOKING_CREATED','BOOKING_RESCHEDULED','BOOKING_CANCELLED','BOOKING_ACCESS_RECOVERY'].includes(eventKind)) {
          emailContent=renderBookingUpdateEmail({meetAction,managerName,kind:eventKind,proposedStartAt,reference:booking.reference,clientName:booking.clientName,clientTitle:booking.clientTitle,serviceTitle,locale:booking.locale,meetingType:booking.meetingType,startsAt:booking.startsAt,endsAt:booking.endsAt,timezone:booking.timezone,managementUrl,meetingUrl:booking.meetingUrl,officeAddress:booking.locale==='ar'?booking.calendar.officeAddressAr:booking.calendar.officeAddressEn});
        } else if (isCancelled) {
          emailContent = renderBookingCancelledEmail({
            reference: booking.reference,
            clientName: booking.clientName,
            serviceTitle,
            locale: booking.locale,
            cancelledAt: new Date(),
            timezone: booking.timezone
          });
        } else {
          // Generate .ics attachment for confirmations and reschedules
          const icsContent = generateIcs({
            id: booking.id,
            reference: booking.reference,
            sequence: booking.version,
            startsAt: booking.startsAt,
            endsAt: booking.endsAt,
            summary: `ALMORAD AMC - ${booking.reference}`,
            description: `Booking reference: ${booking.reference}\nManage: ${managementUrl}`,
            location: booking.meetingType === 'IN_PERSON'
              ? (booking.calendar.officeAddressEn || 'ALMORAD AMC Agency')
              : (booking.meetingUrl || 'Online Meeting - link pending')
          });

          attachments = [
            {
              filename: `${booking.reference}.ics`,
              content: Buffer.from(icsContent, 'utf-8')
            }
          ];

          if (isRescheduled) {
            emailContent = renderBookingRescheduledEmail({
              reference: booking.reference,
              clientName: booking.clientName,
              serviceTitle,
              locale: booking.locale,
              meetingType: booking.meetingType,
              startsAt: booking.startsAt,
              endsAt: booking.endsAt,
              timezone: booking.timezone,
              managementUrl,
              officeAddress: booking.locale === 'ar' ? booking.calendar.officeAddressAr : booking.calendar.officeAddressEn,
              meetingUrl:booking.meetingUrl,
              directionsUrl: booking.calendar.directionsUrl || null
            });
          } else {
            emailContent = renderBookingConfirmationEmail({managerName,
              status:booking.status,email:booking.email,phone:booking.phone,company:booking.company,clientTitle:booking.clientTitle,
              reference: booking.reference,
              clientName: booking.clientName,
              serviceTitle,
              locale: booking.locale,
              meetingType: booking.meetingType,
              startsAt: booking.startsAt,
              endsAt: booking.endsAt,
              timezone: booking.timezone,
              managementUrl,
              officeAddress: booking.locale === 'ar' ? booking.calendar.officeAddressAr : booking.calendar.officeAddressEn,
              meetingUrl:booking.meetingUrl,
              directionsUrl: booking.calendar.directionsUrl || null
            });
          }
        }

        // A newly supplied link or staff confirmation also carries an updated calendar file.
        if(!ownerAlert&&['BOOKING_EDIT','BOOKING_CONFIRM','BOOKING_CANCELLED','BOOKING_UPDATED'].includes(eventKind)){
          attachments=[{filename:booking.reference+'.ics',content:Buffer.from(generateIcs({id:booking.id,reference:booking.reference,sequence:booking.version,status:isCancelled?'CANCELLED':'CONFIRMED',startsAt:booking.startsAt,endsAt:booking.endsAt,location:booking.meetingType==='ONLINE'?(booking.meetingUrl||'Online Meeting - link pending'):(booking.locale==='ar'?booking.calendar.officeAddressAr:booking.calendar.officeAddressEn)||'',description:'Manage: '+managementUrl}),'utf8')}];
        }
        // Transmit email via Resend
        const resendResponse = await this.resend.emails.send(
          {
            from: this.bookingFromEmail,
            to: ownerAlert ? staffRecipients : booking.email,
            subject: emailContent.subject,
            text: emailContent.text+'\n\n'+officeAddress[booking.locale==='ar'?'ar':'en'],
            html: emailContent.html,
            replyTo: ownerAlert ? booking.email : (ownerInbox || this.replyTo),
            attachments:[...(attachments||[]),...emailArtwork()]
          },
          {
            headers: {
              'Idempotency-Key': `${item.id}-resend`
            }
          }
        );

        if (resendResponse.error) {
          throw new Error(`Resend error: ${resendResponse.error.name} - ${resendResponse.error.message}`);
        }
        const resendId = resendResponse.data?.id;
        if(!resendId)throw new Error('Email provider did not acknowledge the message');

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
              kind: ownerAlert ? 'OWNER_EMAIL_DELIVERED' : isCancelled ? 'EMAIL_CANCELLED_DELIVERED' : isRescheduled ? 'EMAIL_RESCHEDULED_DELIVERED' : 'EMAIL_DELIVERED',
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

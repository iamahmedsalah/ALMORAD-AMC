import {createHash} from 'node:crypto';
import {BadRequestException, ConflictException, Inject, Injectable, Logger, Optional} from '@nestjs/common';
import {waitUntil} from '@vercel/functions';
import {contactSubmissionSchema} from '@amc/shared';
import {PrismaService} from '../../prisma/prisma.service.js';
import {NotificationsService} from '../notifications/notifications.service.js';
import {renderContactOwnerEmail, renderContactVisitorEmail} from './contact-emails.js';
import {HubSpotClient, HubSpotRateLimitError} from './hubspot.client.js';

const MAX_ATTEMPTS = 5;
const open = ['PENDING', 'FAILED', 'UNCONFIGURED'];

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(NotificationsService) private readonly notifications?: NotificationsService,
    @Optional() @Inject(HubSpotClient) private readonly hubspot?: HubSpotClient
  ) {}

  /**
   * Stores the inquiry first, then delivers in the background. The visitor is told
   * "accepted" only after the row is saved, so a Resend or HubSpot outage never loses a lead.
   */
  async submit(input: unknown) {
    const parsed = contactSubmissionSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid contact submission');
    const {idempotencyKey, website, name, email, phone, message, locale} = parsed.data;
    if (website) return {accepted: true};
    const fields = {name, email, message, locale, ...(phone ? {phone} : {})};
    const requestHash = createHash('sha256').update(JSON.stringify(fields)).digest('hex');
    const existing = await this.prisma.contactInquiry.findUnique({where: {idempotencyKey}, select: {requestHash: true}});
    if (existing) {
      if (existing.requestHash !== requestHash) throw new ConflictException('Submission key already used');
      return {accepted: true};
    }
    let id: string | undefined;
    try {
      id = (await this.prisma.contactInquiry.create({data: {...fields, idempotencyKey, requestHash}}))?.id;
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'P2002') throw error;
      const duplicate = await this.prisma.contactInquiry.findUnique({where: {idempotencyKey}, select: {requestHash: true}});
      if (duplicate?.requestHash !== requestHash) throw new ConflictException('Submission key already used');
      return {accepted: true};
    }
    if (id && this.notifications) {
      const job = this.deliver(id).catch(error => this.logger.error(`Contact delivery crashed for ${id}: ${this.safe(error)}`));
      // On Vercel the function would freeze after the response; waitUntil keeps it alive.
      if (process.env.VERCEL) waitUntil(job);
      else void job;
    }
    return {accepted: true};
  }

  /** Runs every step that has not succeeded yet. Safe to call repeatedly. */
  async deliver(id: string, claimed = false): Promise<void> {
    const notifications = this.notifications;
    if (!notifications) return;
    const row = await this.prisma.contactInquiry.findUnique({where: {id}});
    if (!row||row.deletedAt||row.source==='STAFF') return;
    const errors: string[] = [];
    const patch: Record<string, string | Date | null> = {};
    const mail = {locale: row.locale, name: row.name, email: row.email, phone: row.phone, message: row.message};

    if (open.includes(row.ownerEmailStatus)) {
      const inbox = process.env.CONTACT_INBOX_EMAIL;
      if (!inbox) {
        patch.ownerEmailStatus = 'SKIPPED';
        this.logger.warn('CONTACT_INBOX_EMAIL is not set: studio alert skipped');
      } else {
        try {
          const email = renderContactOwnerEmail({...mail, id: row.id});
          await notifications.sendEmail({to: inbox, subject: email.subject, text: email.text, html: email.html, replyTo: row.email, idempotencyKey: `contact-${row.id}-owner`});
          patch.ownerEmailStatus = 'SENT';
        } catch (error) {
          const unconfigured=error instanceof Error&&error.message==='Email delivery is not configured';
          patch.ownerEmailStatus = unconfigured?'UNCONFIGURED':'FAILED';
          if(!unconfigured)errors.push(`owner: ${this.safe(error, row.email)}`);
        }
      }
    }

    if (open.includes(row.visitorEmailStatus)) {
      try {
        const email = renderContactVisitorEmail(mail);
        await notifications.sendEmail({to: row.email, subject: email.subject, text: email.text, html: email.html, idempotencyKey: `contact-${row.id}-visitor`});
        patch.visitorEmailStatus = 'SENT';
      } catch (error) {
        const unconfigured=error instanceof Error&&error.message==='Email delivery is not configured';
        patch.visitorEmailStatus = unconfigured?'UNCONFIGURED':'FAILED';
        if(!unconfigured)errors.push(`visitor: ${this.safe(error, row.email)}`);
      }
    }

    if (open.includes(row.hubspotStatus)) {
      if (!this.hubspot?.enabled) patch.hubspotStatus = 'SKIPPED';
      else {
        try {
          const contactId=await this.hubspot.upsertContact(mail);
          if(!contactId)throw new Error('HubSpot returned no contact ID');
          patch.hubspotContactId = contactId;
          patch.hubspotStatus = 'SENT';
        } catch (error) {
          patch.hubspotStatus = 'FAILED';
          if (error instanceof HubSpotRateLimitError) {
            patch.nextRetryAt = new Date(Date.now() + error.retryAfterSeconds * 1000);
          }
          errors.push(`hubspot: ${this.safe(error, row.email)}`);
        }
      }
    }

    if (errors.length > 0 && !patch.nextRetryAt) {
      // Exponential backoff: ~5s, 10s, 20s, 40s...
      const delay = Math.min(900, Math.round(5 * Math.pow(2, row.attempts)));
      patch.nextRetryAt = new Date(Date.now() + delay * 1000);
    }

    await this.prisma.contactInquiry.update({
      where: {id},
      data: {...patch,...(claimed?{}:{attempts:{increment:1}}), lastError: errors.length ? errors.join(' | ').slice(0, 1000) : null}
    });
  }

  /** Retries inquiries with a pending or failed step. Called by the scheduled drain endpoint. */
  async drain(batchSize = 10): Promise<{processed: number}> {
    if (!this.notifications) return {processed: 0};
    
    // Atomic batch lease using PostgreSQL SKIP LOCKED to prevent races across concurrent cron triggers
    const claimedRows = await this.prisma.$queryRaw<{id: string}[]>`
      WITH claimable AS (
        SELECT "id" FROM "ContactInquiry"
        WHERE "deletedAt" IS NULL AND "source" = 'WEBSITE' AND "attempts" < ${MAX_ATTEMPTS}
          AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= NOW())
          AND "updatedAt" < NOW() - INTERVAL '30 seconds'
          AND (
            "ownerEmailStatus" IN ('PENDING', 'FAILED')
            OR "visitorEmailStatus" IN ('PENDING', 'FAILED')
            OR (${this.notifications.configured} AND ("ownerEmailStatus" = 'UNCONFIGURED' OR "visitorEmailStatus" = 'UNCONFIGURED'))
            OR "hubspotStatus" IN ('PENDING', 'FAILED')
          )
        ORDER BY "createdAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "ContactInquiry"
      SET "attempts" = "attempts" + 1, "updatedAt" = NOW()
      WHERE "id" IN (SELECT "id" FROM claimable)
      RETURNING "id";
    `;

    if (!claimedRows || claimedRows.length === 0) {
      return {processed: 0};
    }

    for (const row of claimedRows) {
      await this.deliver(row.id,true).catch(error => this.logger.error(`Contact retry failed for ${row.id}: ${this.safe(error)}`));
    }
    return {processed: claimedRows.length};
  }

  private safe(error: unknown, email?: string): string {
    let text = error instanceof Error ? error.message : String(error);
    if (email) text = text.replaceAll(email, '[REDACTED_EMAIL]');
    return text.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]').slice(0, 300);
  }
}

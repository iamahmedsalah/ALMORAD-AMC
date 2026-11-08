import {createHash} from 'node:crypto';
import {BadRequestException, ConflictException, Inject, Injectable, Logger, Optional} from '@nestjs/common';
import {waitUntil} from '@vercel/functions';
import {contactSubmissionSchema} from '@amc/shared';
import {PrismaService} from '../../prisma/prisma.service.js';
import {NotificationsService} from '../notifications/notifications.service.js';
import {renderContactOwnerEmail, renderContactVisitorEmail} from './contact-emails.js';
import {HubSpotClient} from './hubspot.client.js';

const MAX_ATTEMPTS = 5;
const open = ['PENDING', 'FAILED'];

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
    const {idempotencyKey, website, name, email, message, locale} = parsed.data;
    if (website) return {accepted: true};
    const fields = {name, email, message, locale};
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
  async deliver(id: string): Promise<void> {
    const notifications = this.notifications;
    if (!notifications) return;
    const row = await this.prisma.contactInquiry.findUnique({where: {id}});
    if (!row) return;
    const errors: string[] = [];
    const patch: Record<string, string | null> = {};
    const mail = {locale: row.locale, name: row.name, email: row.email, message: row.message};

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
        } catch (error) { patch.ownerEmailStatus = 'FAILED'; errors.push(`owner: ${this.safe(error, row.email)}`); }
      }
    }

    if (open.includes(row.visitorEmailStatus)) {
      try {
        const email = renderContactVisitorEmail(mail);
        await notifications.sendEmail({to: row.email, subject: email.subject, text: email.text, html: email.html, idempotencyKey: `contact-${row.id}-visitor`});
        patch.visitorEmailStatus = 'SENT';
      } catch (error) { patch.visitorEmailStatus = 'FAILED'; errors.push(`visitor: ${this.safe(error, row.email)}`); }
    }

    if (open.includes(row.hubspotStatus)) {
      if (!this.hubspot?.enabled) patch.hubspotStatus = 'SKIPPED';
      else {
        try {
          patch.hubspotContactId = (await this.hubspot.upsertContact(mail)) || null;
          patch.hubspotStatus = 'SENT';
        } catch (error) { patch.hubspotStatus = 'FAILED'; errors.push(`hubspot: ${this.safe(error, row.email)}`); }
      }
    }

    await this.prisma.contactInquiry.update({
      where: {id},
      data: {...patch, attempts: {increment: 1}, lastError: errors.length ? errors.join(' | ').slice(0, 1000) : null}
    });
  }

  /** Retries inquiries with a pending or failed step. Called by the scheduled drain endpoint. */
  async drain(batchSize = 10): Promise<{processed: number}> {
    if (!this.notifications) return {processed: 0};
    const rows = await this.prisma.contactInquiry.findMany({
      where: {
        attempts: {lt: MAX_ATTEMPTS},
        updatedAt: {lt: new Date(Date.now() - 60_000)},
        OR: [{ownerEmailStatus: {in: open}}, {visitorEmailStatus: {in: open}}, {hubspotStatus: {in: open}}]
      },
      orderBy: {createdAt: 'asc'},
      take: batchSize,
      select: {id: true}
    });
    for (const row of rows) await this.deliver(row.id).catch(error => this.logger.error(`Contact retry failed for ${row.id}: ${this.safe(error)}`));
    return {processed: rows.length};
  }

  private safe(error: unknown, email?: string): string {
    let text = error instanceof Error ? error.message : String(error);
    if (email) text = text.replaceAll(email, '[REDACTED_EMAIL]');
    return text.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]').slice(0, 300);
  }
}

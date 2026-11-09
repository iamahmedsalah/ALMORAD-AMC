import {Injectable, Logger} from '@nestjs/common';

export interface HubSpotContactInput {
  email: string;
  name: string;
  message: string;
  locale: string;
}

export interface HubSpotBookingContactInput {
  email: string;
  name: string;
  phone?: string | null;
  company?: string | null;
  locale: string;
}

export interface HubSpotMeetingInput {
  contactId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  reference: string;
}

export class HubSpotRateLimitError extends Error {
  constructor(message: string, public readonly retryAfterSeconds = 10) {
    super(message);
    this.name = 'HubSpotRateLimitError';
  }
}

/**
 * Minimal HubSpot CRM v3 client (private-app token).
 * Upserts contacts and manages meeting engagements for consultation lifecycle sync.
 * Never logs response bodies to protect visitor/client PII.
 */
@Injectable()
export class HubSpotClient {
  private readonly logger = new Logger(HubSpotClient.name);

  get enabled(): boolean {
    return Boolean(process.env.HUBSPOT_ACCESS_TOKEN);
  }

  private token(): string {
    const token = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!token) throw new Error('HubSpot is not configured');
    return token;
  }

  /**
   * Safely formats Arabic and Latin names to avoid corrupting Arabic patronymics and compound names.
   */
  private formatNames(rawName: string): {firstname: string; lastname: string} {
    const trimmed = rawName.trim();
    const isArabic = /[\u0600-\u06FF]/.test(trimmed);
    if (isArabic) {
      // In Arabic culture, splitting on whitespace breaks compound names (e.g. "عبد الله")
      return {firstname: trimmed, lastname: ''};
    }
    const [first = trimmed, ...rest] = trimmed.split(/\s+/);
    return {firstname: first, lastname: rest.join(' ')};
  }

  async upsertContact(input: HubSpotContactInput): Promise<string> {
    const token = this.token();
    const {firstname, lastname} = this.formatNames(input.name);

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert', {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        inputs: [{
          id: input.email,
          idProperty: 'email',
          properties: {
            email: input.email,
            firstname,
            lastname,
            message: input.message.slice(0, 2000),
            hs_language: input.locale
          }
        }]
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (response.status === 429) {
      const retryHeader = response.headers.get('Retry-After');
      const seconds = retryHeader ? parseInt(retryHeader, 10) : 10;
      throw new HubSpotRateLimitError('HubSpot API rate limit exceeded', Number.isFinite(seconds) ? seconds : 10);
    }

    if (!response.ok) {
      this.logger.warn(`HubSpot contact upsert rejected with HTTP ${response.status}`);
      throw new Error(`HubSpot upsert failed (${response.status})`);
    }

    const data = (await response.json()) as {results?: {id?: string}[]};
    return String(data.results?.[0]?.id ?? '');
  }

  async upsertBookingContact(input: HubSpotBookingContactInput): Promise<string> {
    const token = this.token();
    const {firstname, lastname} = this.formatNames(input.name);

    const properties: Record<string, string> = {
      email: input.email,
      firstname,
      lastname,
      hs_language: input.locale
    };
    if (input.phone) properties.phone = input.phone;
    if (input.company) properties.company = input.company;

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert', {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        inputs: [{
          id: input.email,
          idProperty: 'email',
          properties
        }]
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (response.status === 429) {
      const retryHeader = response.headers.get('Retry-After');
      const seconds = retryHeader ? parseInt(retryHeader, 10) : 10;
      throw new HubSpotRateLimitError('HubSpot API rate limit exceeded', Number.isFinite(seconds) ? seconds : 10);
    }

    if (!response.ok) {
      this.logger.warn(`HubSpot booking contact upsert rejected with HTTP ${response.status}`);
      throw new Error(`HubSpot booking contact upsert failed (${response.status})`);
    }

    const data = (await response.json()) as {results?: {id?: string}[]};
    return String(data.results?.[0]?.id ?? '');
  }

  async createMeeting(input: HubSpotMeetingInput): Promise<string> {
    const token = this.token();

    const response = await fetch('https://api.hubapi.com/crm/v3/objects/meetings', {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        properties: {
          hs_meeting_title: input.title,
          hs_meeting_start_time: input.startsAt.toISOString(),
          hs_meeting_end_time: input.endsAt.toISOString(),
          hs_meeting_outcome: 'SCHEDULED',
          hs_internal_meeting_notes: `Booking reference: ${input.reference}`
        },
        associations: [
          {
            to: {id: input.contactId},
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 200 // meeting_to_contact
              }
            ]
          }
        ]
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (response.status === 429) {
      const retryHeader = response.headers.get('Retry-After');
      const seconds = retryHeader ? parseInt(retryHeader, 10) : 10;
      throw new HubSpotRateLimitError('HubSpot API rate limit exceeded', Number.isFinite(seconds) ? seconds : 10);
    }

    if (!response.ok) {
      this.logger.warn(`HubSpot meeting creation rejected with HTTP ${response.status}`);
      throw new Error(`HubSpot create meeting failed (${response.status})`);
    }

    const data = (await response.json()) as {id?: string};
    return String(data.id ?? '');
  }

  async updateMeeting(meetingId: string, input: {startsAt?: Date; endsAt?: Date; outcome?: 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELED'}): Promise<void> {
    const token = this.token();
    const properties: Record<string, string> = {};

    if (input.startsAt) properties.hs_meeting_start_time = input.startsAt.toISOString();
    if (input.endsAt) properties.hs_meeting_end_time = input.endsAt.toISOString();
    if (input.outcome) properties.hs_meeting_outcome = input.outcome;

    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/meetings/${encodeURIComponent(meetingId)}`, {
      method: 'PATCH',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({properties}),
      signal: AbortSignal.timeout(5000)
    });

    if (response.status === 429) {
      const retryHeader = response.headers.get('Retry-After');
      const seconds = retryHeader ? parseInt(retryHeader, 10) : 10;
      throw new HubSpotRateLimitError('HubSpot API rate limit exceeded', Number.isFinite(seconds) ? seconds : 10);
    }

    if (!response.ok) {
      this.logger.warn(`HubSpot meeting update rejected with HTTP ${response.status}`);
      throw new Error(`HubSpot update meeting failed (${response.status})`);
    }
  }
}

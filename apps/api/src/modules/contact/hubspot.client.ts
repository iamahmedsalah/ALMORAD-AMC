import {Injectable, Logger} from '@nestjs/common';

export interface HubSpotContactInput {
  email: string;
  name: string;
  message: string;
  locale: string;
}

/**
 * Minimal HubSpot CRM client (private-app token). Upserts a contact by email so a
 * repeat visitor updates the same record instead of creating duplicates.
 * Never logs the response body: it can contain visitor details.
 */
@Injectable()
export class HubSpotClient {
  private readonly logger = new Logger(HubSpotClient.name);

  get enabled(): boolean {
    return Boolean(process.env.HUBSPOT_ACCESS_TOKEN);
  }

  async upsertContact(input: HubSpotContactInput): Promise<string> {
    const token = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!token) throw new Error('HubSpot is not configured');
    const [first = input.name, ...rest] = input.name.trim().split(/\s+/);
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert', {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        inputs: [{
          id: input.email,
          idProperty: 'email',
          properties: {email: input.email, firstname: first, lastname: rest.join(' '), message: input.message.slice(0, 2000)}
        }]
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      this.logger.warn(`HubSpot contact upsert rejected with HTTP ${response.status}`);
      throw new Error(`HubSpot upsert failed (${response.status})`);
    }
    const data = (await response.json()) as {results?: {id?: string}[]};
    return String(data.results?.[0]?.id ?? '');
  }
}

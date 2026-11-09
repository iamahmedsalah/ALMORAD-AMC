import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {HubSpotClient, HubSpotRateLimitError} from './hubspot.client.js';

describe('HubSpotClient', () => {
  let client: HubSpotClient;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {...originalEnv, HUBSPOT_ACCESS_TOKEN: 'test-pat-token'};
    client = new HubSpotClient();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Arabic Name Formatting', () => {
    it('preserves Arabic compound names without awkward whitespace splitting', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({results: [{id: 'contact-ar-1'}]})
      });
      vi.stubGlobal('fetch', fetchMock);

      const contactId = await client.upsertContact({
        email: 'abdullah@example.com',
        name: 'عبد الله بن محمد',
        message: 'استفسار حول الهوية التجارية',
        locale: 'ar'
      });

      expect(contactId).toBe('contact-ar-1');
      expect(fetchMock).toHaveBeenCalled();
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.inputs[0].properties.firstname).toBe('عبد الله بن محمد');
      expect(body.inputs[0].properties.lastname).toBe('');
    });

    it('splits Latin first and last names normally', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({results: [{id: 'contact-en-1'}]})
      });
      vi.stubGlobal('fetch', fetchMock);

      const contactId = await client.upsertBookingContact({
        email: 'john.smith@example.com',
        name: 'John Smith',
        company: 'Smith Industries',
        locale: 'en'
      });

      expect(contactId).toBe('contact-en-1');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.inputs[0].properties.firstname).toBe('John');
      expect(body.inputs[0].properties.lastname).toBe('Smith');
      expect(body.inputs[0].properties.company).toBe('Smith Industries');
    });
  });

  describe('Meeting Engagements', () => {
    it('creates meeting with association type 200 to contact', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({id: 'meeting-123'})
      });
      vi.stubGlobal('fetch', fetchMock);

      const meetingId = await client.createMeeting({
        contactId: 'contact-en-1',
        title: 'ALMORAD AMC Consultation - AMC-TEST01',
        startsAt: new Date('2026-11-15T10:00:00Z'),
        endsAt: new Date('2026-11-15T11:00:00Z'),
        reference: 'AMC-TEST01'
      });

      expect(meetingId).toBe('meeting-123');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.properties.hs_meeting_outcome).toBe('SCHEDULED');
      expect(body.associations[0].to.id).toBe('contact-en-1');
      expect(body.associations[0].types[0].associationTypeId).toBe(200);
    });

    it('updates meeting with RESCHEDULED or CANCELED outcome', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({})
      });
      vi.stubGlobal('fetch', fetchMock);

      await client.updateMeeting('meeting-123', {
        outcome: 'CANCELED'
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/meetings/meeting-123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({properties: {hs_meeting_outcome: 'CANCELED'}})
        })
      );
    });

    it('throws HubSpotRateLimitError on HTTP 429 with retry header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({'Retry-After': '15'}),
        json: async () => ({})
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(client.createMeeting({
        contactId: 'contact-en-1',
        title: 'Rate limited meeting',
        startsAt: new Date(),
        endsAt: new Date(),
        reference: 'AMC-RATE'
      })).rejects.toThrow(HubSpotRateLimitError);
    });
  });
});

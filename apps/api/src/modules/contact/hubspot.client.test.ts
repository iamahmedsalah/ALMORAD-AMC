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
    vi.unstubAllGlobals();
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
      expect(body.properties.hs_timestamp).toBe('2026-11-15T10:00:00.000Z');
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
  it('maps inquiry phone and message to the same normalized-email contact',async()=>{
    const fetchMock=vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({results:[{id:'42'}]})});vi.stubGlobal('fetch',fetchMock);
    await client.upsertContact({email:'TEST@EXAMPLE.INVALID',name:'Test Visitor',phone:'+1 202 555 0100',message:'Website inquiry',locale:'en'});
    const body=JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.inputs[0]).toMatchObject({id:'test@example.invalid',idProperty:'email',properties:{phone:'+1 202 555 0100',message:'Website inquiry'}});
  });
  it('rejects a partial batch failure without a contact ID',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,status:207,json:async()=>({results:[],errors:[{message:'not logged'}]})}));
    await expect(client.upsertBookingContact({email:'test@example.invalid',name:'Test Visitor',locale:'en'})).rejects.toThrow('no contact ID');
  });
  it('carries a real video link and website staff URL into the meeting',async()=>{
    const fetchMock=vi.fn().mockResolvedValue({ok:true,status:201,json:async()=>({id:'88'})});vi.stubGlobal('fetch',fetchMock);
    await client.createMeeting({contactId:'42',title:'Test',startsAt:new Date('2026-11-20T10:00:00Z'),endsAt:new Date('2026-11-20T10:30:00Z'),reference:'TEST-ONLY',location:'https://meet.google.com/abc-defg-hij',externalUrl:'https://studio.example.invalid/en/staff/calendar?appointment=fixture'});
    const body=JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.properties.hs_meeting_location).toBe('https://meet.google.com/abc-defg-hij');
    expect(body.properties.hs_meeting_external_url).toContain('/staff/calendar?appointment=');expect(JSON.stringify(body)).not.toContain('token=');
  });
  it('keeps timestamp and meeting start aligned when rescheduled',async()=>{
    const fetchMock=vi.fn().mockResolvedValue({ok:true,status:200});vi.stubGlobal('fetch',fetchMock);
    await client.updateMeeting('88',{startsAt:new Date('2026-11-21T10:00:00Z'),location:''});
    const properties=JSON.parse(fetchMock.mock.calls[0]![1].body).properties;
    expect(properties.hs_timestamp).toBe(properties.hs_meeting_start_time);expect(properties.hs_meeting_location).toBe('');
  });
  it('reconciles uncertain meeting creation by exact booking reference',async()=>{
    const fetchMock=vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({results:[{id:'88'}]})});vi.stubGlobal('fetch',fetchMock);
    expect(await client.findMeetingByReference('TEST-ONLY')).toBe('88');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).filterGroups[0].filters[0]).toMatchObject({operator:'EQ',value:'Booking reference: TEST-ONLY'});
  });
  it('classifies a timed out creation as uncertain so the worker cannot blindly retry it',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Synthetic network failure')));
    await expect(client.createMeeting({contactId:'42',title:'Test',startsAt:new Date(),endsAt:new Date(),reference:'TEST-ONLY'})).rejects.toThrow('CRM_MEETING_RECONCILE_REQUIRED');
  });
});

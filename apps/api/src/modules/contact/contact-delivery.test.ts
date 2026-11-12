import {describe, expect, it, vi} from 'vitest';
import {ContactService} from './contact.service.js';
import {renderContactOwnerEmail, renderContactVisitorEmail} from './contact-emails.js';
import {renderEmailLayout} from '../notifications/templates/email-layout.js';
import type {PrismaService} from '../../prisma/prisma.service.js';
import type {NotificationsService} from '../notifications/notifications.service.js';
import type {HubSpotClient} from './hubspot.client.js';

const row = (over: Record<string, unknown> = {}) => ({id: 'row-1', locale: 'en', name: 'Sara Ali', email: 'sara@example.invalid', message: 'Hello, I want a brand refresh.', ownerEmailStatus: 'PENDING', visitorEmailStatus: 'PENDING', hubspotStatus: 'PENDING', ...over});

function setup(stored = row(), env: Record<string, string> = {CONTACT_INBOX_EMAIL: 'studio@example.invalid'}) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const prisma = {contactInquiry: {findUnique: vi.fn().mockResolvedValue(stored), update: vi.fn().mockResolvedValue({})}};
  const notifications = {sendEmail: vi.fn().mockResolvedValue('id-1')};
  const hubspot = {enabled: true, upsertContact: vi.fn().mockResolvedValue('hs-42')};
  const service = new ContactService(prisma as unknown as PrismaService, notifications as unknown as NotificationsService, hubspot as unknown as HubSpotClient);
  return {prisma, notifications, hubspot, service};
}

describe('contact delivery', () => {
  it('syncs the inquiry phone to HubSpot even when both email deliveries are rejected',async()=>{
    const {service,notifications,hubspot,prisma}=setup(row({phone:'+1 202 555 0100'}));
    notifications.sendEmail.mockRejectedValue(new Error('Resend validation_error'));
    await service.deliver('row-1');
    expect(hubspot.upsertContact).toHaveBeenCalledWith(expect.objectContaining({phone:'+1 202 555 0100'}));
    expect(prisma.contactInquiry.update.mock.calls[0]?.[0].data).toMatchObject({ownerEmailStatus:'FAILED',visitorEmailStatus:'FAILED',hubspotStatus:'SENT',hubspotContactId:'hs-42'});
  });
  it('does not claim a sync succeeded without a returned contact ID',async()=>{
    const {service,hubspot,prisma}=setup();hubspot.upsertContact.mockResolvedValue('');await service.deliver('row-1');
    expect(prisma.contactInquiry.update.mock.calls[0]?.[0].data).toMatchObject({hubspotStatus:'FAILED'});
  });
  it('counts a claimed retry once instead of incrementing the lease and delivery attempts twice',async()=>{
    const {service,prisma}=setup();await service.deliver('row-1',true);
    expect(prisma.contactInquiry.update.mock.calls[0]?.[0].data).not.toHaveProperty('attempts');
  });
  it('emails the studio and the visitor and syncs HubSpot, recording each step', async () => {
    const {prisma, notifications, hubspot, service} = setup();
    await service.deliver('row-1');
    expect(notifications.sendEmail).toHaveBeenCalledTimes(2);
    expect(notifications.sendEmail.mock.calls[0]?.[0]).toMatchObject({to: 'studio@example.invalid', replyTo: 'sara@example.invalid', idempotencyKey: 'contact-row-1-owner'});
    expect(notifications.sendEmail.mock.calls[1]?.[0]).toMatchObject({to: 'sara@example.invalid', idempotencyKey: 'contact-row-1-visitor'});
    expect(hubspot.upsertContact).toHaveBeenCalledWith(expect.objectContaining({email: 'sara@example.invalid'}));
    expect(prisma.contactInquiry.update.mock.calls[0]?.[0].data).toMatchObject({ownerEmailStatus: 'SENT', visitorEmailStatus: 'SENT', hubspotStatus: 'SENT', hubspotContactId: 'hs-42', lastError: null});
  });

  it('does not resend steps that already succeeded and retries only the failed one', async () => {
    const {prisma, notifications, hubspot, service} = setup(row({ownerEmailStatus: 'SENT', visitorEmailStatus: 'SENT', hubspotStatus: 'FAILED'}));
    await service.deliver('row-1');
    expect(notifications.sendEmail).not.toHaveBeenCalled();
    expect(hubspot.upsertContact).toHaveBeenCalledTimes(1);
    expect(prisma.contactInquiry.update.mock.calls[0]?.[0].data).toMatchObject({hubspotStatus: 'SENT'});
  });

  it('keeps the lead and marks a step FAILED when Resend errors, without leaking the visitor email', async () => {
    const {prisma, notifications, service} = setup();
    notifications.sendEmail.mockRejectedValueOnce(new Error('Resend error: rate_limit for studio@example.invalid'));
    await service.deliver('row-1');
    const data = prisma.contactInquiry.update.mock.calls[0]?.[0].data;
    expect(data.ownerEmailStatus).toBe('FAILED');
    expect(data.visitorEmailStatus).toBe('SENT');
    expect(data.lastError).toContain('[REDACTED_EMAIL]');
    expect(data.lastError).not.toContain('studio@example.invalid');
  });

  it('keeps unconfigured mail available for delivery after a provider is added', async () => {
    const {prisma,notifications,service}=setup();
    notifications.sendEmail.mockRejectedValue(new Error('Email delivery is not configured'));
    await service.deliver('row-1');
    expect(prisma.contactInquiry.update.mock.calls[0]?.[0].data).toMatchObject({ownerEmailStatus:'UNCONFIGURED',visitorEmailStatus:'UNCONFIGURED'});
  });

  it('skips the studio alert and HubSpot when they are not configured', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('CONTACT_INBOX_EMAIL', '');
    const {prisma, hubspot, service} = setup(row(), {CONTACT_INBOX_EMAIL: ''});
    hubspot.enabled = false;
    await service.deliver('row-1');
    expect(prisma.contactInquiry.update.mock.calls[0]?.[0].data).toMatchObject({ownerEmailStatus: 'SKIPPED', hubspotStatus: 'SKIPPED', visitorEmailStatus: 'SENT'});
  });
});

describe('reusable email layout', () => {
  it('escapes visitor-supplied HTML and strips header-injection line breaks', () => {
    const owner = renderContactOwnerEmail({id: 'x', locale: 'en', name: 'Eve\r\nBcc: evil@example.invalid', email: 'e@example.invalid', message: '<script>alert(1)</script>'});
    expect(owner.html).not.toContain('<script>');
    expect(owner.html).toContain('&lt;script&gt;');
    expect(owner.subject).not.toMatch(/[\r\n]/);
  });

  it('renders RTL Arabic and LTR English shells with the brand header and footer', () => {
    const ar = renderContactVisitorEmail({locale: 'ar', name: 'سارة', email: 's@example.invalid', message: 'أريد تجديد هوية علامتي التجارية'});
    const en = renderContactVisitorEmail({locale: 'en', name: 'Sara', email: 's@example.invalid', message: 'Brand refresh please'});
    expect(ar.html).toContain('dir="rtl"');
    expect(en.html).toContain('dir="ltr"');
    for (const mail of [ar, en]) { expect(mail.html).toContain('#0B1F44'); expect(mail.html).toContain('#F7761E'); expect(mail.html).toContain('cid:almorad-logo'); }
  });

  it('shows contact details in the footer only when the owner supplied them', () => {
    vi.stubEnv('NEXT_PUBLIC_CONTACT_EMAIL', '');
    expect(renderEmailLayout({locale: 'en', heading: 'Hi', bodyHtml: '<p>x</p>'})).not.toContain('mailto:');
    vi.stubEnv('NEXT_PUBLIC_CONTACT_EMAIL', 'hello@example.invalid');
    expect(renderEmailLayout({locale: 'en', heading: 'Hi', bodyHtml: '<p>x</p>'})).toContain('mailto:hello@example.invalid');
    vi.unstubAllEnvs();
  });
});

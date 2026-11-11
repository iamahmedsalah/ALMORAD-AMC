/** Render local, synthetic email previews. This script never calls an email provider. */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {services} from '../packages/shared/src/index.js';
import {renderContactOwnerEmail, renderContactVisitorEmail} from '../apps/api/src/modules/contact/contact-emails.js';
import {renderBookingConfirmationEmail} from '../apps/api/src/modules/notifications/templates/booking-confirmation.template.js';
import {renderBookingRescheduledEmail} from '../apps/api/src/modules/notifications/templates/booking-rescheduled.template.js';
import {renderBookingCancelledEmail} from '../apps/api/src/modules/notifications/templates/booking-cancelled.template.js';

process.env.EMAIL_SITE_URL = 'https://almorad-amc.vercel.app';
const output = join(process.cwd(), 'docs', 'reviews', 'email-template-preview');
mkdirSync(output, {recursive: true});
const localLogo = '../../../apps/web/public/brand/footer-logo-on-dark@2x.png';
const mockDate = new Date('2026-11-19T10:00:00.000Z');
const booking = {
  reference: 'AMC-PREVIEW-ONLY',
  serviceTitle: 'Branding',
  meetingType: 'ONLINE' as const,
  startsAt: mockDate,
  endsAt: new Date(mockDate.getTime() + 30 * 60_000),
  timezone: 'Africa/Cairo',
  managementUrl: '#preview-only'
};
const previews = [
  {file: 'booking-en.html', label: 'Booking receipt · English', mail: renderBookingConfirmationEmail({...booking, locale: 'en', clientName: 'Sample Visitor'})},
  {file: 'booking-ar.html', label: 'Booking receipt · Arabic', mail: renderBookingConfirmationEmail({...booking, serviceTitle:services.find(service=>service.slug==='branding')!.ar, locale: 'ar', clientName: 'زائر تجريبي'})},
  {file: 'contact-visitor-en.html', label: 'Contact reply · English', mail: renderContactVisitorEmail({locale: 'en', name: 'Sample Visitor', email: 'sample@example.invalid', message: 'This is a sample inquiry for the local preview.'})},
  {file: 'contact-visitor-ar.html', label: 'Contact reply · Arabic', mail: renderContactVisitorEmail({locale: 'ar', name: 'زائر تجريبي', email: 'sample@example.invalid', message: 'هذه رسالة تجريبية لمعاينة القالب محليًا.'})},
  {file: 'contact-studio.html', label: 'Contact alert · Studio inbox', mail: renderContactOwnerEmail({id: 'PREVIEW-ONLY', locale: 'en', name: 'Sample Visitor', email: 'sample@example.invalid', message: 'This is a sample inquiry for the local preview.'})},
  {file: 'rescheduled-en.html', label: 'Rescheduled · English', mail: renderBookingRescheduledEmail({...booking, locale: 'en', clientName: 'Sample Visitor'})},
  {file: 'cancelled-en.html', label: 'Cancellation · English', mail: renderBookingCancelledEmail({reference: booking.reference, locale: 'en', clientName: 'Sample Visitor', serviceTitle: booking.serviceTitle, cancelledAt: mockDate, timezone: booking.timezone})}
];
for (const preview of previews) {
  const html = preview.mail.html.replaceAll('https://almorad-amc.vercel.app/brand/footer-logo-on-dark@2x.png', localLogo);
  writeFileSync(join(output, preview.file), html, 'utf8');
}
const cards = previews.map(item => `<article><h2>${item.label}</h2><p>Subject: ${item.mail.subject}</p><a href="${item.file}" class="preview"><img src="${item.file.replace('.html','.png')}" alt="Preview of ${item.label}" loading="lazy"></a><a href="${item.file}">Open full email</a></article>`).join('\n');
writeFileSync(join(output, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AMC email template previews</title><style>body{margin:0;padding:24px;background:#FBF1E6;color:#0B1F44;font:16px/1.5 system-ui}main{max-width:1500px;margin:auto}h1{font-size:clamp(1.8rem,4vw,3rem)}.note{background:#fff;border:1px solid #F7761E;padding:16px;border-radius:14px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr));gap:24px;margin-top:24px}article{background:white;border:1px solid #D9C8B7;border-radius:16px;padding:16px}h2{font-size:1.2rem;margin:0}article p{overflow-wrap:anywhere}.preview{display:block;height:480px;border:1px solid #D9C8B7;border-radius:10px;overflow:hidden}.preview img{display:block;width:100%;height:auto}a{color:#A74200;display:inline-block;margin-top:12px}</style></head><body><main><h1>ALMORAD AMC email previews</h1><p class="note"><strong>Local preview only.</strong> All names, addresses, references and dates below are sample data. No email was sent. Open any card to inspect the full template.</p><section>${cards}</section></main></body></html>`, 'utf8');
console.log(`Rendered ${previews.length} synthetic emails to ${output}`);

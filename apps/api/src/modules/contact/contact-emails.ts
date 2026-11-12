import {escapeHtml, renderEmailLayout, singleLine} from '../notifications/templates/email-layout.js';
import type {EmailContent} from '../notifications/templates/booking-confirmation.template.js';

export interface ContactEmailInput {
  locale: string;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
}

const paragraphs = (value: string) => value.split(/\r?\n+/).map(line => `<p style="margin:0 0 12px;">${escapeHtml(line)}</p>`).join('');

/** Confirmation sent to the visitor in their own language. */
export function renderContactVisitorEmail(input: ContactEmailInput): EmailContent {
  const ar = input.locale === 'ar';
  const name = singleLine(input.name);
  const subject = ar ? 'استلمنا رسالتك | ALMORAD AMC' : 'We received your message | ALMORAD AMC';
  const heading = ar ? 'شكرًا لتواصلك معنا' : 'Thanks for getting in touch';
  const intro = ar
    ? `مرحبًا ${escapeHtml(name)}، استلم فريق المراد رسالتك وسيرد عليك قريبًا على هذا البريد الإلكتروني.`
    : `Hello ${escapeHtml(name)}, the ALMORAD AMC team received your message and will reply to this email address.`;
  const bodyHtml = `<p aria-hidden="true" style="font-size:32px;margin:0 0 14px;">&#10003;</p><p style="margin:0 0 16px;">${intro}</p><p>${ar?'سنراجع استفسارك ونرد عليك قريبًا. شكرًا لاختيارك المراد AMC.':'We will review your inquiry and reply soon. Thank you for choosing ALMORAD AMC.'}</p>`;
  const footerNote = ar
    ? 'وصلتك هذه الرسالة لأن هذا البريد استُخدم في نموذج التواصل على almorad-amc.com. إذا لم تكن أنت، يمكنك تجاهلها.'
    : 'You received this email because this address was used in the contact form on almorad-amc.com. If that was not you, you can ignore it.';
  const html = renderEmailLayout({locale: input.locale, heading, bodyHtml, footerNote, preheader: intro});
  const text = `${heading}\n\n${ar ? `مرحبًا ${name}،` : `Hello ${name},`}\n${ar ? 'استلمنا رسالتك وسنرد عليك قريبًا.' : 'We received your message and will reply soon.'}\n\nALMORAD AMC`;
  return {subject, text, html};
}

/** Internal alert for the studio inbox. Always English so staff read one format. */
export function renderContactOwnerEmail(input: ContactEmailInput & {id: string}): EmailContent {
  const name = singleLine(input.name);
  const subject = `New website inquiry from ${name}`;
  const row = (label: string, value: string) => `<tr><td style="padding:12px;text-align:center;border-bottom:1px solid #D9C8B7;"><strong style="display:block;color:#A74200;">${label}</strong><span style="display:block;margin-top:4px;overflow-wrap:anywhere;">${value}</span></td></tr>`;
  const bodyHtml = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:15px;">
${row('&#9673; Name', escapeHtml(name))}
${row('&#9993; Email', `<a href="mailto:${escapeHtml(input.email)}" style="color:#B84A05;">${escapeHtml(input.email)}</a>`)}
${input.phone ? row('&#9742; Phone', `<a href="tel:${escapeHtml(input.phone.replace(/[^+0-9]/g,''))}">${escapeHtml(input.phone)}</a>`) : ''}
${row('Language', input.locale === 'ar' ? 'Arabic' : 'English')}
${row('Reference', escapeHtml(input.id))}
</table>
<p style="margin:18px 0 8px;font-weight:700;color:#B84A05;">Message</p>
<div style="background:#FCF8F3;padding:14px 16px;border-radius:12px;">${paragraphs(input.message)}</div>`;
  const html = renderEmailLayout({locale: 'en', heading: 'New website inquiry', bodyHtml, preheader: `${name}: ${singleLine(input.message).slice(0, 90)}`, footerNote: 'Reply to this email to answer the visitor directly.'});
  const text = `New website inquiry\n\nName: ${name}\nEmail: ${input.email}\nPhone: ${input.phone || 'Not supplied'}\nLanguage: ${input.locale}\nReference: ${input.id}\n\n${input.message}`;
  return {subject, text, html};
}

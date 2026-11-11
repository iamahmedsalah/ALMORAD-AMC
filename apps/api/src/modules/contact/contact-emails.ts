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
  const copyLabel = ar ? 'نسخة من رسالتك' : 'A copy of your message';
  const bodyHtml = `<p style="margin:0 0 16px;">${intro}</p>
<p style="margin:0 0 8px;font-weight:700;color:#B84A05;">${copyLabel}</p>
<div style="border-${ar ? 'right' : 'left'}:4px solid #F7761E;background:#FCF8F3;padding:14px 16px;border-radius:12px;">${paragraphs(input.message)}</div>`;
  const footerNote = ar
    ? 'وصلتك هذه الرسالة لأن هذا البريد استُخدم في نموذج التواصل على almorad-amc.com. إذا لم تكن أنت، يمكنك تجاهلها.'
    : 'You received this email because this address was used in the contact form on almorad-amc.com. If that was not you, you can ignore it.';
  const html = renderEmailLayout({locale: input.locale, heading, bodyHtml, footerNote, preheader: intro});
  const text = `${heading}\n\n${ar ? `مرحبًا ${name}،` : `Hello ${name},`}\n${ar ? 'استلمنا رسالتك وسنرد عليك قريبًا.' : 'We received your message and will reply soon.'}\n\n${copyLabel}:\n${input.message}\n\nALMORAD AMC\nhttps://almorad-amc.com`;
  return {subject, text, html};
}

/** Internal alert for the studio inbox. Always English so staff read one format. */
export function renderContactOwnerEmail(input: ContactEmailInput & {id: string}): EmailContent {
  const name = singleLine(input.name);
  const subject = `New website inquiry from ${name}`;
  const row = (label: string, value: string) => `<tr><td style="padding:6px 12px 6px 0;color:#354A78;font-weight:700;vertical-align:top;white-space:nowrap;">${label}</td><td style="padding:6px 0;">${value}</td></tr>`;
  const bodyHtml = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:15px;">
${row('Name', escapeHtml(name))}
${row('Email', `<a href="mailto:${escapeHtml(input.email)}" style="color:#B84A05;">${escapeHtml(input.email)}</a>`)}
${input.phone ? row('Phone', escapeHtml(input.phone)) : ''}
${row('Language', input.locale === 'ar' ? 'Arabic' : 'English')}
${row('Reference', escapeHtml(input.id))}
</table>
<p style="margin:18px 0 8px;font-weight:700;color:#B84A05;">Message</p>
<div style="background:#FCF8F3;padding:14px 16px;border-radius:12px;">${paragraphs(input.message)}</div>`;
  const html = renderEmailLayout({locale: 'en', heading: 'New website inquiry', bodyHtml, preheader: `${name}: ${singleLine(input.message).slice(0, 90)}`, footerNote: 'Reply to this email to answer the visitor directly.'});
  const text = `New website inquiry\n\nName: ${name}\nEmail: ${input.email}\nPhone: ${input.phone || 'Not supplied'}\nLanguage: ${input.locale}\nReference: ${input.id}\n\n${input.message}`;
  return {subject, text, html};
}

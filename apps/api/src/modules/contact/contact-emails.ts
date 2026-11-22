import {
  escapeHtml,
  renderEmailDetailGrid,
  renderEmailLayout,
  singleLine,
  type EmailDetailItem
} from '../notifications/templates/email-layout.js';
import type {EmailContent} from '../notifications/templates/booking-confirmation.template.js';

export interface ContactEmailInput {
  locale: string;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
}

const paragraphs = (value: string) =>
  value
    .split(/\r?\n+/)
    .map((line) => `<p style="margin:0 0 10px;">${escapeHtml(line)}</p>`)
    .join('');

/** Confirmation sent to the visitor in their own language. */
export function renderContactVisitorEmail(input: ContactEmailInput): EmailContent {
  const ar = input.locale === 'ar';
  const name = singleLine(input.name);
  const subject = ar ? 'استلمنا رسالتك | ALMORAD AMC' : 'We received your message | ALMORAD AMC';
  const heading = ar ? 'شكرًا لتواصلك معنا' : 'Thanks for getting in touch';
  const intro = ar
    ? `مرحبًا ${escapeHtml(name)}، استلم فريق المراد رسالتك وسيرد عليك قريبًا على هذا البريد الإلكتروني.`
    : `Hello ${escapeHtml(name)}, the ALMORAD AMC team received your message and will reply to this email address.`;
  const checkSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F7761E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;margin:0 auto;"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>';
  const bodyHtml = `<div style="width:52px;height:52px;margin:0 auto 16px;padding:12px;box-sizing:border-box;background:#FFF9F2;border:1px solid #E5D6C5;border-radius:14px;">${checkSvg}</div><p style="margin:0 0 14px;">${intro}</p><p style="margin:0;color:#465676;">${
    ar
      ? 'سنراجع استفسارك ونرد عليك قريبًا. شكرًا لاختيارك المراد AMC.'
      : 'We will review your inquiry and reply soon. Thank you for choosing ALMORAD AMC.'
  }</p>`;
  const footerNote = ar
    ? 'وصلتك هذه الرسالة لأن هذا البريد استُخدم في نموذج التواصل على almorad-amc.com. إذا لم تكن أنت، يمكنك تجاهلها.'
    : 'You received this email because this address was used in the contact form on almorad-amc.com. If that was not you, you can ignore it.';
  const html = renderEmailLayout({locale: input.locale, heading, bodyHtml, footerNote, preheader: intro});
  const text = `${heading}\n\n${ar ? `مرحبًا ${name}،` : `Hello ${name},`}\n${
    ar ? 'استلمنا رسالتك وسنرد عليك قريبًا.' : 'We received your message and will reply soon.'
  }\n\nALMORAD AMC`;
  return {subject, text, html};
}

/** Internal alert for the studio inbox. Always English so staff read one format. */
export function renderContactOwnerEmail(input: ContactEmailInput & {id: string}): EmailContent {
  const name = singleLine(input.name);
  const subject = `New website inquiry from ${name}`;
  const cleanPhone = input.phone?.replace(/[^+0-9]/g, '');

  const items: EmailDetailItem[] = [
    {
      icon: 'user',
      label: 'Name',
      valueHtml: escapeHtml(name)
    },
    {
      icon: 'mail',
      label: 'Email',
      valueHtml: `<a href="mailto:${escapeHtml(input.email)}" dir="ltr" style="color:#0B1F44;text-decoration:underline;">${escapeHtml(input.email)}</a>`
    },
    ...(input.phone
      ? [
          {
            icon: 'phone' as const,
            label: 'Phone',
            valueHtml: `<a href="tel:${escapeHtml(cleanPhone || input.phone)}" dir="ltr" style="color:#0B1F44;text-decoration:underline;">${escapeHtml(input.phone)}</a>`
          }
        ]
      : []),
    {
      icon: 'globe',
      label: 'Language',
      valueHtml: input.locale === 'ar' ? 'Arabic' : 'English'
    },
    {
      icon: 'reference',
      label: 'Reference',
      valueHtml: `<code dir="ltr" style="font-family:monospace;font-size:13px;">${escapeHtml(input.id)}</code>`,
      fullWidth: !input.phone
    },
    {
      icon: 'message',
      label: 'Message',
      valueHtml: paragraphs(input.message),
      fullWidth: true
    }
  ];

  const bodyHtml = renderEmailDetailGrid(items, 'en');
  const html = renderEmailLayout({
    locale: 'en',
    heading: 'New website inquiry',
    bodyHtml,
    preheader: `${name}: ${singleLine(input.message).slice(0, 90)}`,
    footerNote: 'Reply to this email to answer the visitor directly.'
  });
  const text = `New website inquiry\n\nName: ${name}\nEmail: ${input.email}\nPhone: ${input.phone || 'Not supplied'}\nLanguage: ${input.locale}\nReference: ${input.id}\n\n${input.message}`;
  return {subject, text, html};
}

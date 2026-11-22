import {officeAddress, meetingUrlInput} from '@amc/shared';

export type EmailIconName =
  | 'reference'
  | 'user'
  | 'briefcase'
  | 'building'
  | 'mail'
  | 'phone'
  | 'layers'
  | 'video'
  | 'calendar'
  | 'clock'
  | 'globe'
  | 'mapPin'
  | 'users'
  | 'message';

const SVG_ICON_PATHS: Record<EmailIconName, string> = {
  reference: '<path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/>',
  building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 10h4a1 1 0 0 1 1 1v10M2 21h20M8 7h2M8 11h2M8 15h2M12 7h1M12 11h1M12 15h1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  phone: '<path d="M5.5 4h3l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A15.8 15.8 0 0 1 3.5 6.2 2 2 0 0 1 5.5 4Z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10 5-3v10l-5-3v-4Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/>',
  mapPin: '<path d="M12 21s7-6.2 7-11.2A7 7 0 0 0 5 9.8C5 14.8 12 21 12 21Z"/><circle cx="12" cy="10" r="2.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5 5.5"/>',
  message: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-5 4V6.5Z"/>',
};

export function renderEmailIcon(name: EmailIconName, color = '#F7761E', size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:middle;flex-shrink:0;">${SVG_ICON_PATHS[name]}</svg>`;
}

export interface EmailDetailItem {
  icon: EmailIconName;
  label: string;
  /** Trusted, already-escaped HTML value. */
  valueHtml: string;
  fullWidth?: boolean;
}

/**
 * Renders a modern, email-safe 2-column card grid (collapses to 1 column on mobile)
 * with inline SVG icons and full-width highlight cards where needed.
 */
export function renderEmailDetailGrid(items: EmailDetailItem[], locale: string): string {
  const ar = locale === 'ar';
  const textAlign = ar ? 'right' : 'left';
  const iconGap = ar ? 'margin-left:6px;' : 'margin-right:6px;';
  const rows: string[] = [];
  let buffer: EmailDetailItem[] = [];

  const renderCell = (item: EmailDetailItem, colspan = 1) => `
    <td ${colspan > 1 ? `colspan="${colspan}"` : 'width="50%"'} class="${colspan > 1 ? 'amc-grid-full' : 'amc-grid-cell'}" valign="top" style="padding:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#FFFFFF;border:1px solid #E5D6C5;border-radius:12px;">
        <tr>
          <td style="padding:13px 15px;text-align:${textAlign};">
            <div style="font-size:11px;font-weight:700;letter-spacing:${ar ? '0' : '0.04em'};text-transform:${ar ? 'none' : 'uppercase'};color:#A74200;line-height:1.4;margin-bottom:5px;">
              <span style="display:inline-block;vertical-align:middle;${iconGap}">${renderEmailIcon(item.icon, '#F7761E', 15)}</span><span style="vertical-align:middle;">${escapeHtml(item.label)}</span>
            </div>
            <div style="font-size:14px;line-height:1.55;color:#0B1F44;font-weight:500;word-break:break-word;overflow-wrap:anywhere;">
              ${item.valueHtml}
            </div>
          </td>
        </tr>
      </table>
    </td>`;

  const flushPair = () => {
    if (buffer.length === 0) return;
    if (buffer.length === 1) {
      rows.push(`<tr>${renderCell(buffer[0]!, 2)}</tr>`);
    } else {
      rows.push(`<tr>${renderCell(buffer[0]!, 1)}${renderCell(buffer[1]!, 1)}</tr>`);
    }
    buffer = [];
  };

  for (const item of items) {
    if (item.fullWidth) {
      flushPair();
      rows.push(`<tr>${renderCell(item, 2)}</tr>`);
    } else {
      buffer.push(item);
      if (buffer.length === 2) flushPair();
    }
  }
  flushPair();

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0;margin:18px 0;padding:8px;background:#FFF9F2;border:1px solid #E5D6C5;border-radius:16px;">${rows.join('')}</table>`;
}

export function renderMeetingJoinLink(value: string | null | undefined, locale: string): string {
  const parsed = meetingUrlInput.safeParse(value);
  if (!parsed.success) return '';
  const ar = locale === 'ar';
  const iconGap = ar ? 'margin-left:8px;' : 'margin-right:8px;';
  return `<p style="text-align:center;margin:16px 0 8px;"><a href="${escapeHtml(parsed.data)}" style="display:inline-block;padding:12px 22px;color:#0B1F44;background:#FBF1E6;border:1px solid #D9C8B7;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none;"><span style="display:inline-block;vertical-align:middle;${iconGap}">${renderEmailIcon('video', '#A74200', 16)}</span><span style="vertical-align:middle;">${ar ? 'الانضمام للاجتماع' : 'Join meeting'}</span></a></p>`;
}

/**
 * Reusable ALMORAD AMC email shell: branded header + footer shared by every
 * transactional email (contact, booking, reminders). Table layout and inline
 * CSS only, because mail clients ignore external CSS, flex and grid.
 */
export interface EmailLayoutInput {
  locale: string;
  /** Hidden inbox preview text. */
  preheader?: string;
  heading: string;
  /** Trusted, already-escaped HTML. Escape user data with escapeHtml() first. */
  bodyHtml: string;
  cta?: {label: string; url: string};
  /** Small print under the body (for example why the visitor got this email). */
  footerNote?: string;
}

export const brand = {
  navy: '#0B1F44',
  navyDeep: '#061430',
  orange: '#F7761E',
  orangeText: '#A74200',
  cream: '#FBF1E6',
  creamSoft: '#FFF9F2',
  muted: '#465676',
  line: '#D9C8B7'
} as const;

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Removes line breaks so user input can never inject extra mail headers. */
export function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
}

function siteOrigin(): string {
  const vercelOrigin = (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL)
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL}`
    : undefined;
  return (process.env.EMAIL_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || vercelOrigin || 'https://almorad-amc.com').replace(/\/$/, '');
}

/** Only verified, owner-supplied details appear in the footer. */
export function footerContact(): {email?: string; phone?: string} {
  return {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined,
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || undefined
  };
}

export function renderEmailLayout(input: EmailLayoutInput): string {
  const ar = input.locale === 'ar';
  const dir = ar ? 'rtl' : 'ltr';
  const align = 'center';
  const font = ar ? "'Cairo', Tahoma, Arial, sans-serif" : "'Fira Sans', 'Segoe UI', Arial, sans-serif";
  const origin = siteOrigin();
  const logo = 'cid:almorad-logo';
  const contact = footerContact();
  const tagline = ar ? 'استوديو النمو والعلامة التجارية' : 'Growth & Brand Studio';
  const visit = ar ? 'زيارة الموقع' : 'Visit website';
  const rights = ar ? 'جميع الحقوق محفوظة' : 'All rights reserved';
  const cta = input.cta
    ? `<tr><td style="padding:8px 28px 28px;text-align:${align};">
        <a href="${escapeHtml(input.cta.url)}" style="display:inline-block;background:${brand.orange};color:${brand.navy};font-weight:700;font-size:15px;text-decoration:none;padding:13px 28px;border-radius:14px;">${escapeHtml(input.cta.label)}</a>
      </td></tr>`
    : '';
  const contactLine = [
    contact.email ? `<a href="mailto:${escapeHtml(contact.email)}" style="color:${brand.cream};text-decoration:underline;">${escapeHtml(contact.email)}</a>` : '',
    contact.phone ? `<span dir="ltr">${escapeHtml(contact.phone)}</span>` : ''
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${ar ? 'ar' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(input.heading)}</title>
<style>
@media only screen and (max-width:560px){
  .amc-grid-cell{display:block!important;width:100%!important;box-sizing:border-box!important;}
  .amc-body-pad{padding:24px 16px 12px!important;}
}
</style>
</head>
<body style="margin:0;padding:0;background:${brand.creamSoft};font-family:${font};color:${brand.navy};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader || input.heading)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.creamSoft};">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#FFFFFF;border:1px solid ${brand.line};border-radius:20px;overflow:hidden;">
    <tr><td style="background:${brand.navy};padding:26px 32px;text-align:${align};">
      <a href="${escapeHtml(origin)}" style="text-decoration:none;color:${brand.cream};">
        <img src="${escapeHtml(logo)}" width="180" height="38" alt="ALMORAD AMC" style="display:block;width:180px;height:auto;max-width:100%;border:0;margin:0 auto 10px;"/><br>
        <span style="font-size:12px;color:#BCC7DE;">${escapeHtml(tagline)}</span>
      </a>
    </td></tr>
    <tr><td style="height:4px;background:${brand.orange};font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td class="amc-body-pad" style="padding:32px 28px 12px;text-align:${align};">
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.35;color:${brand.navy};">${escapeHtml(input.heading)}</h1>
      <div style="font-size:15px;line-height:1.75;color:${brand.navy};">${input.bodyHtml}</div>
    </td></tr>
    ${cta}
    ${input.footerNote ? `<tr><td style="padding:0 28px 24px;text-align:${align};font-size:13px;line-height:1.6;color:${brand.muted};">${escapeHtml(input.footerNote)}</td></tr>` : ''}
    <tr><td style="background:${brand.navy};padding:22px 32px;text-align:${align};font-size:13px;line-height:1.7;color:#BCC7DE;">
      <a href="${escapeHtml(origin)}" style="display:inline-block;margin-bottom:12px;"><img src="${escapeHtml(logo)}" width="120" height="25" alt="ALMORAD AMC" style="display:block;width:120px;height:auto;max-width:100%;border:0;"/></a><br>
      <a href="${escapeHtml(origin)}" style="color:${brand.cream};text-decoration:underline;">${escapeHtml(visit)}</a>
      ${contactLine ? `<br>${contactLine}` : ''}
      <p style="margin:14px 0 0;color:${brand.cream};">${renderEmailIcon('mapPin', '#F7761E', 14)} <span style="vertical-align:middle;">${escapeHtml(officeAddress[ar?'ar':'en'])}</span></p>
      <br><span style="color:#93A3C6;">© ${new Date().getFullYear()} ALMORAD AMC. ${escapeHtml(rights)}.</span>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

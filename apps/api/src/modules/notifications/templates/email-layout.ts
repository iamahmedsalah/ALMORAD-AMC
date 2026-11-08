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
  navy: '#0B0A08',
  navyDeep: '#14120E',
  orange: '#BE9D5B',
  orangeText: '#7A5F28',
  cream: '#F5F1E7',
  creamSoft: '#FAF7F0',
  muted: '#625D52',
  line: '#CFCBC0'
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
  const align = ar ? 'right' : 'left';
  const font = ar ? "'Cairo', Tahoma, Arial, sans-serif" : "'Fira Sans', 'Segoe UI', Arial, sans-serif";
  const origin = siteOrigin();
  const contact = footerContact();
  const tagline = ar ? 'استوديو النمو والعلامة التجارية' : 'Growth & Brand Studio';
  const visit = ar ? 'زيارة الموقع' : 'Visit website';
  const rights = ar ? 'جميع الحقوق محفوظة' : 'All rights reserved';
  const cta = input.cta
    ? `<tr><td style="padding:8px 32px 28px;text-align:${align};">
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
</head>
<body style="margin:0;padding:0;background:${brand.creamSoft};font-family:${font};color:${brand.navy};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader || input.heading)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.creamSoft};">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid ${brand.line};border-radius:20px;overflow:hidden;">
    <tr><td style="background:${brand.navy};padding:26px 32px;text-align:${align};">
      <a href="${escapeHtml(origin)}" style="text-decoration:none;color:${brand.cream};">
        <span style="font-size:22px;font-weight:800;letter-spacing:${ar ? '0' : '0.14em'};color:${brand.cream};">ALMORAD <span style="color:${brand.orange};">AMC</span></span><br>
        <span style="font-size:12px;color:#BCC7DE;">${escapeHtml(tagline)}</span>
      </a>
    </td></tr>
    <tr><td style="height:4px;background:${brand.orange};font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:32px 32px 12px;text-align:${align};">
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.35;color:${brand.navy};">${escapeHtml(input.heading)}</h1>
      <div style="font-size:16px;line-height:1.75;color:${brand.navy};">${input.bodyHtml}</div>
    </td></tr>
    ${cta}
    ${input.footerNote ? `<tr><td style="padding:0 32px 24px;text-align:${align};font-size:13px;line-height:1.6;color:${brand.muted};">${escapeHtml(input.footerNote)}</td></tr>` : ''}
    <tr><td style="background:${brand.navy};padding:22px 32px;text-align:${align};font-size:13px;line-height:1.7;color:#BCC7DE;">
      <a href="${escapeHtml(origin)}" style="color:${brand.cream};text-decoration:underline;">${escapeHtml(visit)}</a>
      ${contactLine ? `<br>${contactLine}` : ''}
      <br><span style="color:#93A3C6;">© ${new Date().getFullYear()} ALMORAD AMC. ${escapeHtml(rights)}.</span>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

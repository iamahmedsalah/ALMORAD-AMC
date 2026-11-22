import {escapeHtml, renderEmailLayout} from './email-layout.js';

export function staffPasswordResetEmail(code: string, locale: string) {
  const ar = locale === 'ar';
  const subject = ar
    ? 'رمز استعادة كلمة المرور — المراد AMC'
    : 'Your ALMORAD AMC password reset code';
  const text = ar
    ? `رمز استعادة كلمة المرور: ${code}. صالح لمدة ١٥ دقيقة. إذا لم تطلبه، تجاهل هذه الرسالة.`
    : `Your password reset code is ${code}. It expires in 15 minutes. If you did not request this, ignore this email.`;

  const lockSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F7761E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;margin:0 auto;"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.2"/></svg>';

  const bodyHtml = `
    <div style="width:52px;height:52px;margin:0 auto 16px;padding:12px;box-sizing:border-box;background:#FFF9F2;border:1px solid #E5D6C5;border-radius:14px;">${lockSvg}</div>
    <p style="margin:0 0 16px;">${ar ? 'أدخل هذا الرمز في صفحة استعادة كلمة المرور:' : 'Enter this verification code on the password recovery page:'}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;background:#FFF9F2;border:1px solid #E5D6C5;border-radius:14px;">
      <tr>
        <td style="padding:20px 16px;text-align:center;">
          <span dir="ltr" style="display:inline-block;font-family:monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:#0B1F44;">${escapeHtml(code)}</span>
        </td>
      </tr>
    </table>
    <p style="margin:12px 0 0;font-size:13px;color:#465676;">${ar ? 'صالح لمدة ١٥ دقيقة. لا تشارك الرمز مع أي شخص.' : 'Valid for 15 minutes. Never share this code with anyone.'}</p>
  `;

  return {
    subject,
    text,
    html: renderEmailLayout({
      locale,
      heading: subject,
      bodyHtml,
      footerNote: ar
        ? 'إذا لم تطلب تغيير كلمة المرور، تجاهل هذه الرسالة.'
        : 'If you did not request a password reset, ignore this email.'
    })
  };
}

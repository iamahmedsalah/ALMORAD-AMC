import {escapeHtml,renderEmailLayout} from './email-layout.js';
export function staffPasswordResetEmail(code:string,locale:string){
 const ar=locale==='ar';
 const subject=ar?'رمز استعادة كلمة المرور — المراد AMC':'Your ALMORAD AMC password reset code';
 const text=ar?`رمز استعادة كلمة المرور: ${code}. صالح لمدة ١٥ دقيقة. إذا لم تطلبه، تجاهل هذه الرسالة.`:`Your password reset code is ${code}. It expires in 15 minutes. If you did not request this, ignore this email.`;
 return {subject,text,html:renderEmailLayout({locale,heading:subject,bodyHtml:`<p>${ar?'أدخل هذا الرمز في صفحة استعادة كلمة المرور:':'Enter this code on the password recovery page:'}</p><p dir="ltr" style="font-size:32px;letter-spacing:8px;text-align:center">${escapeHtml(code)}</p><p>${ar?'صالح لمدة ١٥ دقيقة. لا تشارك الرمز مع أي شخص.':'Valid for 15 minutes. Never share this code.'}</p>`,footerNote:ar?'إذا لم تطلب تغيير كلمة المرور، تجاهل هذه الرسالة.':'If you did not request a password reset, ignore this email.'})};
}

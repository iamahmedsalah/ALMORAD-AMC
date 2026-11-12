import {escapeHtml, renderEmailLayout} from './email-layout.js';

export type MeetingType = 'ONLINE' | 'IN_PERSON';

export interface BookingConfirmationTemplateInput {
  reference: string;
  clientName: string;
  serviceTitle: string;
  locale: string;
  meetingType: MeetingType;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  managementUrl: string;
  officeAddress?: string | null;
  directionsUrl?: string | null;
  meetingUrl?: string | null;
  status?: string;
  email?:string;
  phone?:string|null;
  company?:string|null;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function renderBookingConfirmationEmail(input: BookingConfirmationTemplateInput): EmailContent {
  const isAr = input.locale === 'ar';

  const timeFormatter = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
    timeZone: input.timezone,
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const formattedTime = timeFormatter.format(input.startsAt) + ' – ' + new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {timeZone:input.timezone,timeStyle:'short'}).format(input.endsAt);
  const locationText = input.meetingType === 'IN_PERSON'
    ? (input.officeAddress || (isAr ? 'مقر الاستوديو' : 'Agency Office'))
    : (input.meetingUrl || (isAr ? 'عبر الإنترنت (سيتم إرسال رابط الاجتماع)' : 'Online Meeting (Video link will be provided)'));

  let subject = isAr
    ? `استلام طلب موعدك مع المراد AMC - ${input.reference}`
    : `Your ALMORAD AMC appointment request - ${input.reference}`;

  let heading = isAr ? 'تم استلام طلب موعدك' : 'Appointment request received';
  const confirmed=input.status==='CONFIRMED';
  if(confirmed){heading=isAr?'تم تأكيد موعدك':'Appointment confirmed';subject=`${heading} | ALMORAD AMC - ${input.reference}`;}
  const preheader = isAr
    ? `تم حفظ طلب موعدك: ${input.serviceTitle} في ${formattedTime}`
    : `Your appointment request for ${input.serviceTitle} on ${formattedTime} was saved.`;

  const detailsRow = (label: string, value: string) => `
    <tr>
      <td style="padding:12px;text-align:center;color:#0B1F44;overflow-wrap:anywhere;border-bottom:1px solid #D9C8B7;">
        <span style="display:block;font-weight:700;color:#A74200;">${escapeHtml(label)}</span>
        <span style="display:block;margin-top:3px;">${value}</span>
      </td>
    </tr>`;

  let bodyHtml = `
    <p style="margin: 0 0 16px;">
      ${isAr ? `مرحباً <strong>${escapeHtml(input.clientName)}</strong>، تم حفظ طلب موعدك مع استوديو المراد AMC. سيراجع الفريق تفاصيل الاجتماع.` : `Hello <strong>${escapeHtml(input.clientName)}</strong>, your appointment request with ALMORAD AMC has been saved. Our team will review the meeting details.`}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #FFF9F2; border-radius: 12px; padding: 12px;">
      ${detailsRow(isAr ? 'رقم المرجع' : 'Reference', `<code dir="ltr" style="unicode-bidi:isolate;">${escapeHtml(input.reference)}</code>`)}
      ${input.email?detailsRow(isAr?'✉ البريد الإلكتروني':'✉ Email',escapeHtml(input.email)):''}
      ${input.phone?detailsRow(isAr?'☎ الهاتف':'☎ Phone',`<span dir="ltr">${escapeHtml(input.phone)}</span>`):''}
      ${input.company?detailsRow(isAr?'الشركة':'Company',escapeHtml(input.company)):''}
      ${detailsRow(isAr ? 'الخدمة' : 'Service', escapeHtml(input.serviceTitle))}
      ${detailsRow(isAr ? 'الموعد' : 'Schedule', `${escapeHtml(formattedTime)} (${escapeHtml(input.timezone)})`)}
      ${detailsRow(isAr ? 'المكان' : 'Location', escapeHtml(locationText))}
      ${input.meetingType === 'ONLINE' && input.meetingUrl ? detailsRow(isAr ? 'رابط الاجتماع' : 'Join meeting', `<a href="${escapeHtml(input.meetingUrl)}">${escapeHtml(input.meetingUrl)}</a>`) : ''}
      ${input.meetingType === 'IN_PERSON' && input.directionsUrl ? detailsRow(isAr ? 'الاتجاهات' : 'Directions', `<a href="${escapeHtml(input.directionsUrl)}" style="color: #F7761E; text-decoration: underline;">${isAr ? 'عرض على خرائط جوجل' : 'View on Google Maps'}</a>`) : ''}
    </table>
    <p style="margin: 16px 0 0; font-size: 14px; color: #625D52;">
      ${isAr ? 'تم إرفاق ملف التقويم (.ics) لتثبيت الموعد على تقويمك الشخصي.' : 'A calendar invite (.ics) is attached to add this meeting to your calendar.'}
    </p>
  `;

  const footerNote = isAr
    ? 'يمكنك مراجعة أو طلب إعادة جدولة الموعد في أي وقت باستخدام زر الإدارة أعلاه.'
    : 'Use the private manage button above to review your appointment or request a change, subject to the booking cutoff.';

  const html = renderEmailLayout({
    locale: input.locale,
    heading,
    preheader,
    bodyHtml,
    cta: {
      label: isAr ? 'إدارة الموعد' : 'Manage Booking',
      url: input.managementUrl
    },
    footerNote
  });

  let text = isAr
    ? `مرحباً ${input.clientName}،\n\nتم حفظ طلب موعدك لدى المراد AMC. سيراجع الفريق التفاصيل.\n\nرقم المرجع: ${input.reference}\nالخدمة: ${input.serviceTitle}\nالموعد: ${formattedTime} (${input.timezone})\nالمكان: ${locationText}\n${input.directionsUrl ? `اتجاهات الوصول: ${input.directionsUrl}\n` : ''}\nإدارة موعدك:\n${input.managementUrl}\n\nفريق المراد AMC\nhttps://almorad-amc.com`
    : `Hello ${input.clientName},\n\nYour appointment request with ALMORAD AMC was saved. Our team will review the meeting details.\n\nReference: ${input.reference}\nService: ${input.serviceTitle}\nDate & Time: ${formattedTime} (${input.timezone})\nLocation: ${locationText}\n${input.directionsUrl ? `Directions: ${input.directionsUrl}\n` : ''}\nManage your booking:\n${input.managementUrl}\n\nALMORAD AMC Team\nhttps://almorad-amc.com`;

  if(confirmed){
    const old=isAr?'تم حفظ طلب موعدك لدى المراد AMC. سيراجع الفريق التفاصيل.':'Your appointment request with ALMORAD AMC was saved. Our team will review the meeting details.';
    text=text.replace(old,isAr?'تم تأكيد موعدك لدى المراد AMC.':'Your appointment with ALMORAD AMC is confirmed.');
    bodyHtml=bodyHtml.replace(isAr?'تم حفظ طلب موعدك مع استوديو المراد AMC. سيراجع الفريق تفاصيل الاجتماع.':'your appointment request with ALMORAD AMC has been saved. Our team will review the meeting details.',isAr?'تم تأكيد موعدك مع استوديو المراد AMC.':'your appointment with ALMORAD AMC is confirmed.');
    return {subject,text,html:renderEmailLayout({locale:input.locale,heading,preheader:heading,bodyHtml,cta:{label:isAr?'إدارة الموعد':'Manage appointment',url:input.managementUrl},footerNote})};
  }
  return {subject, text, html};
}

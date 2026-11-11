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

  const formattedTime = timeFormatter.format(input.startsAt);
  const locationText = input.meetingType === 'IN_PERSON'
    ? (input.officeAddress || (isAr ? 'مقر الاستوديو' : 'Agency Office'))
    : (isAr ? 'عبر الإنترنت (سيتم إرسال رابط الاجتماع)' : 'Online Meeting (Video link will be provided)');

  const subject = isAr
    ? `استلام طلب موعدك مع المراد AMC - ${input.reference}`
    : `Your ALMORAD AMC appointment request - ${input.reference}`;

  const heading = isAr ? 'تم استلام طلب موعدك' : 'Appointment request received';
  const preheader = isAr
    ? `تم حفظ طلب موعدك: ${input.serviceTitle} في ${formattedTime}`
    : `Your appointment request for ${input.serviceTitle} on ${formattedTime} was saved.`;

  const detailsRow = (label: string, value: string) => `
    <tr>
      <td style="padding: 8px 12px 8px 0; font-weight: 700; color: #A74200; vertical-align: top; white-space: nowrap;">${escapeHtml(label)}</td>
      <td style="padding: 8px 0; color: #0B1F44;">${value}</td>
    </tr>`;

  const bodyHtml = `
    <p style="margin: 0 0 16px;">
      ${isAr ? `مرحباً <strong>${escapeHtml(input.clientName)}</strong>، تم حفظ طلب موعدك مع استوديو المراد AMC. سيراجع الفريق تفاصيل الاجتماع.` : `Hello <strong>${escapeHtml(input.clientName)}</strong>, your appointment request with ALMORAD AMC has been saved. Our team will review the meeting details.`}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #FFF9F2; border-radius: 12px; padding: 12px;">
      ${detailsRow(isAr ? 'رقم المرجع' : 'Reference', `<code>${escapeHtml(input.reference)}</code>`)}
      ${detailsRow(isAr ? 'الخدمة' : 'Service', escapeHtml(input.serviceTitle))}
      ${detailsRow(isAr ? 'الموعد' : 'Schedule', `${escapeHtml(formattedTime)} (${escapeHtml(input.timezone)})`)}
      ${detailsRow(isAr ? 'المكان' : 'Location', escapeHtml(locationText))}
      ${input.directionsUrl ? detailsRow(isAr ? 'الاتجاهات' : 'Directions', `<a href="${escapeHtml(input.directionsUrl)}" style="color: #F7761E; text-decoration: underline;">${isAr ? 'عرض على خرائط جوجل' : 'View on Google Maps'}</a>`) : ''}
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

  const text = isAr
    ? `مرحباً ${input.clientName}،\n\nتم حفظ طلب موعدك لدى المراد AMC. سيراجع الفريق التفاصيل.\n\nرقم المرجع: ${input.reference}\nالخدمة: ${input.serviceTitle}\nالموعد: ${formattedTime} (${input.timezone})\nالمكان: ${locationText}\n${input.directionsUrl ? `اتجاهات الوصول: ${input.directionsUrl}\n` : ''}\nإدارة موعدك:\n${input.managementUrl}\n\nفريق المراد AMC\nhttps://almorad-amc.com`
    : `Hello ${input.clientName},\n\nYour appointment request with ALMORAD AMC was saved. Our team will review the meeting details.\n\nReference: ${input.reference}\nService: ${input.serviceTitle}\nDate & Time: ${formattedTime} (${input.timezone})\nLocation: ${locationText}\n${input.directionsUrl ? `Directions: ${input.directionsUrl}\n` : ''}\nManage your booking:\n${input.managementUrl}\n\nALMORAD AMC Team\nhttps://almorad-amc.com`;

  return {subject, text, html};
}

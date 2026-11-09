import {escapeHtml, renderEmailLayout} from './email-layout.js';
import type {MeetingType, EmailContent} from './booking-confirmation.template.js';

export interface BookingRescheduledTemplateInput {
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

export function renderBookingRescheduledEmail(input: BookingRescheduledTemplateInput): EmailContent {
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
    ? `تم تحديث موعد استشارتك مع المراد AMC - ${input.reference}`
    : `Your ALMORAD AMC Consultation has been Rescheduled - ${input.reference}`;

  const heading = isAr ? 'تم تحديث موعدك بنجاح' : 'Consultation Rescheduled';
  const preheader = isAr
    ? `موعدك الجديد: ${input.serviceTitle} في ${formattedTime}`
    : `Your new appointment for ${input.serviceTitle} is confirmed for ${formattedTime}.`;

  const detailsRow = (label: string, value: string) => `
    <tr>
      <td style="padding: 8px 12px 8px 0; font-weight: 700; color: #7A5F28; vertical-align: top; white-space: nowrap;">${escapeHtml(label)}</td>
      <td style="padding: 8px 0; color: #14120E;">${value}</td>
    </tr>`;

  const bodyHtml = `
    <p style="margin: 0 0 16px;">
      ${isAr ? `مرحباً <strong>${escapeHtml(input.clientName)}</strong>، نؤكد لك أن موعد استشارتك مع استوديو المراد AMC قد تم تحديثه إلى التوقيت الجديد أدناه.` : `Hello <strong>${escapeHtml(input.clientName)}</strong>, this confirms that your consultation with ALMORAD AMC has been successfully rescheduled to the updated time below.`}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #FAF7F0; border-radius: 12px; padding: 12px;">
      ${detailsRow(isAr ? 'رقم المرجع' : 'Reference', `<code>${escapeHtml(input.reference)}</code>`)}
      ${detailsRow(isAr ? 'الخدمة' : 'Service', escapeHtml(input.serviceTitle))}
      ${detailsRow(isAr ? 'الموعد الجديد' : 'New Schedule', `<strong>${escapeHtml(formattedTime)} (${escapeHtml(input.timezone)})</strong>`)}
      ${detailsRow(isAr ? 'المكان' : 'Location', escapeHtml(locationText))}
      ${input.directionsUrl ? detailsRow(isAr ? 'الاتجاهات' : 'Directions', `<a href="${escapeHtml(input.directionsUrl)}" style="color: #BE9D5B; text-decoration: underline;">${isAr ? 'عرض على خرائط جوجل' : 'View on Google Maps'}</a>`) : ''}
    </table>
    <p style="margin: 16px 0 0; font-size: 14px; color: #625D52;">
      ${isAr ? 'تم إرفاق ملف تقويم (.ics) محدث لتعديل الموعد على تقويمك.' : 'An updated calendar invite (.ics) is attached to update this on your calendar.'}
    </p>
  `;

  const footerNote = isAr
    ? 'يمكنك إدارة أو تعديل الموعد في أي وقت من خلال زر إدارة الموعد.'
    : 'You can review or manage this appointment at any time using the button above.';

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
    ? `مرحباً ${input.clientName}،\n\nتم تحديث موعد استشارتك مع استوديو المراد AMC بنجاح.\n\nرقم المرجع: ${input.reference}\nالخدمة: ${input.serviceTitle}\nالموعد الجديد: ${formattedTime} (${input.timezone})\nالمكان: ${locationText}\n${input.directionsUrl ? `الاتجاهات: ${input.directionsUrl}\n` : ''}\nإدارة الموعد:\n${input.managementUrl}\n\nفريق المراد AMC\nhttps://almorad-amc.com`
    : `Hello ${input.clientName},\n\nYour consultation with ALMORAD AMC has been rescheduled.\n\nReference: ${input.reference}\nService: ${input.serviceTitle}\nNew Date & Time: ${formattedTime} (${input.timezone})\nLocation: ${locationText}\n${input.directionsUrl ? `Directions: ${input.directionsUrl}\n` : ''}\nManage your booking:\n${input.managementUrl}\n\nALMORAD AMC Team\nhttps://almorad-amc.com`;

  return {subject, text, html};
}

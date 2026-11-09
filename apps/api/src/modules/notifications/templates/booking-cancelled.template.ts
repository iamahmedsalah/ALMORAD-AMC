import {escapeHtml, renderEmailLayout} from './email-layout.js';
import type {EmailContent} from './booking-confirmation.template.js';

export interface BookingCancelledTemplateInput {
  reference: string;
  clientName: string;
  serviceTitle: string;
  locale: string;
  cancelledAt: Date;
  timezone: string;
  reason?: string | null;
}

export function renderBookingCancelledEmail(input: BookingCancelledTemplateInput): EmailContent {
  const isAr = input.locale === 'ar';

  const subject = isAr
    ? `إلغاء موعد استشارتك مع المراد AMC - ${input.reference}`
    : `Your ALMORAD AMC Consultation has been Cancelled - ${input.reference}`;

  const heading = isAr ? 'تم إلغاء الموعد' : 'Consultation Cancelled';
  const preheader = isAr
    ? `تم تأكيد إلغاء موعد ${input.serviceTitle} (${input.reference}).`
    : `Your booking for ${input.serviceTitle} (${input.reference}) has been cancelled.`;

  const detailsRow = (label: string, value: string) => `
    <tr>
      <td style="padding: 8px 12px 8px 0; font-weight: 700; color: #7A5F28; vertical-align: top; white-space: nowrap;">${escapeHtml(label)}</td>
      <td style="padding: 8px 0; color: #14120E;">${value}</td>
    </tr>`;

  const bodyHtml = `
    <p style="margin: 0 0 16px;">
      ${isAr ? `مرحباً <strong>${escapeHtml(input.clientName)}</strong>، نؤكد لك أنه قد تم إلغاء موعد استشارتك لدى استوديو المراد AMC.` : `Hello <strong>${escapeHtml(input.clientName)}</strong>, this email confirms that your consultation appointment with ALMORAD AMC has been cancelled.`}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #FAF7F0; border-radius: 12px; padding: 12px;">
      ${detailsRow(isAr ? 'رقم المرجع' : 'Reference', `<code>${escapeHtml(input.reference)}</code>`)}
      ${detailsRow(isAr ? 'الخدمة' : 'Service', escapeHtml(input.serviceTitle))}
      ${input.reason ? detailsRow(isAr ? 'السبب' : 'Reason', escapeHtml(input.reason)) : ''}
    </table>
    <p style="margin: 16px 0 0; font-size: 14px; color: #625D52;">
      ${isAr ? 'إذا كنت ترغب في تحديد موعد جديد في أي وقت، يمكنك دائماً زيارة صفحة الحجز لدينا.' : 'If you would like to book a new consultation at a later time, you are welcome to visit our booking page.'}
    </p>
  `;

  const footerNote = isAr
    ? 'وصلتك هذه الرسالة لتأكيد إلغاء الموعد المسجل على almorad-amc.com.'
    : 'You received this notification to confirm the cancellation of your scheduled booking on almorad-amc.com.';

  const html = renderEmailLayout({
    locale: input.locale,
    heading,
    preheader,
    bodyHtml,
    footerNote
  });

  const text = isAr
    ? `مرحباً ${input.clientName}،\n\nتم تأكيد إلغاء موعد استشارتك لدى استوديو المراد AMC.\n\nرقم المرجع: ${input.reference}\nالخدمة: ${input.serviceTitle}\n${input.reason ? `السبب: ${input.reason}\n` : ''}\nلحجز موعد جديد:\nhttps://almorad-amc.com/ar/booking\n\nفريق المراد AMC\nhttps://almorad-amc.com`
    : `Hello ${input.clientName},\n\nYour consultation appointment with ALMORAD AMC has been cancelled.\n\nReference: ${input.reference}\nService: ${input.serviceTitle}\n${input.reason ? `Reason: ${input.reason}\n` : ''}\nTo book a new appointment:\nhttps://almorad-amc.com/en/booking\n\nALMORAD AMC Team\nhttps://almorad-amc.com`;

  return {subject, text, html};
}

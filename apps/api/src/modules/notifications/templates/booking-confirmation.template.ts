import {meetingUrlInput, officeLocation} from '@amc/shared';
import {
  escapeHtml,
  renderEmailDetailGrid,
  renderEmailLayout,
  type EmailDetailItem
} from './email-layout.js';

export type MeetingType = 'ONLINE' | 'IN_PERSON';

export interface BookingConfirmationTemplateInput {
  managerName?: string;
  reference: string;
  clientName: string;
  clientTitle?: string | null;
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
  email?: string;
  phone?: string | null;
  company?: string | null;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function renderBookingConfirmationEmail(input: BookingConfirmationTemplateInput): EmailContent {
  const isAr = input.locale === 'ar';
  const loc = isAr ? 'ar' : 'en';

  const timeFormatter = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
    timeZone: input.timezone,
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const formattedTime =
    timeFormatter.format(input.startsAt) +
    ' – ' +
    new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
      timeZone: input.timezone,
      timeStyle: 'short'
    }).format(input.endsAt);

  const verifiedOfficeAddress =
    input.officeAddress?.trim() ||
    `${officeLocation.address[loc]} · ${officeLocation.locality[loc]}`;
  const verifiedDirectionsUrl = input.directionsUrl?.trim() || officeLocation.directionsUrl;
  const safeMeetUrl = meetingUrlInput.safeParse(input.meetingUrl).success ? input.meetingUrl! : null;

  let subject = isAr
    ? `استلام طلب موعدك مع المراد AMC - ${input.reference}`
    : `Your ALMORAD AMC appointment request - ${input.reference}`;

  let heading = isAr ? 'تم استلام طلب موعدك' : 'Appointment request received';
  const confirmed = input.status === 'CONFIRMED';
  if (confirmed) {
    heading = isAr ? 'تم تأكيد موعدك' : 'Appointment confirmed';
    subject = `${heading} | ALMORAD AMC - ${input.reference}`;
  }

  const preheader = isAr
    ? `تم تأكيد تفاصيل موعدك: ${input.serviceTitle} في ${formattedTime}`
    : `Your appointment for ${input.serviceTitle} on ${formattedTime} is ready.`;

  const items: EmailDetailItem[] = [
    {
      icon: 'reference',
      label: isAr ? 'رقم المرجع' : 'Reference',
      valueHtml: `<code dir="ltr" style="unicode-bidi:isolate;font-family:monospace;font-size:13px;font-weight:700;">${escapeHtml(input.reference)}</code>`
    },
    {
      icon: 'layers',
      label: isAr ? 'الخدمة' : 'Service',
      valueHtml: escapeHtml(input.serviceTitle)
    },
    {
      icon: input.meetingType === 'ONLINE' ? 'video' : 'mapPin',
      label: isAr ? 'نوع الاجتماع' : 'Format',
      valueHtml: escapeHtml(
        input.meetingType === 'ONLINE'
          ? isAr
            ? 'عبر الإنترنت'
            : 'Online'
          : isAr
            ? 'في المكتب'
            : 'In person'
      )
    },
    ...(input.managerName
      ? [
          {
            icon: 'users' as const,
            label: isAr ? 'مع' : 'Meeting with',
            valueHtml: escapeHtml(input.managerName)
          }
        ]
      : []),
    ...(input.company
      ? [
          {
            icon: 'building' as const,
            label: isAr ? 'الشركة' : 'Company',
            valueHtml: escapeHtml(input.company)
          }
        ]
      : []),
    ...(input.clientTitle
      ? [
          {
            icon: 'briefcase' as const,
            label: isAr ? 'المسمى الوظيفي' : 'Job title',
            valueHtml: escapeHtml(input.clientTitle)
          }
        ]
      : []),
    ...(input.email
      ? [
          {
            icon: 'mail' as const,
            label: isAr ? 'البريد الإلكتروني' : 'Email',
            valueHtml: `<span dir="ltr" style="unicode-bidi:isolate;">${escapeHtml(input.email)}</span>`
          }
        ]
      : []),
    ...(input.phone
      ? [
          {
            icon: 'phone' as const,
            label: isAr ? 'الهاتف' : 'Phone',
            valueHtml: `<span dir="ltr" style="unicode-bidi:isolate;">${escapeHtml(input.phone)}</span>`
          }
        ]
      : []),
    {
      icon: 'calendar',
      label: isAr ? 'الموعد' : 'Schedule',
      valueHtml: escapeHtml(formattedTime)
    },
    {
      icon: 'globe',
      label: isAr ? 'المنطقة الزمنية' : 'Timezone',
      valueHtml: `<span dir="ltr" style="unicode-bidi:isolate;">${escapeHtml(input.timezone)}</span>`
    }
  ];

  if (input.meetingType === 'ONLINE') {
    items.push({
      icon: 'video',
      label: isAr ? 'رابط الاجتماع' : 'Meeting link',
      fullWidth: true,
      valueHtml: safeMeetUrl
        ? `<a href="${escapeHtml(safeMeetUrl)}" dir="ltr" style="color:#0B1F44;text-decoration:underline;word-break:break-all;">${escapeHtml(safeMeetUrl)}</a><div style="margin-top:10px;"><a href="${escapeHtml(safeMeetUrl)}" style="display:inline-block;padding:9px 18px;background:#0B1F44;color:#FBF1E6;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;">${isAr ? 'الانضمام عبر Google Meet' : 'Join Google Meet'}</a></div>`
        : escapeHtml(
            isAr
              ? 'عبر الإنترنت (سيتم إرسال رابط الاجتماع فور تجهيزه)'
              : 'Online meeting (Video link will be shared once ready)'
          )
    });
  }

  items.push({
    icon: 'mapPin',
    label: isAr ? 'عنوان المكتب' : 'Office location',
    fullWidth: true,
    valueHtml: `<span>${escapeHtml(verifiedOfficeAddress)}</span>${
      verifiedDirectionsUrl
        ? `<div style="margin-top:8px;"><a href="${escapeHtml(verifiedDirectionsUrl)}" style="color:#A74200;font-weight:700;text-decoration:underline;">${isAr ? 'عرض الموقع والاتجاهات على خرائط Google ↗' : 'View location & directions on Google Maps ↗'}</a></div>`
        : ''
    }`
  });

  const introText = confirmed
    ? isAr
      ? `مرحباً <strong>${escapeHtml(input.clientName)}</strong>، تم تأكيد موعدك مع استوديو المراد AMC. ستجد جميع تفاصيل الاجتماع أدناه.`
      : `Hello <strong>${escapeHtml(input.clientName)}</strong>, your appointment with ALMORAD AMC is confirmed. All meeting details are below.`
    : isAr
      ? `مرحباً <strong>${escapeHtml(input.clientName)}</strong>، تم حفظ طلب موعدك مع استوديو المراد AMC. سيراجع الفريق تفاصيل الاجتماع.`
      : `Hello <strong>${escapeHtml(input.clientName)}</strong>, your appointment request with ALMORAD AMC has been saved. Our team will review the meeting details.`;

  const bodyHtml = `
    <p style="margin:0 0 16px;">${introText}</p>
    ${renderEmailDetailGrid(items, input.locale)}
    <p style="margin:14px 0 0;font-size:13px;color:#465676;">
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

  const textLines = isAr
    ? [
        `مرحباً ${input.clientName}،`,
        '',
        confirmed ? 'تم تأكيد موعدك مع استوديو المراد AMC.' : 'تم حفظ طلب موعدك مع استوديو المراد AMC.',
        '',
        `رقم المرجع: ${input.reference}`,
        ...(input.company ? [`الشركة: ${input.company}`] : []),
        ...(input.clientTitle ? [`المسمى الوظيفي: ${input.clientTitle}`] : []),
        `الخدمة: ${input.serviceTitle}`,
        `نوع الاجتماع: ${input.meetingType === 'ONLINE' ? 'عبر الإنترنت' : 'في المكتب'}`,
        ...(input.managerName ? [`مع: ${input.managerName}`] : []),
        `الموعد: ${formattedTime} (${input.timezone})`,
        ...(input.meetingType === 'ONLINE'
          ? [`رابط الاجتماع: ${safeMeetUrl || 'سيتم إرسال الرابط فور تجهيزه'}`]
          : []),
        `عنوان المكتب: ${verifiedOfficeAddress}`,
        `اتجاهات الوصول: ${verifiedDirectionsUrl}`,
        '',
        'إدارة موعدك:',
        input.managementUrl,
        '',
        'فريق المراد AMC',
        'https://almorad-amc.com'
      ]
    : [
        `Hello ${input.clientName},`,
        '',
        confirmed
          ? 'Your appointment with ALMORAD AMC is confirmed.'
          : 'Your appointment request with ALMORAD AMC was saved. Our team will review the meeting details.',
        '',
        `Reference: ${input.reference}`,
        ...(input.company ? [`Company: ${input.company}`] : []),
        ...(input.clientTitle ? [`Job title: ${input.clientTitle}`] : []),
        `Service: ${input.serviceTitle}`,
        `Format: ${input.meetingType === 'ONLINE' ? 'Online' : 'In person'}`,
        ...(input.managerName ? [`Meeting with: ${input.managerName}`] : []),
        `Date & Time: ${formattedTime} (${input.timezone})`,
        ...(input.meetingType === 'ONLINE'
          ? [`Meeting link: ${safeMeetUrl || 'Online Meeting (Video link will be provided)'}`]
          : []),
        `Office location: ${verifiedOfficeAddress}`,
        `Directions: ${verifiedDirectionsUrl}`,
        '',
        'Manage your booking:',
        input.managementUrl,
        '',
        'ALMORAD AMC Team',
        'https://almorad-amc.com'
      ];

  return {subject, text: textLines.join('\n'), html};
}

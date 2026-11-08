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

  if (isAr) {
    const subject = `تأكيد حجز موعدك مع المراد AMC - ${input.reference}`;
    const text = `مرحباً ${input.clientName}،

تم تأكيد حجز موعدك بنجاح لدى المراد AMC.

رقم المرجع: ${input.reference}
الخدمة: ${input.serviceTitle}
الموعد: ${formattedTime} (${input.timezone})
المكان: ${locationText}
${input.directionsUrl ? `اتجاهات الوصول: ${input.directionsUrl}\n` : ''}
لإدارة موعدك أو طلب إعادة جدولته:
${input.managementUrl}

فريق المراد AMC
https://almorad-amc.com`;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #0B0A08; font-family: 'Cairo', Arial, sans-serif; color: #F5F1E7;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #14120E; border: 1px solid #7A5F28; border-radius: 8px; padding: 32px; box-sizing: border-box;">
    <h1 style="color: #BE9D5B; margin-top: 0; font-size: 24px; border-bottom: 1px solid rgba(190, 157, 91, 0.3); padding-bottom: 16px;">المراد AMC</h1>
    <h2 style="font-size: 20px; color: #F5F1E7; margin-bottom: 8px;">تم تأكيد حجزك بنجاح</h2>
    <p style="color: #CFCBC0; font-size: 16px; line-height: 1.6;">مرحباً <strong>${input.clientName}</strong>، يسعدنا تأكيد موعدك معنا لمناقشة أهداف نمو أعمالك وعلامتك التجارية.</p>
    
    <div style="background-color: #0B0A08; border-radius: 6px; padding: 20px; margin: 24px 0; border: 1px solid rgba(190, 157, 91, 0.2);">
      <p style="margin: 6px 0; color: #BE9D5B;"><strong>رقم المرجع:</strong> <span style="color: #F5F1E7;">${input.reference}</span></p>
      <p style="margin: 6px 0; color: #BE9D5B;"><strong>الخدمة:</strong> <span style="color: #F5F1E7;">${input.serviceTitle}</span></p>
      <p style="margin: 6px 0; color: #BE9D5B;"><strong>الموعد:</strong> <span style="color: #F5F1E7;">${formattedTime}</span></p>
      <p style="margin: 6px 0; color: #BE9D5B;"><strong>المكان:</strong> <span style="color: #F5F1E7;">${locationText}</span></p>
      ${input.directionsUrl ? `<p style="margin: 6px 0;"><a href="${input.directionsUrl}" style="color: #D8BE86; text-decoration: underline;">عرض اتجاهات الوصول على خرائط Google</a></p>` : ''}
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${input.managementUrl}" style="background-color: #BE9D5B; color: #0B0A08; text-decoration: none; font-weight: bold; padding: 12px 28px; border-radius: 4px; display: inline-block;">إدارة الموعد أو تعديله</a>
    </div>

    <p style="color: #A6A39B; font-size: 13px; line-height: 1.5; border-top: 1px solid rgba(207, 203, 192, 0.1); padding-top: 20px; margin-top: 32px;">
      مرفق مع هذه الرسالة ملف التقويم (.ics) لإضافة الموعد إلى جدولك مباشرة.<br>
      إذا كنت بحاجة إلى المساعدة، يمكنك التواصل معنا عبر موقعنا.
    </p>
  </div>
</body>
</html>`;

    return {subject, text, html};
  }

  // English Template
  const subject = `Booking Confirmation: ALMORAD AMC - ${input.reference}`;
  const text = `Hello ${input.clientName},

Your consultation with ALMORAD AMC has been successfully confirmed.

Reference: ${input.reference}
Service: ${input.serviceTitle}
Date & Time: ${formattedTime} (${input.timezone})
Location: ${locationText}
${input.directionsUrl ? `Directions: ${input.directionsUrl}\n` : ''}
To manage or reschedule your appointment:
${input.managementUrl}

ALMORAD AMC Growth & Brand Studio
https://almorad-amc.com`;

  const html = `<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #0B0A08; font-family: 'IBM Plex Sans', Arial, sans-serif; color: #F5F1E7;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #14120E; border: 1px solid #7A5F28; border-radius: 8px; padding: 32px; box-sizing: border-box;">
    <h1 style="color: #BE9D5B; margin-top: 0; font-size: 24px; border-bottom: 1px solid rgba(190, 157, 91, 0.3); padding-bottom: 16px;">ALMORAD AMC</h1>
    <h2 style="font-size: 20px; color: #F5F1E7; margin-bottom: 8px;">Appointment Confirmed</h2>
    <p style="color: #CFCBC0; font-size: 16px; line-height: 1.6;">Hello <strong>${input.clientName}</strong>, we look forward to discussing your growth and brand objectives.</p>
    
    <div style="background-color: #0B0A08; border-radius: 6px; padding: 20px; margin: 24px 0; border: 1px solid rgba(190, 157, 91, 0.2);">
      <p style="margin: 6px 0; color: #BE9D5B;"><strong>Reference:</strong> <span style="color: #F5F1E7;">${input.reference}</span></p>
      <p style="margin: 6px 0; color: #BE9D5B;"><strong>Service:</strong> <span style="color: #F5F1E7;">${input.serviceTitle}</span></p>
      <p style="margin: 6px 0; color: #BE9D5B;"><strong>Date & Time:</strong> <span style="color: #F5F1E7;">${formattedTime}</span></p>
      <p style="margin: 6px 0; color: #BE9D5B;"><strong>Location:</strong> <span style="color: #F5F1E7;">${locationText}</span></p>
      ${input.directionsUrl ? `<p style="margin: 6px 0;"><a href="${input.directionsUrl}" style="color: #D8BE86; text-decoration: underline;">View directions on Google Maps</a></p>` : ''}
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${input.managementUrl}" style="background-color: #BE9D5B; color: #0B0A08; text-decoration: none; font-weight: bold; padding: 12px 28px; border-radius: 4px; display: inline-block;">Manage Appointment</a>
    </div>

    <p style="color: #A6A39B; font-size: 13px; line-height: 1.5; border-top: 1px solid rgba(207, 203, 192, 0.1); padding-top: 20px; margin-top: 32px;">
      A calendar (.ics) file is attached to add this meeting to your calendar.<br>
      If you need any adjustments, please use the management link above.
    </p>
  </div>
</body>
</html>`;

  return {subject, text, html};
}

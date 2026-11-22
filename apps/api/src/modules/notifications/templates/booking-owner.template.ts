import {meetingUrlInput, officeLocation} from '@amc/shared';
import {
  escapeHtml,
  renderEmailDetailGrid,
  renderEmailLayout,
  singleLine,
  type EmailDetailItem
} from './email-layout.js';
import type {EmailContent} from './booking-confirmation.template.js';

interface BookingOwnerInput {
  reference: string;
  clientName: string;
  clientTitle?: string | null;
  email: string;
  phone: string | null;
  serviceTitle: string;
  meetingType: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  staffUrl: string;
  eventKind?: string;
  notes?: string | null;
  company?: string | null;
  officeAddress?: string | null;
  directionsUrl?: string | null;
  meetingUrl?: string | null;
  managerName?: string;
  meetAction?: string;
}

/** Internal alert; staff authentication is required instead of a client access token. */
export function renderBookingOwnerEmail(input: BookingOwnerInput): EmailContent {
  const title =
    input.meetAction === 'REMOVE'
      ? 'Appointment meeting link removed'
      : input.meetAction === 'REGENERATE'
        ? 'Appointment meeting link replaced'
        : input.eventKind && input.eventKind !== 'BOOKING_CREATED'
          ? 'Appointment update: ' + input.eventKind.replaceAll('_', ' ').toLowerCase()
          : 'New appointment request';

  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone: input.timezone,
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const verifiedOfficeAddress =
    input.officeAddress?.trim() || `${officeLocation.address.en} · ${officeLocation.locality.en}`;
  const verifiedDirectionsUrl = input.directionsUrl?.trim() || officeLocation.directionsUrl;
  const safeMeetUrl = meetingUrlInput.safeParse(input.meetingUrl).success ? input.meetingUrl! : null;
  const cleanPhone = input.phone?.replace(/[^\d+]/g, '');

  const items: EmailDetailItem[] = [
    {
      icon: 'reference',
      label: 'Reference',
      valueHtml: `<code dir="ltr" style="font-family:monospace;font-size:13px;font-weight:700;">${escapeHtml(input.reference)}</code>`
    },
    {
      icon: 'user',
      label: 'Client',
      valueHtml: escapeHtml(singleLine(input.clientName))
    },
    {
      icon: 'building',
      label: 'Company',
      valueHtml: escapeHtml(input.company || 'Not supplied')
    },
    {
      icon: 'briefcase',
      label: 'Job title',
      valueHtml: escapeHtml(input.clientTitle || 'Not supplied')
    },
    {
      icon: 'mail',
      label: 'Email',
      valueHtml: `<a href="mailto:${escapeHtml(input.email)}" dir="ltr" style="color:#0B1F44;text-decoration:underline;">${escapeHtml(input.email)}</a>`
    },
    {
      icon: 'phone',
      label: 'Phone',
      valueHtml:
        input.phone && cleanPhone
          ? `<a href="tel:${escapeHtml(cleanPhone)}" dir="ltr" style="color:#0B1F44;text-decoration:underline;">${escapeHtml(input.phone)}</a>`
          : escapeHtml(input.phone || 'Not supplied')
    },
    {
      icon: 'layers',
      label: 'Service',
      valueHtml: escapeHtml(input.serviceTitle)
    },
    {
      icon: input.meetingType === 'ONLINE' ? 'video' : 'mapPin',
      label: 'Format',
      valueHtml: escapeHtml(input.meetingType === 'ONLINE' ? 'Online' : 'In person')
    },
    ...(input.managerName
      ? [
          {
            icon: 'users' as const,
            label: 'Attending manager(s)',
            valueHtml: escapeHtml(input.managerName)
          }
        ]
      : []),
    {
      icon: 'globe',
      label: 'Timezone',
      valueHtml: `<span dir="ltr">${escapeHtml(input.timezone)}</span>`
    },
    {
      icon: 'calendar',
      label: 'Starts',
      valueHtml: escapeHtml(format.format(input.startsAt))
    },
    {
      icon: 'clock',
      label: 'Ends',
      valueHtml: escapeHtml(format.format(input.endsAt))
    }
  ];

  if (input.meetingType === 'ONLINE') {
    items.push({
      icon: 'video',
      label: 'Meeting link',
      fullWidth: true,
      valueHtml: safeMeetUrl
        ? `<a href="${escapeHtml(safeMeetUrl)}" dir="ltr" style="color:#0B1F44;text-decoration:underline;word-break:break-all;">${escapeHtml(safeMeetUrl)}</a><div style="margin-top:10px;"><a href="${escapeHtml(safeMeetUrl)}" style="display:inline-block;padding:9px 18px;background:#0B1F44;color:#FBF1E6;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;">Join Google Meet</a></div>`
        : 'Online (link pending)'
    });
  }

  items.push({
    icon: 'mapPin',
    label: 'Office location',
    fullWidth: true,
    valueHtml: `<span>${escapeHtml(verifiedOfficeAddress)}</span>${
      verifiedDirectionsUrl
        ? `<div style="margin-top:8px;"><a href="${escapeHtml(verifiedDirectionsUrl)}" style="color:#A74200;font-weight:700;text-decoration:underline;">View on Google Maps ↗</a></div>`
        : ''
    }`
  });

  items.push({
    icon: 'message',
    label: 'Message',
    fullWidth: true,
    valueHtml: `<span style="white-space:pre-wrap;">${escapeHtml(input.notes || 'No meeting notes supplied')}</span>`
  });

  const textFields: [string, string][] = [
    ['Reference', input.reference],
    ['Client', singleLine(input.clientName)],
    ['Job title', input.clientTitle || 'Not supplied'],
    ['Company', input.company || 'Not supplied'],
    ['Email', input.email],
    ['Phone', input.phone || 'Not supplied'],
    ['Service', input.serviceTitle],
    ['Format', input.meetingType === 'ONLINE' ? 'Online' : 'In person'],
    ...(input.managerName ? ([['Attending manager(s)', input.managerName]] as [string, string][]) : []),
    ['Starts', format.format(input.startsAt)],
    ['Ends', format.format(input.endsAt)],
    ['Timezone', input.timezone],
    ...(input.meetingType === 'ONLINE'
      ? ([['Meeting link', safeMeetUrl || 'Online (link pending)']] as [string, string][])
      : []),
    ['Office location', verifiedOfficeAddress],
    ['Directions', verifiedDirectionsUrl],
    ['Message', input.notes || 'No meeting notes supplied']
  ];

  const bodyHtml = `${renderEmailDetailGrid(items, 'en')}<p style="margin:12px 0 0;font-size:14px;color:#465676;">Review the appointment in the staff calendar.</p>`;

  return {
    subject: `${title} — ${singleLine(input.reference)}`,
    text:
      title +
      '\n\n' +
      textFields.map(([label, value]) => `${label}: ${value}`).join('\n') +
      `\n\nStaff calendar: ${input.staffUrl}`,
    html: renderEmailLayout({
      locale: 'en',
      heading: title,
      bodyHtml,
      cta: {label: 'Open staff calendar', url: input.staffUrl},
      footerNote: 'Reply to contact the client. Staff review and authentication are required.'
    })
  };
}

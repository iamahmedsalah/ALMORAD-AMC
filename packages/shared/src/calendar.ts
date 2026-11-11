export interface CalendarEventInput {
  id: string;
  reference: string;
  startsAt: string | Date;
  endsAt: string | Date;
  summary?: string;
  description?: string;
  location?: string;
  status?: 'CONFIRMED' | 'CANCELLED';
  sequence?: number;
}

export function generateIcs(event: CalendarEventInput): string {
  const escape = (v: string) => v.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,').replaceAll('\r', '');
  const stamp = (v: string | Date) => new Date(v).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ALMORAD AMC//Appointments//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@almorad-amc.com`,
    `SEQUENCE:${Math.max(0, Math.floor(event.sequence || 0))}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(event.endsAt)}`,
    `SUMMARY:${escape(event.summary || 'ALMORAD AMC - ' + event.reference)}`,
    ...(event.description ? [`DESCRIPTION:${escape(event.description)}`] : []),
    ...(event.location ? [`LOCATION:${escape(event.location)}`] : []),
    `STATUS:${event.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
    ''
  ];
  return lines.join('\r\n');
}

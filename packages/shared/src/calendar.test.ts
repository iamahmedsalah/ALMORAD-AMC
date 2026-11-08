import {describe, it, expect} from 'vitest';
import {generateIcs} from './calendar.js';

describe('generateIcs', () => {
  it('generates valid RFC 5545 VEVENT string', () => {
    const ics = generateIcs({
      id: 'test-uuid-123',
      reference: 'AMC-ABCDEF',
      startsAt: '2026-11-10T10:00:00.000Z',
      endsAt: '2026-11-10T11:00:00.000Z',
      summary: 'ALMORAD AMC - Consultation',
      description: 'Strategic consultation meeting.',
      location: 'Online'
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('UID:test-uuid-123@almorad-amc.com');
    expect(ics).toContain('DTSTART:20261110T100000Z');
    expect(ics).toContain('DTEND:20261110T110000Z');
    expect(ics).toContain('SUMMARY:ALMORAD AMC - Consultation');
    expect(ics).toContain('DESCRIPTION:Strategic consultation meeting.');
    expect(ics).toContain('LOCATION:Online');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('END:VCALENDAR');
  });
});

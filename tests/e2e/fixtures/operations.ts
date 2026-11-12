import type { Page } from '@playwright/test';
import { services, type Analytics, type BookingDetail, type Schedule, type StaffRole } from '../../../packages/shared/src/index';

// Browser-only UI fixtures. No account, appointment or policy is written to a database.
export const schedule: Schedule = {
  version: 1, enabled: true, isDemo: true, timezone: 'Africa/Cairo', durationMinutes: 30,
  stepMinutes: 15, bufferBeforeMinutes: 5, bufferAfterMinutes: 5, leadMinutes: 0,
  lookaheadDays: 30, changeCutoffMinutes: 60, onlineEnabled: true, inPersonEnabled: false,
  officeAddressEn: null, officeAddressAr: null, directionsUrl: null,
  weeklyHours: Array.from({ length: 7 }, (_, i) => ({ day: i + 1, open: '09:00', close: '17:00' })),
  blackoutDates: [], serviceSlugs: services.map(s => s.slug),
};
const startsAt = new Date(Date.now() + 86400000).toISOString();
export const booking: BookingDetail = {
  id: '00000000-0000-4000-8000-000000000001', reference: 'UI-FIXTURE-001', serviceSlug: 'branding',
  meetingType: 'ONLINE', status: 'CONFIRMED', clientName: 'UI Fixture Client',
  email: 'ui-fixture@example.invalid', phone: null, company: null, notes: 'Synthetic UI fixture',
  locale: 'en', timezone: 'Africa/Cairo', startsAt,
  endsAt: new Date(new Date(startsAt).getTime() + 1800000).toISOString(),
  createdAt: new Date().toISOString(), version: 1, isDemo: true, changes: [], events: [], notifications: [],
};
const analytics: Analytics = {
  timezone: 'Africa/Cairo', isDemo: true, total: 6, today: 0, upcoming: 4, pendingChanges: 2,
  cancelled: 1, completed: 1, noShow: 0, cancellationRate: 1 / 6, noShowRate: 0,
  averageResolutionHours: null, byService: [{ key: 'branding', count: 6 }],
  byType: [{ key: 'ONLINE', count: 6 }], byStatus: [{ key: 'CONFIRMED', count: 4 }],
  trend: [{ date: new Date().toISOString().slice(0, 10), count: 6 }],
};

export async function mockOperations(page: Page, role: StaffRole = 'ADMIN') {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/', '');
    let json: unknown;
    if (path === 'staff/auth/session') json = { staff: { id: 'ui-fixture', email: 'ui-preview@example.invalid', role }, csrfToken: 'ui-fixture-csrf' };
    else if (path === 'booking/config') json = { enabled: true, schedule };
    else if (path === 'booking/slots') json = { timezone: 'Africa/Cairo', isDemo: true, slots: [{ startsAt: booking.startsAt, endsAt: booking.endsAt }] };
    else if (path === 'booking/recover'||path === 'booking/resend') json={accepted:true};
    else if (path === 'staff/appointments/assignees') json=[{id:'00000000-0000-4000-8000-000000000002',email:'manager@example.invalid'}];
    else if (path === 'booking/create') json = { booking, token: 'a'.repeat(64) };
    else if (path === 'booking/manage') json = { booking, schedule };
    else if (path === 'staff/appointments') json = { items: [booking], total: 1, page: 0, timezone: 'Africa/Cairo', isDemo: true };
    else if (path === 'staff/appointments/detail') json = { booking };
    else if (path === 'staff/inquiries') json = {items:[{id:'ui-inquiry-fixture',name:'UI Fixture Inquiry',email:'inquiry@example.invalid',phone:'+1 202 555 0100',message:'Synthetic browser inquiry, not a real lead.',createdAt:booking.createdAt,ownerEmailStatus:'FAILED',visitorEmailStatus:'SENT'}],total:1,page:0};
    else if (path === 'staff/booking-analytics') json = analytics;
    else if (path === 'staff/booking-settings') json = schedule;
    else if (path === 'staff/security/sessions') json = [{ id: 'ui-fixture-session', createdAt: booking.createdAt, expiresAt: booking.startsAt, current: true }];
    else if (path === 'staff/security/overview') json = { activeStaff: 2, activeSessions: 2, failedSignIns: 0 };
    else if (path === 'staff/security/audit') json = { items: [], total: 0, page: 0 };
    else { await route.fulfill({ status: 501, json: { message: 'Unmocked UI request' } }); return; }
    await route.fulfill({ json });
  });
}

export async function fixtureScreenshot(page: Page, path: string, fullPage = false) {
  await page.evaluate(() => {
    const label = document.createElement('div');
    label.textContent = 'UI PREVIEW · SYNTHETIC BROWSER FIXTURES';
    label.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:9999;background:#0B1F44;color:#FBF1E6;padding:8px 12px;border:1px solid #FBF1E6;border-radius:8px;font:11px system-ui;direction:ltr;pointer-events:none';
    document.body.appendChild(label);
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.screenshot({ path, fullPage });
}

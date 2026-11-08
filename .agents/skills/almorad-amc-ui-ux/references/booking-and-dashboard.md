# Booking UI and CEO/receptionist screens

Client wizard: select service → choose in-person/online → date/time from backend availability → enter name/email/phone/company/objective → review → confirmed result with reference, current date/time and in-office verified directions or authorized online link. Show slot collision message and refreshed options; prevent duplicate submits with idempotency. Keep entered data on recoverable validation errors. Show pending external sync clearly.

Client reschedule link: creates request ticket and keeps existing appointment confirmed; staff approves/declines/offers alternative; acceptance rechecks conflict transactionally. Never show requested time as confirmed prematurely. Email safe management links; avoid exposing token in analytics.

Receptionist: upcoming agenda, week/day calendar, appointment details, create/change/cancel, reschedule queue and notification status. CEO: same plus permissions, service/availability settings, audit log, analytics cards/charts based on real aggregates. Use accessible dense tables with row-action menus and clear loading/empty/error states.

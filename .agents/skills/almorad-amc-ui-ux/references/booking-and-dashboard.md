# Booking UI and admin/manager/receptionist screens

Client wizard: select service → choose in-person/online → date/time from backend availability → enter name/email/phone/company/objective → review → confirmed result with reference, current date/time and in-office verified directions or authorized online link. Show slot collision message and refreshed options; prevent duplicate submits with idempotency. Keep entered data on recoverable validation errors. Show pending external sync clearly.

Client reschedule link: creates request ticket and keeps existing appointment confirmed; staff approves/declines/offers alternative; acceptance rechecks conflict transactionally. Never show requested time as confirmed prematurely. Email safe management links; avoid exposing token in analytics.

Receptionist: upcoming agenda, week/day calendar, appointment details, create/change/cancel, reschedule queue and notification status. Admin: same plus all meeting CRUD, staff/settings, audit and analytics. Managers see and edit their assigned meetings. Use accessible dense tables with row-action menus and clear loading/empty/error states.


## Current staff contract (owner approved 12 November 2026)

Roles are ADMIN, MANAGER and RECEPTIONIST; CEO is a historical role migrated to ADMIN, not a current assignable role. Admin manages staff/settings and all appointment CRUD, including auditable deletion. Manager reads, creates and edits only their assigned appointments; enforce the assignment scope in API list/detail/create/action paths, not only navigation. Receptionist manages the shared agenda, assignments, inquiries and staff-reviewed change requests, without admin deletion or account/settings privileges. Never invent ownership for legacy unassigned meetings.

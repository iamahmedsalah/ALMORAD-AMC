# Booking, operations, change requests

## User journey

Service → `IN_PERSON` at verified office or `ONLINE` if enabled → available date/time → name, email, phone, company, notes and privacy acknowledgement → server validation and atomic confirmation → Resend confirmation and `.ics`, map directions for in-person or real authorized video link for online. Date/time in office IANA timezone; expose remote timezone when relevant. Frontend showing slot != reserved slot.

## Responsibilities

- Receptionist: create/edit/reschedule/cancel meetings, attendance statuses, review client change tickets, day/week agenda, see operational client information only.
- Admin: all appointment operations, staff/permissions, settings, integrations, audit and KPI reporting. Manager: create, read and edit only assigned meetings; no cross-manager records, assignments or admin deletion.
- Public clients require no account. Manage booking through expiring one-purpose secure links. A proposed new time is a request, not an automatic reschedule.

## Change-request workflow

`OPEN` → `UNDER_REVIEW` → `APPROVED` / `DECLINED` / `ALTERNATIVE_PROPOSED`; alternative can be accepted or withdrawn; optional `EXPIRED` and `WITHDRAWN`. Existing meeting remains unchanged and `CONFIRMED` until approval transaction is committed. Record every actor/transition in `booking_events` and `audit_logs`. `RESCHEDULED` is an event, not a terminal appointment status.

## Notifications

Atomic outbox and BullMQ; email via Resend, internal Slack via approved OAuth/channel, daily digest at configured local time, optional Google Calendar/Meet after authorization. No full personal notes, raw access tokens or private meeting URLs in public Slack channels or analytics. External transient failures retry without duplicating bookings. Make delivery health visible to staff.

## KPI definitions

Totals, today/upcoming, confirmed, cancellation/no-show, completed, open change tickets, service and meeting-type breakdown, trend, resolution time. Only show booking conversion when deduplicated starts and confirmations exist. Backend aggregates with specified business timezone; admin-only authorization.

## UX and test gates

Desktop/mobile, AR/EN, light/dark, validation errors, expired slots, timezone/DST, unavailable map, mail failure, duplicate click, 2+ concurrent clients claiming same slot, receptionist proposing alternatives and manager access denial tests.


## Current staff contract (owner approved 12 November 2026)

Roles are ADMIN, MANAGER and RECEPTIONIST; CEO is a historical role migrated to ADMIN, not a current assignable role. Admin manages staff/settings and all appointment CRUD, including auditable deletion. Manager reads, creates and edits only their assigned appointments; enforce the assignment scope in API list/detail/create/action paths, not only navigation. Receptionist manages the shared agenda, assignments, inquiries and staff-reviewed change requests, without admin deletion or account/settings privileges. Never invent ownership for legacy unassigned meetings.

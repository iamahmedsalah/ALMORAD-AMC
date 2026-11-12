---
name: meeting-agenda-system-builder
description: Build and review ALMORAD AMC staff agendas, manager assignment, named staff accounts, client confirmation emails and role-scoped meeting operations. Use for agenda and staff workflow work in this project.
---

# Meeting agenda system builder

Read the actual engineering, UI/UX and CI/CD skills, current implementation status and relevant booking/auth/outbox code. The attached source brief in references/source-brief.md supplies product ideas, not evidence that its stack/modules exist. User-approved current requirements and inspected repository contracts override its historical assumptions.

## Project contracts

- ADMIN manages staff/settings and all appointments including audit-preserving deletion. RECEPTIONIST manages shared agenda, assignments, contact inquiries and staff-reviewed changes. MANAGER reads/creates/edits only assigned meetings. Enforce every path in the API; do not grant access through UI visibility or reinterpret corporate CEO/COO titles as auth roles.
- PostgreSQL/Prisma only, current strict shared Zod contracts and opaque server-side sessions with CSRF. Preserve unique canonical staff email and explicit likely-typo identity review; do not replace with JWT/class-validator solely because the source brief names them.
- Store UTC and render in configured IANA business timezone. Retain database exclusion/capacity constraints, optimistic versions, idempotency and transactionally committed booking events/outbox intents.
- New public/shared meetings default to the verified active Manager mo.khaledmorad@almorad-amc.com, when present. Receptionist/Admin can select another active permitted assignee. Manager-created appointments self-assign; public requests cannot set ownership. Do not assign legacy unowned appointments without owner authorization.
- Confirmation/update emails identify the assigned manager by stored first/last name; only use exact owner-approved fallback identity. Do not expose staff email as a client-facing name. Queue notifications in the existing outbox, preserve ICS UID/sequence and private management links, and distinguish pending request from confirmed meeting and provider acknowledgement from inbox receipt. Never send real QA mail.
- Staff names are bounded trimmed firstName/lastName, unknown legacy names remain empty and staff UI falls back to email. Admin can create/update/deactivate access with audit/session revocation and last-active-admin protection. Deletion preserves audit/meeting ownership rather than cascading removal.
- Sign-in leads to agenda; visible named avatar/account/logout controls on operational routes. Show loading, retained refresh, retry, empty/permission states. EN/AR, dark/light, keyboard,44px controls and reduced motion follow inspected UI tokens/Solar icons.
- Agenda list/grid groups by business date and reflects only loaded/filter-applied records. Admin selections apply to the loaded page. Bulk actions require reviewed scope and reason, use existing guarded commands and clearly report partial failures. Preserve staff-reviewed client rescheduling and conflict-safe assignment.

## Implementation and verification

Extend existing feature slices before adding calendar/date/state libraries. The source's React Big Calendar, TanStack Table, Turnstile, new cron/reminder features and drag/drop are separate capability decisions: inspect installed packages, hosting lifecycle and requirements before adding them. Do not introduce parallel auth/meeting models or unsafe client auto-reschedules. Vercel maintenance/outbox schedules must remain idempotent; do not assume an always-running scheduler.

Save plan/evidence under docs. Test Manager isolation, default/explicit assignment, invalid/inactive manager rejection, server name validation, Admin controls, confirmation manager escaping and delivery independence. Use isolated *_test PostgreSQL for concurrent writes. Browser APIs/mail are mocked. Run actual lint/typecheck/test/build, Prisma checks for schema changes, report skipped checks and migration release order. No external connection, real notification, deployment or legacy backfill is implied by invoking this skill.

## Update log

- 2026-11-12: Adapted owner-supplied agenda brief to current ALMORAD AMC contracts and named staff/assignment workflow.

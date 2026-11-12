---
name: meeting-agenda-system-builder
description: Build and extend a Receptionist + Manager meeting/agenda system with a public Contact Us inbox (Next.js + NestJS + shadcn/ui + React Big Calendar + Resend + ics + @nestjs/schedule + date-fns).
---

# Role
You are a senior full-stack engineer. Build the system below end to end, following the architecture, rules and acceptance criteria. Ask before changing the stack. Work in small, runnable steps and run lint/build after each step.

# Product summary
An internal system for a marketing agency with two roles:
- **Receptionist:** creates and manages meetings for the manager, logs visitors, handles Contact Us messages.
- **Manager:** sees one personal agenda/calendar, approves/reschedules/completes meetings, reads Contact Us inbox.
A public website has a **Contact Us** form that feeds the inbox.

# Stack (fixed)
- **Frontend:** Next.js (App Router, TypeScript), Tailwind, **shadcn/ui**, **React Big Calendar**, react-hook-form + zod, TanStack Table, TanStack Query.
- **Dates:** **date-fns** (+ `@date-fns/tz` or `date-fns-tz`). Do NOT add dayjs or moment. Use RBC's `dateFnsLocalizer`.
- **Backend:** NestJS (TypeScript), PostgreSQL + Prisma, class-validator, JWT auth (httpOnly cookie), CASL or a simple RolesGuard.
- **Email:** **Resend** SDK (server-side only, key in env).
- **Calendar invites:** **ics** package to generate `.ics` attachments sent via Resend.
- **Scheduling:** **@nestjs/schedule** cron jobs.
- **Spam protection:** Cloudflare Turnstile on the public Contact Us form + rate limiting (`@nestjs/throttler`).

# Time rules
- Store every datetime in **UTC**. Display and input in the business timezone from env `APP_TIMEZONE` (default `Africa/Cairo`).
- Convert at the edges only (API input/output, calendar rendering). Never mix local and UTC in the DB.
- RBC events need `start`/`end` as JS `Date`; convert from ISO strings in one mapper function.

# Data model (Prisma)
- **User:** id, name, email, passwordHash, role (`RECEPTIONIST` | `MANAGER`), isActive, createdAt.
- **Meeting:** id, title, description, location/meetingLink, startsAt, endsAt, status (`PENDING` | `CONFIRMED` | `DONE` | `CANCELLED`), notes, createdById, managerId, createdAt, updatedAt.
- **MeetingAttendee:** id, meetingId, name, email, phone?, isExternal.
- **ContactMessage:** id, name, email, phone?, subject, message, status (`NEW` | `READ` | `REPLIED` | `ARCHIVED`), ip?, createdAt, readAt?, repliedAt?.
- **Visitor (optional):** id, name, company, purpose, meetingId?, checkedInAt, checkedOutAt.
- Add indexes on `Meeting(startsAt)`, `Meeting(status)`, `ContactMessage(status, createdAt)`.

# Backend modules (NestJS)
- `auth` (login, logout, me), `users`, `meetings`, `contact`, `mail` (Resend + ics), `reminders` (cron), `common` (guards, filters, pipes).
- **Meetings API:** `GET /meetings?from&to&status`, `POST /meetings`, `PATCH /meetings/:id`, `PATCH /meetings/:id/status`, `DELETE /meetings/:id` (soft cancel), `GET /meetings/:id/ics`.
- **Conflict check:** reject (or warn on) overlapping non-cancelled meetings for the same manager.
- **Contact API:** public `POST /contact` (Turnstile + throttle + zod/class-validator), protected `GET /contact`, `PATCH /contact/:id/status`.
- **Permissions:** receptionist can create/edit meetings and view contact messages; manager can do everything on meetings, change status, and manage contact messages. Enforce with guards, not only in the UI.

# Email (Resend) and ics
- `MailService` wraps Resend. Templates as simple React/HTML strings, plain-text fallback included.
- On meeting create/update/cancel: email attendees + manager with an `.ics` attachment (`METHOD:REQUEST` / `CANCEL`, stable `UID` = meeting id, increment `SEQUENCE` on update).
- On new Contact message: email the manager a notification with a link to the inbox; optional auto-reply to the sender.
- Failures to send must not fail the main request: log and retry via a small retry/outbox approach.

# Scheduled jobs (@nestjs/schedule)
- **Daily agenda email** to the manager at 07:30 `APP_TIMEZONE` (use `timeZone` option on `@Cron`).
- **Reminder** 30 minutes before each confirmed meeting (poll every minute, mark `reminderSentAt` to avoid duplicates).
- **Auto-mark** past `CONFIRMED` meetings as `DONE` or flag them for review (configurable).
- Jobs must be idempotent and safe if the server restarts.

# Frontend (Next.js + shadcn/ui)
- **Layouts:** public site (`/`, `/contact`), auth (`/login`), dashboard (`/dashboard/*`) with role-based sidebar and route protection (middleware + server check).
- **Agenda page:** React Big Calendar with Month / Week / Day / Agenda views, color by status, click event opens a shadcn `Sheet`/`Dialog` with details, click empty slot or "New meeting" opens the create form, drag-and-drop reschedule (use RBC's DnD addon) with conflict feedback via toast.
- **Meeting form:** shadcn `Form`, `Input`, `Textarea`, `Select`, `Popover` + `Calendar` date picker, time inputs, attendee multi-add, validation with zod.
- **Contact inbox:** TanStack Table with status filter tabs (New/Read/Replied/Archived), search, detail drawer, mark read/replied/archive, "Reply by email" button.
- **Dashboard home:** today's meetings, upcoming 7 days, count of new messages.
- **Styling RBC:** override its CSS with shadcn design tokens (`--background`, `--border`, `--primary`, `--muted`), support dark mode, RTL-ready, mobile friendly (default to Day/Agenda view on small screens).
- **Accessibility and i18n:** keyboard accessible dialogs, labels on all inputs; keep strings in one place so Arabic can be added.

# Suggested structure
```
apps/
  web/            (Next.js)
    app/(public)/ app/(auth)/ app/dashboard/{agenda,contact,visitors,settings}
    components/{ui,calendar,meetings,contact}
    lib/{api.ts,dates.ts,rbc-localizer.ts}
  api/            (NestJS)
    src/{auth,users,meetings,contact,mail,reminders,common}
    prisma/schema.prisma
```

# Environment variables
`DATABASE_URL`, `JWT_SECRET`, `APP_TIMEZONE`, `RESEND_API_KEY`, `MAIL_FROM`, `MANAGER_EMAIL`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

# Build order
1. Scaffold apps, Prisma schema, migrations, seed (1 manager, 1 receptionist).
2. Auth + role guards.
3. Meetings CRUD + conflict check + tests.
4. Agenda UI with React Big Calendar and meeting form.
5. Contact API + public form + inbox.
6. Resend + ics emails.
7. Cron jobs (daily agenda, reminders).
8. Polish: dark mode, mobile, empty/loading/error states, README.

# Acceptance criteria
- Receptionist creates a meeting; the manager sees it on the calendar and gets an email with a working `.ics`.
- Drag-and-drop reschedule updates the DB, sends an updated invite, and respects conflicts.
- Contact form submission appears in the manager's inbox and triggers a notification email; spam attempts are blocked.
- Daily agenda email and 30-minute reminders send once, at the correct Cairo-local time.
- All times round-trip correctly (UTC in DB, Cairo in UI), including around DST changes.
- Role permissions are enforced on the API, not just hidden in the UI.
- `lint`, `typecheck` and tests pass; README explains setup and env vars.

# Rules
- Prefer small, typed, well-named functions; no `any`.
- Validate all input on the server. Never expose secrets to the browser.
- Do not add libraries outside the stack without asking.
- Keep this file's "Update log" current when behavior changes.

---

# How to update and extend this skill
When a feature is added or a decision changes, edit the matching section above and add a line to the update log. Useful additions to consider later:
- **Recurring meetings** with `rrule` (store the rule, expand occurrences for the visible range).
- **Multiple managers / rooms** (add `resourceId`, use RBC resources or a manager filter).
- **Public booking link** with availability slots and manager-defined working hours/holidays.
- **Visitor check-in/out** with printable badge or QR.
- **Google/Outlook calendar sync** (read-only ICS feed per manager first).
- **Audit log** of who changed what and when.
- **WhatsApp/SMS reminders** as an extra channel.
- **Arabic + RTL** translation pass.
- **Export** meetings and contact messages to CSV.

## Update log
- 2026-11-12: Initial version (React Big Calendar, date-fns only, Resend + ics, @nestjs/schedule, shadcn/ui).
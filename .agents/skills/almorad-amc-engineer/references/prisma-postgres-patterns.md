# PostgreSQL + Prisma engineering rules

## Data model (illustrative, not applied)

Relational tables: `users`, `roles`/permissions, `staff_profiles`, `offices`, `rooms`, `services`, `service_translations`, `localized_pages`, `case_studies`, `availability_rules`, `availability_exceptions`, `bookings`, `booking_events`, `booking_change_requests`, `booking_action_tokens`, `calendar_connections`, `meeting_links`, `notification_outbox`, `notification_delivery_attempts`, `audit_logs`, `contact_inquiries`.

Use explicit FKs (`booking.staff_id`, `booking.office_id`, `booking.service_id`); map unique translated service slugs with `(locale, slug)` uniqueness or explicit entity/locale constraints. Staff identities and booking IDs use existing repo IDs. Index `(starts_at, status)`, staff/office/resource intervals, ticket status/createdAt and outbox status/retryAt based on real query patterns.

## Prevent concurrent double booking

The source of truth is a PostgreSQL exclusion constraint. Example **adapt and verify column names/statuses in migrations**:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings
  ADD CONSTRAINT no_overlapping_active_staff_bookings
  EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (staff_id IS NOT NULL AND status IN ('PENDING', 'CONFIRMED'));
```

This example guarantees nonoverlap per *staff member* only. If staff assignment is optional or in-office rooms have limited capacity, also reserve a concrete allocatable room/resource and enforce its own overlap constraint. If unassigned bookings are permitted, define and enforce office-wide capacity under concurrency (e.g. serialized capacity reservation); don't claim the staff constraint alone prevents all double-bookings. For buffers, enforce time slots via stored blocked intervals or robust constraint modeling, not only UI calculations. Prevent `ends_at <= starts_at` via CHECK. Cross-team meeting staff assignment is not part of initial MVP unless approved.

PostgreSQL `tstzrange`/exclusion constraints may need handwritten SQL migration because Prisma schema cannot represent every database feature; keep them in migration history and test against shadow/staging. Distinguish `prisma migrate dev` (development only) and `prisma migrate deploy` (deployment). Do not run `prisma db push` or `migrate reset` on production. Confirm exact Prisma release/driver adapter configuration before authoring code.

## Safe transactional flow

- Validate service, office mode, business hours, availability and time zone; accept idempotency key.
- In one `prisma.$transaction`: insert booking, create immutable event, create notification outbox entry. Conflict maps to 409; never promise confirmation before commit.
- Approval of client change ticket: lock/re-read relevant booking and ticket, check ticket status and proposed slot, atomically update booking, mark ticket approved, append old/new event and outbox records. Use version number and appropriate isolation/DB locks if needed.
- Process outbox after commit through worker; idempotency at provider boundaries, backoff, and dead-letter handling. Periodic reconcile unsent outbox entries if queue publish fails.
- Client management tokens must be unguessable, hashed at rest, scoped to action, expired, rotated/revoked; do not put tokens in analytics/referrer-exposed page URLs or server logs.

## Database quality

- Prefer prepared/parameterized Prisma queries. No unsanitized raw string SQL; if SQL is necessary, parameterize and review.
- For search use indexed columns appropriate to real workload, trigram/full-text only as justified, separate Arabic/English search strategy. Use `EXPLAIN` on staging and set statement timeouts.
- Cursor pagination for large lists, selective `select` projections, no `include` on unbounded relationships, prevent N+1, measure query duration.
- Migration plan must mention backup, additive schema, backfill, dual-read/write compatibility if needed, validation, deploy order, rollback/restore strategy and test results.

# Production contact/booking schema recovery review

Date: 10 November 2026. Status: prepared; production database changes not authorized or applied.

## Confirmed live state

Current production deployment: dpl_5sojnKQBvF94bbmD7Uz3cFvbQL4X (https://almorad-iapc2b5to-iamahmedsalahs-projects.vercel.app). Process /health is 200. Database readiness is 503. Its internal safe diagnostic is Prisma P2010, PostgreSQL SQLSTATE 42P01, category schema_missing. Public booking/config is JSON 500. A required relation is missing; exact missing relation, applied migration history and intended database/schema identity have not been inspected. Do not assume every migration is pending or run DDL against an unverified target.

The sender value supplied by the user was applied without surrounding quotes. The bootstrap module/listener deadlock was corrected, preserving guards and schema checks. Both forms still require the database schema before successful operation.

## Reviewed migration files

| Migration | SHA-256 |
| --- | --- |
| 202611050001_foundation | 8751d15f048db3f79bf83ec90e083a28b3e666c3967177a853bda530a9a25c05 |
| 20261106020000_staff_access | b09a211eefa30cf26aa78718dbddbf828f54e877e30711ad1c6ec3ae79a9da5e |
| 20261106040000_serverless_throttling | 1e472b4d94e097753401de777362ac8a0d6c63f493bd09dcdf4398bea6aad844 |
| 20261106060000_booking_operations | a5a1ccb1c19d59b7f22cef6315bce59ea1852ec6bcaf0e4ea780e89362582c28 |
| 20261107200000_booking_outbox_drain | 252d4363beb7cf70cd17290198184a104514b1b2582abd570dc94d70cac7f47c |
| 20261108190000_contact_inquiries | 0f93f6277584abb42a0ccaa3453973be7f1f8d84dae191ea2ef9529567b66acc |
| 20261108200000_contact_delivery | cb4e014c4cd147c1fb5a4974fc4443dbe597d46899185af7b58f85622559a598 |
| 20261109120000_outbox_hubspot_lifecycle | 1e93affecb4275497b78d4c2fac4aef1811824bdc9245fe9af3fbeb3bd5e0160 |

## Material effects and risks

- Foundation/staff access: staff identities, sessions and audit tables, roles, optional password hash. Does not provision passwords or staff accounts.
- Serverless throttling: shared rate-limit state table; required before protected public submissions can work.
- Booking operations: calendar/settings/services, appointments, client change requests, command idempotency, events and delivery outbox. Inserts the eleven existing service slugs, not appointments or business hours. Adds btree_gist extension, interval checks and database exclusion constraint for non-cancelled bookings. Verify extension permissions and existing overlaps before applying.
- Outbox delivery: retry/delivery columns and indexes.
- Contact: inquiry persistence and delivery tracking. The delivery migration marks existing inquiries SKIPPED for initial notifications/CRM so applying it does not blast old messages. This is a data update requiring backup and review.
- HubSpot lifecycle: booking CRM IDs/contact retry column. Replaces the single eventId unique index with eventId+kind uniqueness. This is an index replacement, not a table or record deletion.
- No DROP TABLE, TRUNCATE, DELETE, database reset or db push is proposed. Schema/index operations can still lock tables and fail on existing drift or constraints. Do not modify applied migration files or mark failed migrations resolved without investigation.

## Authorized preparation results

- API TypeScript compilation and focused lint passed.
- Affected API/proxy regression rerun: 4 files / 15 tests passed sequentially; an earlier parallel worker failure is recorded separately.
- Database diagnostic/privacy tests: 2 files / 5 tests passed.
- Cloud build passed API standalone import and listener handshake; web TypeScript and 62 pages passed.
- Local Docker executable exists but daemon is unavailable. Isolated PostgreSQL migration rehearsal, concurrency tests, production backup/PITR, migration status and drift checks have NOT run. Local backup helper deliberately accepts only local development/test/demo targets and must not be repurposed for production.

## Proposed execution after explicit approval

1. Access only the existing database connection needed for this operation, in process; do not download the complete production environment or provider API keys. Inspect target database/schema identity and migration history with read-only queries. Confirm this is the intended database before any write.
2. Establish a recoverable database backup/provider snapshot and restore procedure, then rehearse pending migrations on an isolated local *_test PostgreSQL or approved staging copy. Stop on unexplained drift, failed migrations, preexisting overlap or unavailable backup/required extension.
3. Use the existing Prisma migration deployment command to apply only genuinely pending reviewed migrations. Preserve existing records and all booking conflict constraints. No resets/seeds or arbitrary SQL substitutes.
4. Repeat live health/readiness/config checks. Inspect whether real non-demo booking settings exist. Configure hours/formats/availability only from owner-approved business inputs; migration deployment does not fabricate those settings.
5. Validate real contact/booking persistence and delivery only with explicit test-recipient/test-record authorization. The current Resend onboarding sender is limited to its account email; production visitor notifications need a verified sender domain.

Rollback: stop on migration failure; retain logs and backup/PITR reference. Rolling back application code alone does not reverse DDL or the old-inquiry SKIPPED update. Restore/recovery needs explicit operator review.

## Approval boundary

Existing approval covered application deployment and the supplied sender configuration. Production schema changes, targeted database credential access for backup/migration and any restoration are a separate approval request. The CI/CD skill requires explicit human approval for destructive or live deployment actions; the engineering skill requires migration review, backup and staging validation before production migration.

Pasted Vercel exports reviewed - 10 November 2026: three user-supplied JSONL exports contain 34/40/40 lines across six deployment IDs; last two have identical summarized coverage. Current deployment 5sojnKQBvF94bbmD7Uz3cFvbQL4X repeats P2010 on contact/booking and P2010 / 42P01 / schema_missing at readiness. Startup timeout/SIGKILL entries belong to older deployments. SSL-mode compatibility notice is separate from the SQL missing-relation failure. No newer root cause or exact missing table name is present. These log attachments are diagnostic evidence, not explicit authorization to modify production schema. Existing recovery review/approval request remains applicable; no database mutation performed.

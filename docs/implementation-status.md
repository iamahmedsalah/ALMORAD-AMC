# Automatic release migrations and guarded dev command â€” 10 November 2026

Owner requested pending migrations during Vercel deployment and a development command. Inspected root vercel.json: its API build already points to `scripts/ci/vercel-api-build.mjs`, which compiles/verifies the API first, then runs production migration inspection/deployment outside Turbo's cache. The protected CI path supplies reviewed release identity, database fingerprint, migration digest and encrypted-backup reference after successful backup/rehearsal. This behavior is preserved, not replaced with an ungated migration on startup. Preview/local builds still skip production migrations; missing release context, compilation failure or migration failure blocks the production candidate. Refactored the build hook into an importable function so these contracts are now tested without deploying or contacting a hosted database.

Added `pnpm db:migrate:dev`: loads local .env, rejects production/CI/Vercel execution, hosted URLs, non-amc_*_dev names and mismatched runtime/migration databases/schemas before connection; inspects reviewed migration history, applies only pending migration files with Prisma migrate deploy, verifies none remain, then generates Prisma Client. No reset, schema push, baseline repair or migration-file generation. Added `pnpm dev:setup` to start/wait for the development Docker PostgreSQL service and run that command. Existing `pnpm dev` still starts the app separately. README documents the setup and deployment behavior. New migration files must be committed; changing schema.prisma alone is insufficient.

Actual verification: release/startup suite PASS 30/30, zero skipped, including new hosted-target rejection, apply/no-op, failure ordering and production/preview build-hook cases. `pnpm.cmd db:migrate:dev` PASS against the local Docker amc_dev database: applied 0, pending 0, Prisma Client generated. Focused ESLint, actionlint, JS syntax and whitespace PASS; root Vercel API build-hook wiring verified. Full dev:setup was not run because the database was already running and did not need recreation. No hosted migration, production build, commit, push or deployment performed this turn.

# Local development database repair and CI service-variable correction â€” 10 November 2026

Confirmed owner preference: local Docker PostgreSQL for development, hosted Prisma PostgreSQL only for Vercel. This supersedes native-only local-development guidance; CI/Vercel still use native runner tools and no containers. Added a database-only `dev/postgres/compose.yml`, `pnpm dev:db`, and `pnpm dev:db:stop`. Existing PostgreSQL 17 major and persistent local volume are preserved; API/web run directly with pnpm. Dev infrastructure is excluded from Vercel uploads. Compose config --quiet PASS.

Actual local database work:
- Root .env was pointing at a remote PostgreSQL URL with sslmode=require, even though the local Docker database was running. The remote database was not inspected or migrated. Local `amc_dev` history verified and had four pending migrations: booking_outbox_drain, contact_inquiries, contact_delivery, and outbox_hubspot_lifecycle.
- Created a pg_dump and original-environment backup under ignored/private `.backups/`. Applied those four reviewed migrations to loopback `amc_dev` using Prisma migrate deploy; existing table row counts preserved, zero pending migrations afterwards. No reset, volume recreation or data-directory upgrade. Updated ignored .env DATABASE_URL and DIRECT_URL to local Docker; hosted settings unchanged. Commented one pre-existing malformed shell-command line in .env so Compose can parse it; original content is preserved in the environment backup.
- Reloaded the existing API watcher. Actual API readiness now 200; direct booking/config and frontend /api/booking/config both 200, enabled with eleven services. Invalid contact data through the frontend returns 400 instead of database 500. The SSL alias warning came from the previous remote URL; the local dev URL has no sslmode alias. Hosted TLS was not weakened.

Verification: synthetic contact accepted/persisted once across retries; booking availability/create/retry/manage passed, overlap rejected 409, two notification outbox channels verified. Fixtures and only their associated audit rows were removed. The first temporary helper accidentally inherited the CRM token because PowerShell removed an empty environment variable before Node loaded .env; a synthetic HubSpot request returned 400. No successful CRM write is confirmed. That process was stopped. The final passing smoke run used a Node preload that explicitly disabled providers and blocked non-loopback fetches before app imports; CRM and owner delivery statuses were verified SKIPPED and email was mocked. That temporary API was stopped; the user's API/frontend remain running. No real email or successful CRM delivery claimed. A separate existing pg concurrent-query deprecation appeared during the booking smoke run; it is not claimed fixed.

CI startup fix: `createdb: definition of service "" not found` came from passing PGSERVICE as an empty string. The shell now unsets PGSERVICE and PGSERVICEFILE; native-client helpers remove those keys, including backup/restore. Startup fixtures now reject even empty service keys, verifying this regression. Release/startup suite PASS 21/21; focused lint, actionlint, Bash syntax and whitespace PASS. Ubuntu runner execution still needs the next updated CI run. No hosted migration, Vercel setting change, commit, push or deployment performed.

# Vercel-only active deployment and native startup correction â€” 10 November 2026

Owner explicitly requested separating/removing the VPS work for now and focusing exclusively on Vercel. Root Dockerfiles, compose files and `.dockerignore`, plus the container-security workflow, were moved into `archive/future-vps/`. The archived workflow has a `.disabled` suffix and is outside `.github/workflows`; no container workflow remains visible/runnable in GitHub Actions. The legacy dual-backend backup tool was also preserved there as a disabled historical copy. Archive paths were resolved and checked inside the workspace before moving; source content was preserved. `.vercelignore` excludes the entire archive. Templates require fresh review before future activation; no VPS implementation or deployment work continued.

Active backup/restore tools now use native PostgreSQL only. Removed the Docker backend/mode selection, Docker-specific diagnostic categories and the now-unneeded native-mode CI toggle. The local backup tool still rejects remote/production targets and requires isolated *_test databases; it retains snapshot/count verification and only cleans up its separately created UUID-named test database. README and Vercel runbook now describe root Vercel web/API services and native PostgreSQL, with no active compose instructions. Historical requirements/status records remain for audit. Unrelated existing changes to Next's generated next-env.d.ts were left untouched.

Startup failure correction: the action's regex accepted `amc_release_test` but rejected the configured validation name `amc_test`, exiting silently before initdb. Moved startup into a tested Bash script accepting both safe names while rejecting non-test names. Startup errors now identify validation/directory/initdb/server/database-creation stages; initdb output is no longer hidden. Temporary password files are removed on success/failure only when this invocation created their private directory; existing directories are refused without modification. Added LF normalization for shell files.

Verification: release/startup suite PASS 21/21, zero skipped. Seven startup tests execute the actual Bash script using fixture client executables: both configured names, unsafe names, initdb/pg_ctl/createdb failures, password cleanup, and refusal to modify existing directories. These are process/control-flow tests, not a real PostgreSQL server run. Focused ESLint, actionlint, Bash syntax and whitespace PASS. Scope check PASS: all seven moved files match their original Git content, all three active workflows and database scripts have no container backend, and the archive is excluded from Vercel. No production connection, migration, commit, push or deployment. First Ubuntu runner execution is still required to confirm real native cluster/rehearsal behavior.

# Native GitHub Actions pipeline; Docker retained for future VPS â€” 10 November 2026

Owner requested removal of the Docker daemon requirement from GitHub Actions while preserving the future VPS option. The active Vercel pipeline now uses native runner tools:

- `setup-postgres` composite action installs PostgreSQL 18 server/client packages through the [official PostgreSQL Ubuntu apt setup](https://www.postgresql.org/download/linux/ubuntu/). Each job creates its own runner-owned cluster under RUNNER_TEMP, listens only on 127.0.0.1:55432, uses an ephemeral local owner/password and an `amc_*_test` database, waits for readiness, and stops that cluster in an always() step. It does not reset or reuse a persistent database. Validation moves from containerized PostgreSQL 17 to native PostgreSQL 18, matching release rehearsal.
- Release backup, connection preflight and restore call `pg_dump`, `psql`, and `pg_restore` directly. Credentials remain in the client environment, not process arguments. Inherited PGOPTIONS/PGSERVICE are cleared; remote connections retain verify-full TLS and local isolated connections disable TLS. Encryption, checksum, plaintext cleanup, reviewed migration/history checks and row-preservation gates remain.
- `db-safety.mjs` supports explicit native mode for CI validation and retains its existing local Docker default. Native mode is restricted to local *_test databases, preserving exported-snapshot/table-count restore checks and its separately created UUID-named test database cleanup.
- Native actionlint 1.7.7 and Gitleaks 8.30.1 replace Docker runs. The setup action downloads the official version-pinned Linux binaries and verifies release checksums before extraction. Active validate/security/release workflows have no Docker calls or service containers. Only the separately dispatched container-security workflow and local Docker files retain container infrastructure for future VPS/local-preview work.

Verification: release suite PASS 14/14, including subprocess proof that rehearsal invokes psql/openssl/pg_restore, keeps a failed restore blocking, removes plaintext and preserves the encrypted checkpoint. Native credential/TLS/environment isolation tests PASS. Focused ESLint, actionlint, JS syntax and whitespace PASS. All changed workflow/composite YAML parsed and 36 embedded Bash blocks passed bash -n. Official tool release filenames verified. One test-harness Windows preload-URL issue was corrected before the final 14/14 pass; no product workaround or relaxed assertion.

Limit: this Windows environment has no native PostgreSQL installation; the Ubuntu apt installation, real native cluster, full restore/migration rehearsal, native Linux binary downloads and GitHub Actions execution were not run locally. Those need the first CI run on the updated revision. No production connection, migration, deployment, commit or push performed. Docker removal eliminates that tooling dependency; an unrelated restore/schema error, if present, will still block deployment and report its safe stage/category.

# Database release rehearsal diagnostics â€” 10 November 2026

The supplied `database-release.mjs rehearse` log hides the restore command's underlying error. The workflow already defines PostgreSQL 18 and matching `amc_release_test` credentials. The empty Vercel bypass secret is used later for candidate verification and is not read by rehearsal. Backup/decryption progressed to the restore Docker invocation in the original script; the underlying restore cause remains unknown from this log.

Added `database-command.mjs` with fixed stage/category diagnostics and bounded exit codes. It distinguishes Docker/image availability, database connection/authentication, permissions, missing roles/extensions, existing objects, archive/server compatibility and decryption failures without emitting captured output, SQL, object names, credentials or URLs. Unknown failures remain blocking. Added a read-only SELECT 1 preflight through the restore's Docker network/PG environment, after the loopback *_test guard and before decryption. Plaintext dump cleanup now runs on failure as well as success; cleanup errors also block release.

Encrypted checkpoints, checksum/decryption, exit-on-error restore, migration-history comparison, pending migrations and existing-row preservation remain required. No reset, schema deletion, migration rewrite or deployment bypass. Validation: release tests PASS 12/12, including sensitive-output/category cases and subprocess rejection of an unsafe target with plaintext cleanup; focused ESLint PASS; Node syntax PASS; actionlint PASS; whitespace PASS. Live Docker restore was not run because the local daemon is unavailable. No production connection/migration, Vercel setting change, commit, push or deployment performed.

Next steps: publish the reviewed changes through the owner's normal commit/push flow, then start CI using that new revision (rerunning an old commit still uses the old script). If it fails, inspect the safe `database_release_command_failed` JSON. Connection/authentication categories identify the disposable service/URL/network; restore conflicts need freshness/backup-definition inspection; extension, role, permission or compatibility categories require matching the rehearsal environment to the backup. Fix only the reported cause. Do not disable restore errors, reset a database, downgrade PostgreSQL or rotate secrets based on the generic message. Only that safe JSON is needed for follow-up, not raw stderr or plaintext data.

# CI annotation cleanup and image delivery â€” 10 November 2026

Authorized scope: fix the supplied Actions runtime/runner notices and image lint warnings, and explain the Vercel Node override. No external settings, dependencies, database, deployment, commit or push changed.

- All four workflows use `ubuntu-24.04` rather than the moving `ubuntu-latest` label. Updated checkout/setup-node/upload-artifact to v6, download-artifact to v7, and pnpm/action-setup to v5. The selected action manifests were checked against their official repositories for `runs.using: node24`; action major numbers alone do not establish runtime support (download-artifact v6 still declares Node 20). Existing pnpm 11.11.0, application Node 24, gates, backup/migration sequencing and permissions remain.
- Migrated the seven flagged native image elements to `next/image`. Official logos and SVG illustrations stay unoptimized so the original artwork is served unchanged, with explicit eager loading retained for above-fold artwork. Service WebP posters use responsive `sizes` and generated image variants; failed optimized requests switch through React state to the supplied SVG fallback. No new external image host or dependency.
- Removed two unused console-rule suppression comments. ESLint now resolves the Next app root and actual installed React version from the web workspace; the full lint run no longer produces the monorepo root discovery notices.
- Vercel explanation: root engines require Node >=24 and <25, and both apps specify `24.x`; CI also uses Node 24. Vercel's package.json engines override the dashboard selection by design. Keep that code declaration so CI and deployment use the same major; setting the dashboard to 24.x aligns the UI as well. No dashboard value was inspected or changed. [Vercel version precedence](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions#version-overrides-in-packagejson).

Final verification: `pnpm.cmd lint` and complete direct ESLint PASS with zero errors/zero warnings; workflow YAML/runtime-reference checks and native actionlint PASS; release-safety suite PASS 8/8; web production build PASS including TypeScript and 64 prerendered pages; git diff --check PASS. Focused browser run PASS 31/31 in 2.0 minutes, zero skipped/flaky cases: all 12 earlier performance/contact regressions, 16 EN/AR light/dark accessibility/responsive checks at 320/390/768/1440px, the official static-logo check, and two new optimized-poster/error-fallback cases. English mobile dark and Arabic desktop light screenshots visually inspected: artwork, proportions and layouts intact. JSON evidence is in `.tmp/warnings-and-e2e-results.json`; standard screenshots are in ignored `test-results/`. The earlier repeated run was interrupted before its final summary; the fresh 31-case run covers those failures. Full public/staff/database suites, container scans and remote CI were not rerun for this increment.

# Public E2E offscreen and contact focus corrections â€” 10 November 2026

The supplied four-way CI shard log had 55 passes and two failures: an extra offscreen showreel draw in Arabic desktop, and the English desktop contact success panel not receiving focus.

- `studio-media.tsx`: a non-intersecting observer notification now cancels the pending animation frame without calling `wake()` or repainting the canvas. Paused frames and manual scene selection retain the previous behavior; visible playback still resumes normally.
- `contact-form.tsx`: success-panel focus now runs in a React effect after the success DOM has committed, replacing a requestAnimationFrame scheduled immediately after `setState`. Validation, failed-attempt field retention, retry idempotency and success acknowledgement are unchanged.
- `browser-performance.spec.ts`: delayed observer instrumentation counts paints performed inside offscreen callbacks. The test explicitly waits for delivered visibility and requires zero offscreen callback redraws, while retaining stable-frame, frame-budget, pause/chapter/resume and reduced-motion assertions. This replaces fixed startup/offscreen settling waits with observable conditions; no retries or assertion relaxation added.

Local verification:
- Strengthened Arabic 1440px regression against the preserved previous production build: failed as expected, with exactly one offscreen callback repaint (expected zero). The temporary old-build server was stopped afterward.
- Fresh `pnpm.cmd --filter @amc/web build`: PASS, including TypeScript and all 64 prerendered pages.
- Changed-file ESLint: PASS, zero errors/one existing native-image warning. Whitespace check PASS.
- First 12 affected cases passed before the repeated run was interrupted by follow-up work. No final 36/36 result is claimed. The later warning-cleanup run above includes fresh checks of both failures.

No live contact/booking submitted: browser contact requests are mocked with synthetic fixtures. No database migration, deployment, commit or push. The separately reported production Prisma P2010 issue is not fixed by these client changes.

# CodeQL removal â€” 10 November 2026

The owner explicitly requested removal because CodeQL is unavailable for this private repository's plan. Removed the CodeQL job and SARIF artifact step from `security.yml`, plus the caller's unused `actions: read` and `security-events: write` permissions in `ci-cd.yml`. The default `contents: read` permission remains. Earlier instructions below to enable CodeQL are historical and superseded by this request.

The release still depends on validation and the security workflow (Gitleaks secret scanning). Production dependency audit, unit/database/staff tests and four public E2E shards remain required. Removing CodeQL removes this specific release blocker; it does not guarantee release success or override main-branch/event conditions. No replacement SAST coverage is claimed. No commit, push, remote migration or deployment performed. The separately reported Vercel Prisma P2010 failures remain unresolved by this workflow change.

Validation: native actionlint PASS; all four workflow YAML files parsed; assertions verified CodeQL/security-events removal, unchanged release dependencies, retained public E2E matrix and dependency audit; git diff --check PASS. No application tests rerun for this workflow-only deletion.

# CI browser sharding and security workflow cleanup â€” 10 November 2026

Authorized scope: shorten CI validation, explain the newer CodeQL failure, and remove irrelevant skipped containers from the Vercel pipeline. No commit, push, deployment, remote database operation, paid feature activation or repository setting change.

- `validate.yml` retains every public E2E case and moves them to a four-job matrix. The checks job builds once and uploads a tar archive of `.next`, excluding cache, development output and standalone dependencies. Each public runner installs frozen-lockfile dependencies and restores that build. All public shards must pass before the reusable validation workflow, and therefore the existing release dependency, can succeed. Staff browser tests keep their single worker and isolated PostgreSQL service in the checks job.
- `playwright.config.ts` enables test-level sharding with `fullyParallel`, one worker per CI runner, and `forbidOnly` in CI. All 228 tests remain: test-list comparison confirmed four disjoint sets of 57, zero omissions and zero duplicates. See [Playwright sharding](https://playwright.dev/docs/test-sharding). Four runner slots/setup operations trade additional concurrency for shorter elapsed browser time; revised GitHub duration is unmeasured until the first run.
- `security.yml` no longer has the opt-in `scan_containers` input or skipped container job. Docker/Trivy/SBOM checks are preserved in the independent, manually dispatched `container-security.yml`. Vercel does not deploy these local-preview/future-VPS images. Run that manual workflow when validating Dockerfiles or preparing container hosting.
- The newly supplied CodeQL log completed analysis and reached SARIF upload; GitHub then explicitly rejected it because **code scanning is not enabled**. Existing token permissions are sufficient for the previously reported workflow-run read issue. Keep CodeQL fail-closed and retain its SARIF as an artifact even when the upload fails.

Repository administrator action still needed: open [repository security settings](https://github.com/iamahmedsalah/ALMORAD-AMC/settings/security_analysis), enable Code Security/code scanning if available, and choose **advanced setup** to use the existing YAML workflow. Avoid enabling a competing default CodeQL workflow. For a private/internal repository, confirm an eligible Code Security plan first; no purchase is authorized or assumed. References: [GitHub enablement requirements](https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/private-repository-enablement), [advanced setup](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configuring-advanced-setup-for-code-scanning).

Actual local verification:
- Native `actionlint` PASS on all four workflows; all four YAML files parsed successfully. No remote Actions run claimed.
- Changed Playwright configuration lint PASS. Release safety tests PASS 8/8.
- CI-mode test-list union check PASS: 228 total, 57 per shard, no duplication or omission.
- Build archive packaging/extraction PASS. Final local archive 2.9 MB; cache/dev/standalone absent and build ID preserved. Restored build served `/en`, `/ar`, and their JavaScript assets with HTTP 200 using the existing installed dependencies and public assets. Temporary verification server stopped.
- `CI=true pnpm.cmd test:e2e --shard=1/4`: PASS, 57/57 in 4.7 minutes with one worker, including pause/delayed-observer regressions, bilingual contact/theme/viewport cases and reel interactions. This is a local shard duration, not a measured GitHub pipeline speedup. No application source/build change in this increment; reused the existing production build. Other public shards, staff/database suites, container scans and CodeQL were not rerun locally.

# CI permission and paused-showreel correction â€” 10 November 2026

Scope: repair the supplied CodeQL analyze failure and the two public browser-performance failures. No migration, deployment, commit, push or external account change.

- CodeQL finished extraction and queries but failed on `GET /repos/{owner}/{repo}/actions/runs/{run_id}`. Added job-scoped `actions: read` to both the `ci-cd.yml` reusable-workflow caller and `security.yml` CodeQL job. Existing `contents: read` and `security-events: write` remain. GitHub documents the read requirement for the [workflow-run endpoint](https://docs.github.com/en/rest/actions/workflow-runs#get-a-workflow-run) and the [caller permission ceiling](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows#nesting-reusable-workflows).
- Pausing recreates the showreel effect and paints a still frame immediately; the newly registered IntersectionObserver previously called `wake()` again asynchronously. Paused observer notifications now update visibility without repainting. Manual chapter changes still paint their selected still frame.
- Browser regression delays showreel observer delivery by 350ms to exercise late callbacks, checks zero ongoing draws after pausing and selecting a chapter, and retains resume/offscreen/reduced-motion checks in English/Arabic at 390/1440px.

Actual local validation:
- Workflow YAML parse: PASS, all three files; explicit caller/callee `actions: read` check: PASS.
- `pnpm.cmd lint`: PASS, zero errors/nine existing warnings. Final affected-file lint: PASS, one existing native-image warning.
- `pnpm.cmd ci:release:test`: PASS, 8/8. Direct Node invocation also passed 8/8.
- `pnpm.cmd test -- --maxWorkers=1`: PASS, 28 files/93 tests (the existing Vitest configuration controls worker count).
- `node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json`: PASS.
- `pnpm.cmd --filter @amc/web build`: PASS, including TypeScript and 64 prerendered pages, after rerunning with user-cache access. Initial sandboxed build failed on Windows SWC native-cache permissions.
- `pnpm.cmd exec playwright test tests/e2e/browser-performance.spec.ts --workers=1 --repeat-each=3`: PASS, 12/12 against the fresh local production build, including deliberately delayed observer callbacks. Full public/staff E2E and database suites were not rerun for this focused change.
- Docker daemon unavailable, so actionlint's Docker-based check was not run locally. No local CodeQL scan or GitHub Actions rerun claimed.

# Implementation status â€” 9 November 2026

## Current authorized scope

Latest instruction: Email domain configuration (testing DNS via `onboarding@resend.dev` and Google Workspace inbound/reply), outbox channel decoupling (`:EMAIL` and `:HUBSPOT`), branded responsive bilingual email templates with lifecycle support (booking confirmation, rescheduling, cancellation), and HubSpot CRM v3 integration (contact deduplication, meeting creation, and automated lifecycle outcome syncing on reschedule/cancellation) are fully implemented.

### Earlier scope

Earlier deferral/stopping records below are historical. See the latest booking increments, booking-and-demo.md, and the notification drain record below.

## Outbox Decoupling & HubSpot CRM Lifecycle Increment â€” 9 November 2026

* **Design**: [`docs/designs/design_draft.md`](docs/designs/design_draft.md) and [`docs/designs/concepts_brief.md`](docs/designs/concepts_brief.md) (converged via 2-round adversarial Goldfish review; drift report at `docs/reports/2026-11-09_DRIFT_REPORT.md`).
* **Schema Extension**: `apps/api/prisma/schema.prisma`:
  * `Booking`: added `hubspotContactId String? @db.VarChar(64)` and `hubspotMeetingId String? @db.VarChar(64)`.
  * `ContactInquiry`: added `nextRetryAt DateTime? @db.Timestamptz(3)`.
  * `BookingOutbox`: transitioned from `@unique` on `eventId` to composite index `@@unique([eventId, kind])`, enabling independent `:EMAIL` and `:HUBSPOT` delivery streams.
* **Migration**: `apps/api/prisma/migrations/20261109120000_outbox_hubspot_lifecycle/migration.sql` (additive SQL with zero destructive drops or data loss).
* **Email Templates**:
  * Shared responsive email layout `renderEmailLayout` in `apps/api/src/modules/notifications/templates/email-layout.ts` (approved brand palette `#0B0A08`, `#14120E`, `#BE9D5B`, `#F5F1E7`, Arabic RTL / English LTR, Outlook-safe table layouts).
  * `booking-confirmation.template.ts`, `booking-rescheduled.template.ts`, `booking-cancelled.template.ts`, and `contact-emails.ts` unified under `renderEmailLayout`.
* **Outbox & Backend Services**:
  * `NotificationsService`: dynamic template dispatch for booking creation, reschedule, and cancellation; `Reply-To: hello@almorad-amc.com`; default sender `ALMORAD AMC <onboarding@resend.dev>`; patched mock status leak (`UNCONFIGURED` when `RESEND_API_KEY` missing).
  * `HubSpotClient`: Arabic compound name preservation (prevents splitting "Ø¹Ø¨Ø¯ Ø§Ù„Ù„Ù‡"), `upsertBookingContact()`, `createMeeting()` (with `associationTypeId: 200`), `updateMeeting()` (with `RESCHEDULED` and `CANCELED` outcomes), and rate-limit backoff handling (`Retry-After`).
  * `ContactService`: atomic `$queryRaw` batch leasing with `FOR UPDATE SKIP LOCKED` and exponential backoff.
  * `BookingsService`: decoupled outbox event emission (`:EMAIL` and `:HUBSPOT`), pending outbox status on reschedule/cancel lifecycle actions, and `drainCrm(batchSize)` with atomic row leasing.
  * `OperationsController`: exposed CRM outbox drain at `/ops/notifications/drain` via `drainCrm()`.
* **Verification Evidence**:
  * Prisma Schema Validation: PASS (`The schema at apps\api\prisma\schema.prisma is valid`).
  * Prisma Client Generation: PASS (Prisma Client 7.10.0 generated).
  * TypeScript typecheck `@amc/api`: PASS (`tsc --noEmit -p apps/api/tsconfig.build.json`, zero errors).
  * TypeScript typecheck `@amc/web`: PASS (`tsc --noEmit -p apps/web/tsconfig.json`, zero errors).
  * Targeted Unit Test Suite (6 files / 32 tests): PASS
    * `apps/api/src/modules/contact/hubspot.client.test.ts` (5 tests): PASS.
    * `apps/api/src/modules/notifications/notifications.service.test.ts` (9 tests): PASS.
    * `apps/api/src/modules/bookings/bookings.unit.test.ts` (8 tests): PASS.
    * `apps/api/src/operations.test.ts` (2 tests): PASS.
    * `packages/shared/src/calendar.test.ts` (1 test): PASS.
    * `apps/api/src/modules/contact/contact-delivery.test.ts` (7 tests): PASS.

---

# Implementation status â€” 7 November 2026

## Current authorized scope

Latest instruction: booking transactional email notifications are now implemented using a serverless-native PostgreSQL outbox drain architecture per the approved EGM design specification `docs/designs/booking_confirmation_queue.md`.

### Earlier scope

Earlier deferral/stopping records below are historical. See the latest booking increment, booking-and-demo.md, and the notification drain record below.

## Transactional Email Notification Outbox Increment â€” 7 November 2026

* **Design**: [`docs/designs/booking_confirmation_queue.md`](docs/designs/booking_confirmation_queue.md) (Serverless-native transactional outbox drain via periodic cron).
* **Schema Extension**: `apps/api/prisma/schema.prisma` extends `BookingOutbox` with `lastError`, `deliveredAt`, `nextRetryAt`, `updatedAt`, and indexes on `[status, nextRetryAt]` and `[bookingId]`.
* **Migration**: `apps/api/prisma/migrations/20261107200000_booking_outbox_drain/migration.sql` (additive SQL with zero table locks or drops).
* **Dependencies**: `resend` added to `@amc/api`.
* **Shared Formatter**: `packages/shared/src/calendar.ts` exports `generateIcs` with RFC 5545 compliance.
* **Notification Dispatcher**: `NotificationsService` implements atomic batch leasing (`FOR UPDATE SKIP LOCKED`), deterministic HMAC token derivation (`hmac_sha256(secret, bookingId:nonce:version)`), Resend API transmission with `Idempotency-Key`, and exponential backoff retry / PII error scrubbing.
* **Operations Controller**: Added `@Post('notifications/drain')` in `OperationsController` protected by `Bearer CRON_SECRET` via constant-time `timingSafeEqual`.
* **Booking Hook**: `BookingsService.create()` records outbox `status = 'PENDING'` for non-demo bookings when credentials exist, while keeping `UNCONFIGURED` for demo runs.
* **Verification Evidence**:
  * `pnpm.cmd db:generate`: PASS (Prisma Client 7.10.0 generated).
  * `pnpm.cmd db:validate`: PASS (Schema valid).
  * `pnpm.cmd --filter @amc/api build`: PASS (`tsc -p tsconfig.build.json`).
  * `pnpm.cmd --filter @amc/api typecheck`: PASS (`tsc --noEmit`, zero errors).
  * `pnpm.cmd vitest run`: PASS (19 test files / 50 tests passed, including `notifications.service.test.ts` with 8 tests and `calendar.test.ts`).

---



The user authorized the remaining implementation and requested Turborepo, Solar icons, the official GLB/SVG favicon, Three.js and GSAP, then explicitly asked to skip booking. This supersedes the source master prompt's initial Phase 1 stop. Source documents describe requirements; the results below describe inspected implementation. The original Phase 1 verification record is preserved in [validation/phase-1.md](validation/phase-1.md).

## Implemented public experience

- Bilingual editorial landing with studio introduction, four disciplines, eleven offering links, labelled abstract project possibilities, approach, Better Together visual, partnership, FAQ and contact CTA. Header/footer, Arabic RTL and English LTR, responsive light/dark/system themes.
- Original GLB at public/3d/mc-logo.glb in a lazy Three.js/React Three Fiber island. Original geometry/materials preserved; presentation centres and scales the scene. RoomEnvironment lighting, bounded DPR, pointer response, offscreen/background pause and user pause control. Original SVG fallback on reduced motion/save-data/no WebGL/model failure. Original SVG favicon.
- Scoped GSAP/ScrollTrigger with disposal and reduced-motion handling. Core headings, links and content remain server-rendered HTML.
- Selected official Solar SVG paths generated from the installed Iconify package. Public Credits route and asset-notices.md retain attribution.
- Four pillar hubs and eleven dedicated offering guides in both locales, plus About, Work, Contact and Credits. Per-offering summary, scope, process, FAQ and related links. No fabricated projects, client logos/results, team biographies or office details.
- Localized titles/descriptions, canonical/reciprocal hreflang, Organization/Service/BreadcrumbList data, sitemap, robots and genuine 404s. Indexing requires BOTH a verified origin and explicit content approval. Work/Contact/Credits remain noindex; Work/Contact show honest pending-content states. Contact config validates email, phone and Google Maps host. No map iframe or analytics runs automatically.
- Turborepo dependency ordering and local task caching for builds, package typechecks and Prisma generation. Lint and unit tests execute directly. Database operations/integration/browser tests are uncached. Remote caching is disabled. Public build configuration and root env file participate in task hashes.
- Read-only GitHub validation workflow with disposable PostgreSQL and browser/audit checks. Standalone, nonroot web Dockerfile with pinned base digest; local loopback preview Compose with healthcheck, resource/log limits and dropped capabilities. Release, content/intent map and asset documentation.

## Publication and provider work still pending

The latest authorized increment implements booking, staff-reviewed changes, receptionist operations and CEO booking analytics locally. External notification/reminder/Calendar providers and actual publication remain pending. Earlier deferral records below are historical.

Publication still needs approved bilingual copy, verified domain/contact/office facts, permitted case/team material, legal/privacy text and licensed Redaction 100 if required. Work-detail/team/legal pages are not fabricated. Redaction uses Georgia fallback; Cairo/IBM Plex Sans use next/font. No external Google/Slack/Resend/analytics account, production migration, deployment, commit or push has been performed. Live TLS, monitoring, staged rollout and production backup/restore remain launch work requiring real infrastructure. Local consistent backup/restore rehearsal is implemented and verified.

## Verification evidence

The preceding implementation run passed 19 unit/API tests, all-workspace lint/typecheck/build and 24 Playwright checks. Browser coverage includes EN/AR Ã— light/dark Ã— 320/390/768/1440, axe scans, no-JavaScript offering content, navigation, metadata, keyboard controls and 3D success/failure/reduced-motion behavior. A repeated unchanged build restored all four tasks from Turbo cache in 529 ms. These measurements are local checks, not field Core Web Vitals or accessibility certification.

Dependency audit initially identified deepmerge-ts and mysql2 advisories through Prisma tooling. Targeted workspace overrides pin deepmerge-ts 8.0.0 and mysql2 3.23.1. Resumed frozen installation and production audit on 6 November pass; audit reports no known vulnerabilities. Prisma generation and schema validation passed with the overrides in the preceding run; final resumed checks are being recorded below.

Windows pnpm native Turborepo download was repaired from the official registry tarball after SHA-512 verification against the lockfile. No registry, dependency integrity or product database safeguards were disabled. The first browser attempt was disrupted by concurrent restoration of build output; a subsequent stable-build run passed all 24 tests. Build and browser runs must remain sequential.

## Final resumed results

| Check | Observed result on 6 November 2026 |
|---|---|
| Frozen pnpm install | PASS, already up to date |
| Prisma generation / validation | PASS with the targeted dependency overrides |
| Production dependency audit | PASS, no known vulnerabilities reported |
| Lint | PASS; existing nonblocking monorepo React-detection/pages-directory notices |
| API/web direct TypeScript checks | PASS; API typecheck and build rerun after the final guard-wiring fix |
| pnpm typecheck | PASS after final API fix: 5 tasks, 3 cache hits, 7.651 seconds; prior unchanged run restored all 5 in 1.093 seconds |
| pnpm test | PASS: 8 files / 20 tests, 3.06 seconds with maxWorkers set to 2; includes final full-module startup/rate-limit regression |
| Isolated local PostgreSQL integrity test | PASS: 1 test; existing amc_test only, no reset/new migration |
| pnpm build | PASS: web production compilation/static generation plus shared/API builds |
| Repeated pnpm build | PASS: 4/4 tasks restored from cache in 572 ms |
| Production-container browser suite | PASS: all 24 tests in 46.5 seconds, including 3D render/pause/failure/reduced motion and stable scene dimensions |
| Docker preview build | PASS: pinned-base Linux standalone web image built, no external publication |
| Local container runtime | PASS: node user, healthy, loopback port 3100; root .env absent from runtime |

The final web image manifest-list digest is sha256:15cd247a1a123e19c0e1734e0c7cce2ad8cc2d11e497343ad1a110545a878152. Local preview: http://127.0.0.1:3100/en and /ar. The normal development process is restored separately on port 3000. GitHub Actions has been prepared but not run remotely; this workspace has no Git repository, and nothing was committed/pushed/deployed.

Windows repository-level Turbo lint/test tasks stalled while package build/typecheck tasks worked. Final root scripts execute lint and unit tests directly; the test script prepares shared output through Turbo. This keeps successful local build/typecheck caching without the root-task stall. One parallel Vitest run lost a worker during concurrent builds; limiting the small suite to two workers produced a clean full run without suppressing tests.

Representative English dark 3D desktop and Arabic light mobile screenshots were visually reviewed. Full screenshot matrix and HTML report are generated under test-results/ and playwright-report/. No layout overflow or selected axe violations were observed in the tested matrix; human assistive-technology review, field performance and launch acceptance remain separate.

Local public-site implementation and release preparation are verified. Booking-dependent phases remain deferred, and actual publication still depends on the business content/infrastructure inputs listed above.

Final development startup exposed a ThrottlerGuard Reflector injection failure. AppModule now provides Reflector explicitly and constructs the third-party guard with explicit options/storage/Reflector tokens. The new full-AppModule HTTP regression test starts the real guards, preserves unauthenticated staff denial, checks readiness and verifies request 61 receives 429. All 20 tests pass; the API then starts successfully under the normal tsx watch development command.

Final live smoke: preview EN/AR, SVG favicon and GLB return 200; API liveness/readiness return 200; unauthenticated staff identity returns 401. Development web/API were restarted successfully. The preview container remains healthy on loopback port 3100.

## Staff security and Vercel preparation - current increment

The selected production target is separate Vercel web/API projects with Prisma Postgres and Prisma ORM. App-level Vercel configurations, Node 24, pooled runtime connections, direct controlled migration configuration and a provider-specific runbook are prepared. The original VPS requirements document is retained; Docker is local-only validation infrastructure. No AMC Vercel project, Prisma hosted database, domain, email account or deployment has been created. Read-only provider inspection is not deployment verification.

Localized staff login/account pages now support secure cookie sessions, session revocation, password changes and manager/CEO security counts/audit pagination. API permissions, salted scrypt passwords, hashed opaque tokens, origin/CSRF validation and signed web-to-API requests protect access. The production API rejects unsigned proxy calls. PostgreSQL atomic throttle state works across API instances; authenticated maintenance removes expired sessions/buckets. No default credentials or real staff accounts were created.

Additive migrations 20261106020000_staff_access and 20261106040000_serverless_throttling were applied only to local amc_dev/amc_test after backup/restore rehearsal. The latter first failed on a Windows UTF-8 BOM before any table creation. Its BOM was removed, the failed local migration marked rolled back, and corrected SQL reapplied successfully; no reset or data deletion was used.

Current observed checks:

- Lint PASS with existing nonblocking React/pages notices; generated staff browser report is now excluded.
- Typecheck PASS: 5 tasks, 2m42.555s.
- Unit/API PASS: 12 files / 27 tests, 6.02s.
- Isolated PostgreSQL PASS: 3 files / 4 tests, including independent storage instances under concurrent requests and credential/session races.
- Prisma generation/schema validation PASS.
- Local consistent backup/restore PASS on dev and test: schema/constraints and every public table count matched (4 tables before shared-throttle migration).
- Production dependency audit PASS: no known vulnerabilities. pnpm upgraded to 11.11.0 for GHSA-vx52-2968-3vc6; targeted dependency overrides retained.
- Both Vercel config field names and framework identifiers match the official schema. No actual Vercel build/deployment has been run.

Final production build, renewed browser runs and source scanning are being completed and will be recorded below. Prior successful browser checks are historical, not evidence for untested later edits.

Local API container scanning found 34 high/critical Debian findings and 16 Node/tooling findings in the earlier full-workspace image. That image is not approved for production; Vercel is the chosen runtime. Container scanning remains a manual CI job that fails on high/critical findings. No CodeQL/GitHub workflow success or production security certification is claimed.

See vercel-deployment.md, domain-and-email.md and staff-and-operations.md for provider setup, exact runtime-variable responsibilities and remaining release inputs.

Further final checks: source Gitleaks scan PASS (redacted, 2.61 MB scanned, no leaks). Post-migration dev backup/restore PASS with all 5 public table counts matching; Prisma migrate diff reports no difference.

Final build PASS: 4/4 Turbo tasks, 7m59.973s; localized static public routes and dynamic private staff/proxy routes compiled. Final lint rerun PASS with only the existing nonblocking notices. Local Docker engine stopped after database tests, was restarted, and the existing dev PostgreSQL container was started for browser verification.

The user selected almorad-amc.com and six email users/addresses. Domain/email runbook now proposes apex web, www redirect, api subdomain and licensed individual inboxes plus shared Groups/aliases. No ownership, DNS or mailbox configuration is implied.

Staff browser validation: the development watcher timed out at startup; the test runner now starts the compiled API. The compiled run passed Arabic receptionist authorization/revocation and password-change checks, but the first manager sign-in stayed on the login page. Inspection found the client form was enabled before hydration and lacked an explicit POST fallback. Inputs/submit now stay disabled until hydration and the form explicitly posts to the allowlisted proxy endpoint, preventing native credential submission in a GET URL. Rebuild and full browser reruns follow; the partial run is not counted as a pass.

## User-requested stopping point

The user requested stopping and a status report. No further implementation is being pursued. Client booking/scheduling, staff appointment calendars, change requests and booking-derived analytics are NOT implemented. Independent staff login/account/session/password/security audit views are implemented.

The final login hydration/POST fix passed lint and production compilation; final full build/browser verification after that fix was not completed before stopping. The prior full build, 27 unit tests, 4 database tests, schema drift/restore and source/dependency scans passed as recorded above. The latest partial staff browser run had 2 passes and 1 failed first sign-in, which prompted this fix; do not report the final staff suite as passed. Vercel/Prisma/domain/email setup remains prepared documentation/configuration only, with no deployment or external account/DNS/mailbox changes.

## Booking increment - authorized after the stopping point

Implemented bilingual client booking/manage routes, receptionist calendar/details/actions and CEO/Manager settings/analytics. Reasons and staff review protect both cancellation/rescheduling. Cairo DST-aware slots, buffers and one shared capacity-one calendar are enforced transactionally; a PostgreSQL exclusion constraint rejects concurrent overlapping bookings. HMAC-derived expiring/rotating management tokens, request idempotency, role/CSRF/proxy guards, transition events/audit and durable UNCONFIGURED notification intents are implemented. Unexpected errors are sanitized before logging.

Mock receptionist and CEO accounts plus six synthetic appointments/two change tickets were created only in amc_demo. Passwords/secrets are generated in ignored .env.demo. Demo is labelled throughout; no fabricated sample is presented as live business evidence. Working hours/duration/notice/cutoff values are demo fixtures, not verified business policy.

Migration 20261106060000_booking_operations was reviewed and applied to local amc_test, amc_dev and amc_demo after consistent backup/restore rehearsals. No reset or external database operation occurred. Post-seed demo restore PASS: all 12 table counts match and constraints/schema restored. Prisma schema validation and drift check PASS, no difference detected. Production dependency audit PASS, no known vulnerabilities.

Observed intermediate checks: lint/typechecks PASS; 31 unit/API tests PASS; 12 isolated database tests PASS (8 new booking tests plus 4 existing). A production build with the new web routes PASS in 53.755s; API rebuilt after detailed event/safe-error changes. Initial six-test browser run had 3 passes and 3 timeouts locating exact select labels; selects now receive explicit localized accessible names. Final build/browser rerun is pending and will be recorded below. No final browser success is claimed at this point.

Actual Vercel/Prisma deployment, domain/email setup, production policy approval, office verification and notification/calendar provider connections remain pending.

## Developer experience, Swagger API, terminal banners and container structure increment

- Added comprehensive OpenAPI / Swagger documentation (`@nestjs/swagger`) across all NestJS API controllers (`HealthController`, `AuthController`, `SecurityController`, `StaffController`, `PublicBookingController`, `StaffBookingsController`, `BookingSettingsController`, `BookingAnalyticsController`, and `OperationsController`) with Swagger UI exposed at both `/docs` and `/api/docs`.
- Implemented formatted, stylized terminal & console banners matching reference for `@amc/api`, `@amc/web` (Next.js server instrumentation), and exported a reusable banner utility in `@amc/shared` (`printBanner`, `formatBanner`, and DevTools-formatted `getBrowserConsoleBanner` with brand tokens `#BE9D5B` and `#0B0A08`). Added client-side `<ConsoleBanner />` component to web layout.
- Added root-level Dockerfiles and Compose configurations (`Dockerfile.api`, `Dockerfile.web`, `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.test.yml`) matching local container workflow.
- Added comprehensive unit tests for banner formatting (`packages/shared/src/banner.test.ts`), public booking controller/origin validation (`bookings.unit.test.ts`), and staff controller endpoints (`staff.controller.unit.test.ts`). All typechecks pass with 0 errors.


## Final booking validation

- Lint PASS; existing nonblocking monorepo notices retained.
- Strict workspace typechecks PASS; final web and API production builds PASS. The final complete web build took 37.113s; API was rebuilt after audit metadata changes.
- Unit/API PASS: 14 files / 31 tests, including Cairo DST/notice/blackout rules and safe exception logging.
- Isolated PostgreSQL PASS: 4 files / 12 tests. Final reruns also verify acknowledgement source/version and complete alternative-proposal audit times.
- Authenticated/client browser PASS: 6 tests in 18.1s, including staff approval, CEO settings saving, EN/AR booking/change requests, receptionist RBAC, password/session security and no-JavaScript safe login.
- Public production browser regression PASS: 24 tests in 36.5s, including locales/themes/viewports, SSR navigation, metadata and 3D fallback/motion behavior.
- Prisma generation/schema validation/drift PASS; no difference detected.
- Populated local demo backup/restore PASS: all 12 table counts match and schema/constraints restore successfully.
- Production dependency audit PASS, no known vulnerabilities.
- Source Gitleaks PASS: redacted scan of approximately 2.77 MB, no leaks found.

Desktop calendar and Arabic mobile client-management screenshots were visually reviewed. A final focused browser rerun passed after explicit select names, restrained dashboard heading size and separator corrections. Generated QA images are preserved in ignored .tmp/final-booking-qa. These are local checks, not field accessibility/performance certification or a production deployment.

The local demo preview uses http://127.0.0.1:4400/en (also /ar), booking routes and localized staff routes. Generated credentials are in ignored .env.demo. Six demo appointments and two change requests exist only in amc_demo. No hosted resource, real company account, DNS record, external email/Slack message, Google calendar/video link, commit or push was created.

Final running-demo smoke PASS: generated RECEPTIONIST and CEO accounts each signed in, opened their authorized calendar/analytics workspace and signed out successfully against port 4400. Passwords were not printed. The final source scan also PASS (approximately 2.77 MB, no leaks). Demo web/API remain running on loopback 4400/4401.

---

## Design System Migration & 3D Interactive Landing Experience Increment â€” 8 November 2026

* **Design Specification:** [`docs/designs/design_system_and_3d_landing.md`](designs/design_system_and_3d_landing.md) (Approved V1 Design Specification).
* **EGM Review Report:** [`docs/reviews/design_system_and_3d_landing_review.md`](reviews/design_system_and_3d_landing_review.md) (Complete 5-Persona Goldfish Review Audit).
* **Color Tokens & Tailwind v4 Theme:**
  * Updated [`apps/web/src/styles/tokens.css`](../apps/web/src/styles/tokens.css) with official Navy (`#0B1F44`), Brand Orange (`#F7761E`), Cream (`#FBF1E6`), and Deep Burnt Orange (`#B84A05`).
  * Enforced dual theme selectors (`:root, [data-theme="light"]` and `.dark, [data-theme="dark"]`).
  * Implemented Tailwind CSS v4 `@theme inline` with full brand color scales and legacy compatibility shims (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`, `--muted-foreground`, `--border`, `--brand-accent`, `--ring`).
  * Enforced WCAG AA contrast compliance: Brand Orange buttons with dark Navy text achieve 5.67:1 contrast ratio; Deep Burnt Orange on Cream achieves 4.98:1.
* **Brand Artwork & Multi-Resolution Favicons:**
  * Deployed official vector marks to `apps/web/public/brand/`: `amc-mark.svg`, `amc-mark.glb`, `footer-logo-on-dark.svg`, `footer-logo-on-light.svg`, and `footer-logo-card.svg`.
  * Deployed multi-resolution favicons to `apps/web/public/`: `favicon.ico`, `favicon.svg`, `favicon-dark.svg`, `favicon-light.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`.
  * Updated Header and Footer in `apps/web/src/components/layout/shell.tsx` with official mark and theme-aware footer logos (`dark:hidden` / `hidden dark:block`).
  * Updated `apps/web/src/app/[locale]/page.tsx` schema.org logo metadata.
* **Interactive 3D Scene & Fallback:**
  * Created `apps/web/src/hooks/use-scroll-timeline.ts`: Continuous normalized timeline progress with mobile viewport query (`< 768px`) and `prefers-reduced-motion` detection.
  * Created `apps/web/src/components/three/amc-mark-scene.tsx`: Three.js procedural extrusion of the 5-mesh mark with dirty-flag scheduling, clamped DPR (1.5), and recursive VRAM disposal.
  * Created `apps/web/src/components/three/amc-mark-vector-fallback.tsx`: Zero-overhead hardware-accelerated SVG transform fallback for mobile screens and reduced motion.
  * Created `apps/web/src/components/three/amc-mark-container.tsx`: Responsive container dynamically switching between 3D scene and vector fallback.
  * Co-located procedural animation code and strict TypeScript definitions in `apps/web/src/components/three/amc-mark-anim.js` and `amc-mark-anim.d.ts`.
* **Bilingual Landing Page Modernization:**
  * Updated `apps/web/src/features/marketing/landing.tsx`: Redesigned layout with 55/45 reading corridors on desktop viewports and responsive card collapse on mobile screens across all 6 chapters (`chapter-hero`, `chapter-strategy`, `chapter-identity`, `chapter-digital`, `chapter-scale`, `chapter-booking`).
  * Preserved strict Arabic RTL and English LTR parity without inventing unapproved case studies, addresses, or client outcomes.
* **Verification Evidence:**
  * `tsc -p tsconfig.json --noEmit` on `@amc/web`: PASS (0 errors).
  * `pnpm.cmd exec vitest run apps/web/src/lib/seo/palette.test.ts`: PASS (2/2 tests passed, verifying all design swatches and AA contrast).
  * `@amc/shared` build: PASS (`dist/` compiled with strict TypeScript types).
  * Webpack client & server compilation: PASS (7.6s compilation time).

---

## UI/UX Polish, Squircle Radii, Premotio-Style GSAP Choreography, Preloader, Glass Navigation & API Telemetry Increment â€” 8 November 2026

* **Brainstorm & Architecture Brief:** [`docs/designs/concepts_brief.md`](designs/concepts_brief.md) (4-Agent EGM Brainstorm Synthesis: Zoom-Out, Design Critic, Implementation Readiness, Inventive Catalyst).
* **Squircle Radii & Design Tokens (`tokens.css` & `globals.css`):**
  * Added official radius tokens (`--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 20px`, `--radius-xl: 28px`, `--radius-pill: 999px`, `--radius-squircle: 22%`) and exposed them in Tailwind CSS v4 `@theme inline`.
  * Added `.rounded-squircle`, `.rounded-squircle-sm`, `.rounded-squircle-md`, `.rounded-squircle-lg`, `.rounded-squircle-xl` (with `@supports (corner-shape: squircle)` progressive enhancement), `.badge`, `.badge-accent`, and `.glass-surface` utilities across buttons, badges, cards, pillar symbols, and controls.
* **Custom Light & Dark Theme Scrollbars:**
  * Styled `html` (`scrollbar-width: thin; scrollbar-color: var(--amc-orange-500) var(--surface-2)`) and WebKit scrollbars (`::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb`) to adapt automatically between Cream/Orange in Light mode and Navy-950/Navy-800/Orange in Dark mode.
* **Icon Theme Switcher, Dual Theme Attributes & 3D Logo Preloader:**
  * Updated [`apps/web/src/components/layout/providers.tsx`](../apps/web/src/components/layout/providers.tsx) to set `attribute={['class', 'data-theme']}` so both `.dark` and `[data-theme="dark" | "light"]` rules stay synchronized.
  * Upgraded [`apps/web/src/components/layout/controls.tsx`](../apps/web/src/components/layout/controls.tsx) from a `<select>` dropdown to an accessible 3-icon squircle segmented control (`Light` Sun, `Dark` Moon, `System` Monitor) and a squircle locale switcher that triggers `amc:locale-switch`.
  * Created [`apps/web/src/components/layout/preloader.tsx`](../apps/web/src/components/layout/preloader.tsx): Full-viewport 3D-layered 5-piece AMC Mark preloader overlay that plays on initial page load and when switching between English (`en`) and Arabic (`ar`).
* **Favicon Dark/Light Synchronization & Brand Lockups:**
  * Configured adaptive `/favicon.svg`, `/favicon-orange.svg` for `(prefers-color-scheme: light)`, and `/favicon-light.svg` (Cream tile with Navy mark for high contrast on dark tab bars) for `(prefers-color-scheme: dark)` in [`apps/web/src/app/[locale]/layout.tsx`](../apps/web/src/app/[locale]/layout.tsx), plus live client-side `<link rel="icon">` synchronization when toggling themes in `Controls`.
  * Updated [`apps/web/src/components/layout/shell.tsx`](../apps/web/src/components/layout/shell.tsx) to render `amc-mark.svg` (light) and `amc-mark-white.svg` (dark) in the header brand squircle badge and enforce `data-theme="dark"` with `footer-logo-on-dark.svg` on the footer.
* **Frosted Glass Sticky Header & Slide-Over Side Navbar Drawer:**
  * Upgraded `.site-header` to frosted glassmorphism (`backdrop-filter: blur(18px) saturate(180%)`).
  * Created [`apps/web/src/components/layout/side-navbar.tsx`](../apps/web/src/components/layout/side-navbar.tsx): RTL/LTR-aware slide-over side navigation drawer with frosted glass surface, numbered squircle navigation links, theme/locale controls, Escape key handler, and backdrop close.
* **Fixed 3D Logo Scroll Animation & Premotio-Style GSAP + ScrollTrigger Choreography:**
  * Resolved the stale `progress = 0` closure bug in [`apps/web/src/components/three/amc-mark-scene.tsx`](../apps/web/src/components/three/amc-mark-scene.tsx) by reading a mutable `scrollStateRef` scrubbed by **GSAP `ScrollTrigger`** (`scrub: 0.4`) inside the 60fps `requestAnimationFrame` loop with exponential damping (`1 - Math.pow(0.0015, dt)`), pointer parallax, and dynamic key/rim lighting (`rimB` + `rimO`) from `docs/assets/amc-mark-3d-package/amc-logo-scroll.html`.
  * Added an interactive 6-chapter HUD rail (`.scroll-hud-rail`), top progress bar (`.scroll-hud-progress-bar`), and chapter pill (`.scroll-hud-chapter-pill`) in [`apps/web/src/components/three/amc-mark-container.tsx`](../apps/web/src/components/three/amc-mark-container.tsx).
  * Upgraded [`apps/web/src/components/landing/motion.tsx`](../apps/web/src/components/landing/motion.tsx) and [`apps/web/src/features/marketing/landing.tsx`](../apps/web/src/features/marketing/landing.tsx) with Premotio-inspired scrubbed section show/hide timelines (`[data-chapter-panel]`), 3D perspective card scroll reveals (`[data-scroll-card]`), and sticky card depth compression (`[data-stack-card]`).
* **Structured NestJS API HTTP Logging (`apps/api`):**
  * Created [`apps/api/src/http-logger.middleware.ts`](../apps/api/src/http-logger.middleware.ts) and unit test [`apps/api/src/http-logger.middleware.test.ts`](../apps/api/src/http-logger.middleware.test.ts), wired into [`apps/api/src/main.ts`](../apps/api/src/main.ts), emitting structured JSON logs (`timestamp`, `level`, `event: 'http'`, `requestId`, `method`, `path` with query parameters stripped, `status`, `durationMs`) across both development and production.
* **Verification Evidence:**
  * `pnpm.cmd --filter @amc/api exec tsc -p tsconfig.json --noEmit`: PASS (0 errors).
  * `pnpm.cmd --filter @amc/web exec tsc -p tsconfig.json --noEmit`: PASS (0 errors).
  * `pnpm.cmd exec vitest run apps/api/src/http-logger.middleware.test.ts apps/web/src/lib/seo/palette.test.ts packages/shared/src/banner.test.ts`: PASS (3 test files / 7 tests passed in 1.64s).

---

## Premotio-Inspired 10-Section Landing Page, Studio BrandArt, Discipline Combiner & Device-Aware Preloader Increment â€” 8 November 2026

* **Design & Implementation Plans:**
  * [`docs/designs/branding_studio_3d_landing_plan.md`](designs/branding_studio_3d_landing_plan.md)
  * [`docs/designs/premotio_landing_implementation.md`](designs/premotio_landing_implementation.md)
* **Complete 10-Section Premotio-Inspired Landing Page (`apps/web/src/features/marketing/landing.tsx`):**
  * **Section A â€” Navigation (`shell.tsx`, `side-navbar.tsx`, `controls.tsx`):** Frosted glass sticky header, animated 3-bar burger morph button (`.burger-trigger`), slide-over RTL/LTR drawer, 3-icon squircle theme switcher (`Light`, `Dark`, `System`), and persistent 6-chapter HUD rail (`AmcMarkContainer`).
  * **Section B â€” Hero Section:** Masked typography, primary/secondary squircle CTAs, studio fact counters (`4` disciplines, `11` services, `EN / Ø¹`), floating studio preview frames (`BrandArt` compositions with scroll parallax), and full-viewport 3D AMC Mark stage.
  * **Section C â€” Product / Feature Showcase:** Asymmetric split-screen showcase of all 4 connected disciplines (`Marketing`, `Advertising`, `Consulting`, `Web Development`) with custom `BrandArt` visual demonstrations and direct service pills.
  * **Section D â€” Categories / Curated Visual Gallery:** Horizontal snap-scrolling gallery rail (`[data-gallery-track]`) displaying all 11 services with varied editorial proportions (`tall`, `wide`, `square`) alongside the 3 project possibility compositions.
  * **Section E â€” How It Works:** 4-step workflow (`Understand`, `Define`, `Create`, `Refine`) inside a glass process band with a scroll-scrubbed progress bar (`[data-process-progress]`).
  * **Section F â€” Advanced Features (`discipline-combiner.tsx`):** Interactive client island allowing visitors to toggle any combination of the 4 disciplines, updating a live orbital SVG chord diagram and filtering the connected services from `@amc/shared`.
  * **Section G â€” Cross-Device Experience:** Responsive device stage showcasing Desktop (`1440px`), Tablet (`768px`), and Mobile (`390px`) frames with scroll parallax (`[data-device-float]`).
  * **Section H â€” Configurable Engagement / Pricing (`engagement.ts` & `engagement.test.ts`):** Three bilingual tiers (`Focused`, `Connected`, `Partnership`) and a 5-row feature comparison table backed by `engagementConfig` (defaults to `null` indicative pricing so no unapproved fees are invented).
  * **Section I & J â€” Final CTA, FAQ & Dark Navy Footer:** Closing consultation CTA, squircle FAQ disclosures, and `data-theme="dark"` Navy footer with official `footer-logo-on-dark.svg`.
* **Device-Aware Preloader & Theme Favicons (`preloader.tsx`, `layout.tsx`, `controls.tsx`):**
  * Phone in Light mode displays the animated SVG pulse preloader (`data-variant="phone-light-pulse"`) with concentric pulsing squircle rings on warm Cream (`#FCF8F3`); Desktop/Tablet (and Dark mode) displays the 3D-extruded 5-piece AMC Mark preloader (`data-variant="studio-3d"`).
  * Dark mode uses the Orange favicon (`/favicon-orange.svg`) and Light mode uses the Dark Navy favicon (`/favicon-dark.svg`), synchronized both via media queries and dynamically on theme toggle.
* **Verification Evidence:**
  * `pnpm.cmd --filter @amc/web exec tsc -p tsconfig.json --noEmit`: PASS (0 errors).
  * `pnpm.cmd --filter @amc/api exec tsc -p tsconfig.json --noEmit`: PASS (0 errors).
  * `pnpm.cmd exec vitest run apps/web/src/features/marketing/engagement.test.ts apps/web/src/lib/seo/metadata.test.ts apps/web/src/lib/seo/palette.test.ts apps/api/src/http-logger.middleware.test.ts packages/shared/src/banner.test.ts`: PASS (5 test files / 13 tests passed).







## Liquid Glass and 3D Visibility Restoration - 8 November 2026

User-authorized specification: [liquid_glass_and_3d_restoration.md](designs/liquid_glass_and_3d_restoration.md). Findings and visual evidence: [review](reviews/liquid_glass_and_3d_restoration_review.md).

- Reproduced the missing desktop mark in both themes: full-size canvas, no page errors, invisible geometry. Fixed far-plane clipping (100 versus supplied camera distances >=640) with a scene-unit-appropriate frustum. Preserved the procedural five-piece geometry, official asset colors and supplied choreography; GLB remains a reference asset.
- Reserved a lit desktop model corridor, moved hero previews below it, mirrored the corridor for Arabic and retained physical C focus. Added lazy scene loading after media resolution, SVG loading/mobile/reduced-motion/failure fallback, readiness attributes, context-loss handling and on-demand rendering with resource cleanup.
- Replaced competing page-height progress writers with one section-measured timeline shared by scene/HUD; supports restored scroll, fonts, resizing and content changes.
- Added scoped liquid-glass styling and backed radius tokens, opaque/reduced-transparency fallbacks, 20px desktop/12px mobile blur, reflected edges and the navy footer artwork panel. Current typography, content and navy/orange/cream identity retained. Staff/booking component styling and all backend contracts remain unchanged.
- Centralized favicon ownership under the theme provider: dark uses favicon-orange.svg; light uses favicon-light.svg. Preserves dark default, saved/System choice, locale navigation and ICO/touch fallbacks. Removed obsolete hidden select mirror from theme controls.
- Portaled the shared drawer to avoid glass containing-block and horizontal overflow bugs; closed state inert, keyboard focus trapped/restored when open. Corrected homepage showreel ARIA/contrast, comparison-table keyboard scrolling, hero accessibility and chapter hit targets. Showreel media tracks/animation frames clean up and respect live reduced motion.

Observed validation:

- pnpm.cmd typecheck: PASS (5 tasks; final web TypeScript also passes in the final build).
- pnpm.cmd test: PASS (22 files / 57 tests, including 2 new semantic timeline tests; 18.93 seconds). Notification output came from mocked unit tests, not external delivery.
- pnpm.cmd build: PASS (4 tasks, 3 cached; final build 40.507 seconds, all 60 static outputs generated).
- Focused ESLint of changed implementation/hooks/browser tests: PASS, no errors. Existing monorepo pages-directory notice remains.
- pnpm.cmd lint: FAIL on the last full run with 8 pre-existing errors in untouched auth imports, API test types, preloader effect, supplied animation-module unused argument and elephant-goldfish-model CommonJS imports. Existing font/image warnings remain; no unrelated API/tooling repairs included.
- PLAYWRIGHT_BASE_URL=http://127.0.0.1:3300 pnpm.cmd test:e2e --workers=2: PASS, all 30 production browser tests in 1.5 minutes. Earlier runs exposed overflow/accessibility issues, a test locator selecting hidden drawer controls after locale navigation, and an oversized multi-page accessibility test exceeding 30 seconds. Implementation issues were fixed; tests now target visible header controls and split additional-page checks by locale/theme. No failing assertion was disabled.

Visual captures under docs/reviews/liquid-glass-evidence include EN/AR in light/dark, actual desktop model, phone SVG, settled open drawers and footer. Additional 320px and 768px screenshots were visually inspected. Browser coverage checks 320/390/768/1440, public pages, keyboard access, automated axe, locale/theme persistence, model/chapter behavior, initialization failure, context loss and SPA cleanup.

No database changes, database/staff-authenticated tests, deployment, external accounts, notifications, Git commit or push occurred. Local production marketing preview is http://127.0.0.1:3300/en and /ar; this does not establish backend/demo service availability.


## Full UI Redesign, Restored Sidebar and Larger Foreground Mark - 8 November 2026

Latest explicit user scope: restore the sliding menu and improve the chapter rail; redesign the public website, booking and staff screens. Applied the named engineering/UI skills while retaining the current approved navy/orange/cream identity and typography. Specification: [studio_public_redesign.md](designs/studio_public_redesign.md). Review: [studio_ui_redesign_review.md](reviews/studio_ui_redesign_review.md).

Implemented:

- Restored directional sidebar translation and staggered links, with a clipped portal viewport so the off-canvas panel does not widen the document. Closed content remains inert; open menus lock scroll, trap/return focus and make main content inert. Added consistent bundled Solar navigation/close/theme/locale/chapter icons and a compact single-row phone header with a morphing burger.
- Redesigned the homepage into an open editorial hero, new typography rhythm, compact preview strip, revised service/gallery/process/engagement/FAQ surfaces, and matching public about/work/contact/services/detail/credits presentation. Original content, artwork and theme favicon mapping retained.
- Increased model stage maximum width from 560px to 760px and brought the camera to 84% of its previous distance. Foreground scene sits above decoration while HTML controls/copy remain readable and interactive. Native semantic chapter timing, reduced motion, mobile SVG, loading/error/context-loss fallback and cleanup are preserved. Chapter rail now has icons, focus labels and arrow/Home/End keyboard focus.
- Redesigned booking progress as four numbered cards, rounded forms/slots and confirmation/management panels. Staff login uses an official-brand card; calendar/analytics/settings/account use role-aware navigation, operational surfaces, metric/calendar cards and bounded keyboard-scrollable tables. Existing staff review, conflict/idempotency and API permission behavior is unchanged.
- Rebuilt the capped preloader with official theme artwork, a short CSS depth entrance/progress line and locale-switch restart. Removed its synchronous effect-state lint error and an unused internal animation argument without changing choreography.
- Fixed mobile minimum-width overflow in staff account grids and nested working-hours time controls. Narrow hours settings stack vertically. Inputs and CTA sizes remain usable at 320px.

Observed validation:

- pnpm.cmd typecheck: PASS (5 tasks, 4 cached; 5.756 seconds). Final production build also checks web TypeScript.
- pnpm.cmd test: PASS (22 files / 57 unit/API tests, 29.01 seconds). Mock notification logs do not represent external deliveries.
- pnpm.cmd build: PASS (4 tasks, 3 cached; final build 48.744 seconds, all 60 static outputs generated).
- Focused ESLint of changed implementation and tests: PASS, no errors. Monorepo pages-directory notice and image/font advisories remain.
- pnpm.cmd lint: FAIL with 6 existing errors in untouched auth imports, API test any types and elephant-goldfish-model CommonJS imports (15 warnings). Related preloader/animation errors from the earlier increment were fixed.
- PLAYWRIGHT_BASE_URL=http://127.0.0.1:3300 pnpm.cmd test:e2e --workers=2: PASS, all 54 production browser tests in 2.5 minutes. Includes 30 public regression tests, 5 navigation/chapter-rail tests and 19 browser-mocked operational tests. The 16 operational layout cases cover all combinations of 320/390/768/1440, EN/AR and light/dark across booking, calendar, analytics, settings, account/security and login; additional tests exercise the booking/management flow and existing receptionist navigation limits.

Local PostgreSQL connection: ECONNREFUSED. Docker Linux engine: not running. No real staff-authenticated/database suite was claimed. Operational browser tests use isolated, clearly labeled synthetic route fixtures without writing an account, appointment, schedule policy or other record. Their results establish presentation/client interactions, not live authentication or booking transaction correctness.

No backend contracts, Prisma schema/migrations, business policy, external account, real email/Slack notification, deployment, commit or push changed. Local production frontend preview: http://127.0.0.1:3300/en and /ar. Backend/demo service availability is separate.

Final redesign evidence: public screenshots under docs/reviews/studio-redesign-evidence and explicitly labeled synthetic operational screenshots under docs/reviews/studio-operations-evidence. No failing accessibility assertion was disabled.

Final visual review completed for the enlarged rendered mark, phone header/menu, EN/AR sidebar, and synthetic booking, login, account, analytics, calendar and settings captures. The production frontend remains available locally on port 3300.

## Design-System Corrections - 8 November 2026

Latest user instructions supersede the earlier dark-default and small-radius choices: System is now the default, dark navigation is orange, dark UI shadows/scene halo are removed, and dark artwork uses cream/orange. Specification: [design_system_correction.md](designs/design_system_correction.md). Findings and evidence: [review](reviews/design_system_correction_review.md).

- Replaced three theme controls with one accessible System -> Light -> Dark cycle. Saved preferences, OS changes, locale navigation and centralized favicon mapping remain supported. Removed the desktop menu trigger while retaining the phone sliding menu.
- Replaced the small mark and manual navbar text with full official theme-aware SVG lockups. Rebuilt the footer into brand/services/booking columns and a compact secondary row.
- Corrected invalid font stacks and self-hosted official Fira Sans, Cairo and Rock Salt WOFF2 assets with their original licenses. Verified actual loaded English/Arabic fonts; no runtime Google Fonts requests remain. Updated credits to the fonts actually served.
- Preserved the five-piece 3D model/choreography while updating its instance-local materials in place for cream/orange dark and navy/orange light. Added a matching dark SVG fallback without modifying original artwork.
- Rebuilt homepage discipline/service/photo/process/engagement/FAQ grids with responsive columns, readable surfaces and explicit 16px control, 28px card and 40px feature-panel squircle corners. Restored visible content opacity during scroll. Dark CSS box/text shadows are removed; keyboard focus outlines remain.

Observed validation for this increment:

- `pnpm.cmd typecheck`: PASS, 5 tasks, 5.178 seconds. Final production build also checks web TypeScript.
- `pnpm.cmd test --maxWorkers=1`: PASS, 22 files / 57 tests, 13.99 seconds. The initial concurrent run hit an existing auth-test setup timeout (53 passed / 4 skipped); the serial rerun passed without changing assertions or timeouts. Mock notification output does not represent delivery.
- `pnpm.cmd build`: PASS, 4 tasks, 3 cached, 1 minute 36.561 seconds; all 60 static outputs generated.
- Focused ESLint of changed implementation and browser tests: PASS. Existing monorepo pages-directory notice remains.
- `pnpm.cmd lint`: FAIL, 6 pre-existing errors in untouched auth imports, API test any types and elephant-goldfish CommonJS imports, plus 15 warnings. No unrelated repair is included.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3302 pnpm.cmd test:e2e --workers=2`: final complete run PASS, 56/56 tests in 2.3 minutes. Initial complete run: 55/56 passed; one 30-second timeout in the six-screen EN/dark/320 mocked operations case while capture work was also running. That exact case passed independently in 5.1 seconds (runner total 7.9 seconds), then again in the full run, without any assertion or timeout change.

Final evidence is under `docs/reviews/design-system-evidence/`: EN/AR, both themes, rendered model, mobile SVG, settled mobile drawer/footer and separate discipline/service/process/FAQ grids. Visual inspection confirmed the model itself, full-size logo lockups, orange navbar, Cairo Arabic, footer layout and rounded panels. Browser coverage includes 320/390/768/1440 layouts, keyboard access, axe contrast/accessibility, theme persistence/System changes, locale navigation, model poses/fallbacks and navigation cleanup.

No database, API contract, booking policy, migration, account, notification, deployment, commit or push changed. Operational browser checks use labeled synthetic fixtures; live database/authentication success is not claimed. The user's localhost:3000 dev server was left running. A separate production preview is available at http://127.0.0.1:3302/en and /ar. Port 3300 was already occupied by an older preview; an aborted run there was discarded before the correct port 3302 run.

## Restored Card Stack, Localized Identity, FAQ and Social Footer - 8 November 2026

Specification: [stack_faq_social.md](designs/stack_faq_social.md). Review: [stack_faq_social_review.md](reviews/stack_faq_social_review.md).

- Restored the four service-pillar cards as a GSAP/native-sticky overlap sequence with gentle depth scaling, desktop artwork/copy composition and compact phone cards. Enabled only when cards fit; reduced motion and short screens retain normal document flow. Font readiness precedes measurement; navigation/media cleanup reverts transforms and sticky state. Focused cards rise above overlapping siblings.
- Restored an original SVG mark plus real localized almorad | AMC / Ø§Ù„Ù…Ø±Ø§Ø¯ | AMC wording in header/drawer. Dark orange navbar uses navy type and the supplied all-navy SVG mark for contrast. Existing System theme control and desktop/mobile menu behavior remain intact.
- Added bilingual, server-rendered /faq routes with four approved questions, native keyboard disclosures, metadata/alternates and sitemap membership. Added FAQ links to shared navigation, footer and homepage.
- Reduced footer to a compact brand/action row and lower navigation/copyright. Added a five-icon animated social disclosure, inert closed links, reduced-motion behavior, Escape/focus/outside close and safe external navigation. Uses user-supplied LinkedIn/Facebook/TikTok URLs. Instagram/YouTube are explicitly labeled demo links to platform homepages at the user's request, not claimed company profiles. Optional server SOCIAL_*_URL settings replace defaults.

Observed validation:

- `pnpm.cmd typecheck`: PASS, 5 tasks / 4 cached, 31.978 seconds. Initial sandboxed attempt could not access SWC native binding cache; rerun with native-cache access passed. Final production build also checks web TypeScript.
- `pnpm.cmd test --maxWorkers=1`: PASS, 22 files / 57 tests, 28.39 seconds. Notification logs were mocked; no delivery occurred.
- `pnpm.cmd build`: final PASS, 4 tasks / 2 cached, 1 minute 21.111 seconds, all 62 static outputs generated including EN/AR FAQ. Earlier builds also passed before the compact FAQ label, supplied monochrome navbar SVG and final stack/scene paint-layer corrections.
- Focused ESLint covering changed components, FAQ route, social configuration, sitemap and browser tests: PASS with the existing monorepo pages-directory notice.
- `pnpm.cmd lint`: FAIL with 6 pre-existing errors in untouched auth/API test/CommonJS tooling files and 13 warnings. No new error in this increment.
- Initial dev browser checks: 18/20 passed. All four actual overlapping-card/navigation cases passed; two EN dark tablet/desktop FAQ cases found low-contrast inherited navbar subtitle color. Corrected the subtitle to navy; assertions were retained. Complete production run on port 3303: `pnpm.cmd test:e2e --workers=2`, PASS 76/76 tests in 3.2 minutes. After the supplied all-navy navbar SVG correction, the focused 22-test UI suite also passed in 49.6 seconds. Visual review then caught the isolated card stack painting below the 3D stage; raising the stack container to layer 25 above scene layer 20 fixes the obscured copy. A layer-order browser assertion was added and affected UI/3D checks are rerun against the final build below.

Production frontend preview: http://127.0.0.1:3303/en and /ar; FAQ: /en/faq and /ar/faq. Existing localhost:3000 dev server was left running. No deployment, database/schema/API change, real booking/account write, live staff-authentication verification, external account connection, notification, commit or push occurred. Existing operational browser tests use labeled synthetic fixtures and do not establish database availability or transaction correctness.

Final affected browser verification after the stack paint-layer correction: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3303 pnpm.cmd test:e2e tests/e2e/design-system.spec.ts tests/e2e/stack-faq-social.spec.ts tests/e2e/public-experience.spec.ts --workers=2 --output=test-results-final-ui --reporter=list`: PASS 33/33 in 1.5 minutes. Includes the new layer-order assertion, actual overlapping cards/cleanup, FAQ/social accessibility and all existing 3D rendering/pose/fallback/context-loss/theme regressions. The earlier complete 76-test result remains in the HTML report; final scoped output is separate.

Final visual evidence: `docs/reviews/stack-faq-social-evidence/`, covering both locales/themes, desktop and 390px phone header, actual overlapping cards, FAQ, compact footer and expanded five-icon social tray. Reviewed the card copy after the layering fix; the model no longer covers it. Original 3D hero remains visible and the phone uses the official SVG fallback. Supplied all-navy small mark stays complete against the orange navbar.

## Reference Glass, Service Motion and Mobile/Calendar Completion â€” 8 November 2026

Specs: [reference glass/booking/services](designs/reference_glass_booking_services.md), [mobile/calendar completion](designs/mobile_glass_calendar_completion.md). Findings, exact boundaries and remaining gates: [review](reviews/reference_glass_mobile_calendar_review.md).

Implemented shared reference-style glass panels; content-above-scene layering; viewport-safe model framing; interleaved eleven-service scroll stack with alternating side/rotation motion; shadcn/Radix booking dropdowns; configured/unavailable onsite UI and optional approved map; restored mobile SVG/drawer identity and glass controls; social strip above navbar; back-to-top; FAQ rotation defect fix and simple answer transition; local themed calendar dialog composed with existing shadcn Button.

The standard shadcn React DayPicker/Radix Popover packages were **not installed**: registry requests failed EACCES and installation was stopped. The local calendar is an interim implementation, not the requested standard package composition. Verified office address/Google Maps link also remain pending; running API inspection found onsite disabled and all office/map fields null. No live policy/database change was made.

Actual results:

- Earlier `pnpm.cmd typecheck`: PASS, 5 tasks, 44.754 seconds. Final web `pnpm.cmd --filter @amc/web exec tsc --noEmit`: PASS. Final direct TypeScript command `node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json`: PASS, repeated after final source edits.
- Focused ESLint: PASS across new/changed select, office, booking, motion, controls, calendar, scene and browser checks; existing pages-directory notice only.
- Final `node node_modules/vitest/vitest.mjs run --maxWorkers=1`: PASS, 22 files / 58 tests, 23.28 seconds. Earlier pnpm unit run: 58 passed in 17.98 seconds. Notification logs were mocked.
- Full lint during this increment: FAIL with the same 6 pre-existing unrelated errors and 13 warnings.
- Initial onsite UI browser cases: 8/8 passed EN/AR Ã— 390/1440 Ã— configured/unconfigured synthetic fixtures. Service cases exposed clipping, scroll measurement and missing-blur issues; source fixes followed. No final browser PASS is claimed. Newly added 6-case mobile/calendar/FAQ checks have not run.
- Final production build attempt: BLOCKED before compilation by inaccessible SWC native cache (ERR_SWC_NATIVE_CACHE). Do not reuse earlier build results as validation for this increment.
- Elevated browser diagnostic: automatic approval review could not complete because its usage limit was reached (tool showed 4:14 PM reset). This was explicitly a review-system failure, not a safety determination. No bypass attempted. Fresh visual QA/screenshots and final public/operational browser checks remain outstanding.

Source implementation is saved, but final visual/production validation and the exact standard shadcn calendar dependency integration are incomplete. Existing localhost:3000 dev server remains untouched. Port 3303 serves an older production build, not this increment. No API/schema/database policy mutation, deployment, external-account connection, real booking/account write, notification, commit or push occurred.

## Sidebar Social Links, Return to Reading and FAQ Refinement â€” 8 November 2026

Latest authorized scope: distinct sidebar social button with six supplied official profiles including X, reversible scroll-to-top action, and an improved FAQ presentation/animation. Specification: [sidebar_social_reading_faq.md](designs/sidebar_social_reading_faq.md). Review/evidence: [sidebar_social_reading_faq_review.md](reviews/sidebar_social_reading_faq_review.md).

- Removed the above-navbar social strip. Added a floating vertical social tab with named links and a compact two-column phone popup; footer keeps its separate six-icon tray. Replaced all defaults with the exact supplied Facebook, LinkedIn-company, Instagram, X, TikTok and YouTube URLs. No default demo links remain. Optional platform-host-validated configuration includes SOCIAL_X_URL.
- Moved the reading control away from the chapter label. It saves the offset before going up, stays visible at top with downward arrow/Return to reading position, then restores the saved offset. Resets per route/new manual reading path and clamps to current page bounds. Smooth and reduced-motion behavior are covered.
- Replaced the FAQ grid on home and /faq with shared numbered rows, readable opaque theme surfaces, upright text, chevrons and cancelable height/opacity animation. Native details/summary and server-rendered answers preserve no-JavaScript access. Added a noscript preloader-hide fallback after a browser test found the overlay blocking content without scripts.
- Broader checks closed earlier reference/mobile defects: compiled glass filters now retain standard CSS after WebKit prefixes; tablet/mobile dark language labels use readable foregrounds; calendar opening and arrow navigation commit focus synchronously, including across month rendering. No standard calendar packages were added; the previous local-calendar versus standard shadcn dependency distinction remains.

Actual validation:

- `pnpm.cmd typecheck`: PASS, 5 tasks / 4 cached, 10.681 seconds. Final web direct TypeScript also passed, and final production build checks web TypeScript.
- `node node_modules/vitest/vitest.mjs run --maxWorkers=1`: PASS, 22 files / 58 tests, 28.72 seconds. Notification output is mocked, not external delivery.
- Final `pnpm.cmd build`: PASS, 4 tasks / 3 cached, 47.941 seconds; 62 static outputs generated. Earlier builds in this increment also passed before regression-driven fixes.
- Focused ESLint of implementation and updated browser tests: PASS; existing monorepo pages-directory notice only. Full ESLint: FAIL with 6 pre-existing unrelated errors and 13 warnings.
- Initial dev acceptance run: 5/10 passed. Four Arabic tests were intercepted by Next.js's development toolbar at the lower-left reading button; production verification avoids that dev-only overlay. The no-JavaScript test found the real preloader issue, now fixed.
- First complete production run: 89/104 passed, including all 10 new acceptance cases. Failures exposed earlier tablet contrast, calendar focus and missing standard blur. Second complete run: 100/105 passed, including all 11 sidebar/reading/FAQ cases, all 3D/fallback/navigation cleanup, service blur/motion and tablet contrast cases. Four phone-calendar cases still needed synchronous arrow focus; one Arabic dark desktop footer case timed out with the preloader intercepting clicks. Final affected acceptance run follows below; no assertions or timeouts were weakened.

Approved browser/build access resumed after the earlier approval-review limit reset. Existing localhost:3000 dev server was not terminated. Final production frontend preview is http://127.0.0.1:3304/en and /ar (FAQ: /en/faq and /ar/faq). Screenshots under docs/reviews/sidebar-reading-faq-evidence cover EN/AR, light/dark, desktop/390px phone, expanded sidebar/FAQ and return control.

No database/schema/API policy change, real appointment/account write, external-account connection, notification delivery, deployment, commit or push occurred. Operational browser tests use isolated labeled fixtures. Live onsite activation still depends on verified office details and existing staff-reviewed configuration; UI fixture results do not establish real booking/database availability.

Final affected acceptance run on the exact final build: PASS, 20/20 in 45.8 seconds. Command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3304 node node_modules/@playwright/test/cli.js test tests/e2e/mobile-calendar-faq.spec.ts tests/e2e/sidebar-reading-faq.spec.ts tests/e2e/foundation.spec.ts tests/e2e/stack-faq-social.spec.ts --grep 'mobile identity|sidebar socials|FAQ answers|FAQ height|smooth scroll|dark 768px|FAQ, compact footer and social disclosure ar dark 1440' --workers=2 --output=test-results-final-acceptance --reporter=list`. Covers all 11 new acceptance cases and every previously failing phone-calendar/tablet/footer case. All six calendar cases pass after synchronous focus updates; isolated Arabic dark desktop footer passes in 2.3 seconds. Final targeted output is separate from the earlier complete-run HTML report. No claim is made of a clean complete 105-test run after the final calendar change; the unaffected tests passed in the preceding complete run.

Final visual inspection completed for EN/AR light/dark desktop/phone captures: sidebar has named six-platform links, FAQ answers are upright and readable, phone popup fits viewport, and top action remains available with the return arrow. Screenshot evidence was refreshed against the final port 3304 build. The standard date-picker dependency and verified live-onsite-input limitations from the earlier increment remain documented; neither was silently represented as complete here.

## Dark Artwork, Unified Squircles and Theme Stability â€” 8 November 2026

Applied the user-named AMC UI/UX and CI/CD verification skills within the authorized UI scope. Spec: [theme_squircle_stability.md](designs/theme_squircle_stability.md). Findings/evidence: [theme_squircle_stability_review.md](reviews/theme_squircle_stability_review.md).

- Removed the solid-navy dark-navbar image and now display the existing cream/orange mark, matching 3D/fallback artwork, on a small navy tile so both colors remain distinct against orange. Original artwork paths remain unchanged. Light/dark, phone/drawer and localized wording are retained.
- Added shared --radius-control=20px and applied the sidebar curve to buttons, language/theme controls, badges, icon wells, chapter rail/buttons, return-to-reading action, social anchors, select triggers/items and slot labels across public/operational UI. Native squircle enhancement is progressive; card/panel hierarchy remains separate.
- Hid social-tray scrollbar chrome in standard/WebKit CSS and clipped horizontal animation overflow. Repeated opening preserves native vertical scrolling on short screens, six links, focus behavior and document width.
- Added a synchronous head theme initializer and a layout-effect paint guard under the existing provider. Initial browser sampling reproduced empty root theme classes on ENâ†”AR commits even with the head initializer alone; the guard restores theme attributes before the route paints. Disabled preference-change transitions and hid only the unresolved control icon until readiness. System default, saved preferences, live OS changes and singular favicon ownership remain supported.

Actual validation:

- Initial responsive dev cases: PASS 8/8 for EN/AR Ã— 320/390/768/1440 artwork/shape/repeated-social-open/axe checks. Initial 4 frame-sampling cases failed and recorded the root-class flash. After adding the layout-effect guard, all 4 frame cases PASS in 26.8 seconds, with no assertion changes. Covers saved Dark against light OS, System-dark, locale changes and reloads at 390/1440.
- `pnpm.cmd typecheck`: PASS, 5 tasks / 4 cached, 4.187 seconds. Final production build also checks web TypeScript.
- `node node_modules/vitest/vitest.mjs run --maxWorkers=1`: PASS, 22 files / 58 tests, 19.98 seconds. Notification output was mocked, not actual delivery.
- Focused ESLint of implementation and updated browser tests: PASS; existing monorepo pages-directory notice only. Full ESLint: FAIL with the same 6 unrelated existing errors and 13 warnings.
- `pnpm.cmd build`: PASS, 4 tasks / 3 cached, 47.48 seconds; 62 static outputs generated.
- Final complete production browser results follow below after the actual run. No prior complete-run PASS is substituted for this increment.

Existing Node 24/pnpm 11.11.0 pins and validate/security workflow contracts were inspected. No dependency, workflow, API, schema, database settings, migration, real appointment/account, external notification, deployment, commit or push changed. No remote CI/security scan, live database integration or backup/restore success is claimed. Existing lint errors remain a release gate. Production frontend preview for this increment: http://127.0.0.1:3305/en and /ar; existing localhost:3000 dev server was left running.

Final production browser outcome: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3305 pnpm.cmd test:e2e --workers=2` completed with 116/117 PASS in 5.1 minutes. All 12 new theme/artwork/shape/social cases passed, including all frame-sampled locale/reload checks. One pre-existing six-screen operational fixture case (`mocked booking and operations UI ar light 768`) exceeded 30 seconds. Exact isolated rerun with unchanged assertions/timeout: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3305 node node_modules/@playwright/test/cli.js test tests/e2e/operations-design.spec.ts --grep 'mocked booking and operations UI ar light 768' --workers=1 --output=test-results-theme-ops-recheck --reporter=list`: PASS 1/1, 7.3-second test / 8.8-second runner. The complete run remains recorded as 116/117 rather than a clean 117-test first pass; isolated output is separate from the HTML report.

Final visual review: EN/AR light/dark at 1440 and 390, official cream/orange dark logo, shared control corners, mobile drawer and settled second social opening were captured and inspected under `docs/reviews/theme-squircle-evidence/`. The second-open social tray has no visible scrollbar; the fixed panel still keeps its links and keyboard access. Browser matrix additionally covers 320/768 and sampled root theme frames through locale navigation/reload. Readiness, System preference, persisted choice, favicon, 3D/fallback, service motion, calendar and fixture operational regressions passed except the documented isolated-timeout case that passed on rerun. No further source changes followed this production build.


## Transparent Dark Logo, Route Consistency and Contact Form ? 8 November 2026

Specification: [contact and route consistency](designs/contact_and_route_consistency.md). Findings/evidence: [review](reviews/contact_route_consistency_review.md).

- Removed the added navy backing tile around the dark header mark at both breakpoints. Supplied cream/orange SVG paths and current navy/orange/cream website identity remain intact.
- Extended shared 20px squircle controls to all form fields, native dialogs, dropdown surfaces, FAQ rows/toggles and reading labels. Shared 220ms disclosure motion applies to FAQ, drawer, socials and dropdown/dialogs; reduced motion and native focus/Escape behavior remain supported. Dialog closing uses progressive discrete CSS transitions where supported.
- Added bilingual contact form with validation/focus, consent, pending, retryable errors/rate-limit messages, idempotent retry and explicit success/reset. Replaced contact placeholder copy with service/meeting guidance; real contact details remain configuration-driven.
- Added shared strict submission schema, same-origin signed Next proxy and Nest contact endpoint, existing origin/proxy/rate-limit protection, honeypot and additive Prisma ContactInquiry storage with consent timestamp and unique key/hash. Database failure never produces an accepted acknowledgement; no emails/Slack or appointment actions were introduced.

Actual validation:

- Prisma generate/validate: PASS. Initial sandbox EPERM for generated client was resolved with normal approved generation. No migration applied to the existing application database.
- Workspace typecheck: PASS, 5 tasks / 2 cached, 2m25.332s; sandboxed SWC cache failure preceded approved retry. Final build checks later frontend refinements too.
- Unit/API tests: PASS, 23 files / 62 tests, 17.46s. New API tests use fake persistence with real Nest guards; existing notification logs are mocked.
- Isolated PostgreSQL: PASS. Created fresh local `amc_contact_1794159716633_test`, applied exact contact SQL and verified real ContactService/Prisma storage, Arabic/consent timestamp, normalization, retries/concurrent duplicates, changed-payload conflict and honeypot discard. Two synthetic example.invalid records exist only in that test database. Reproducible checker saved under scripts/check-contact-storage.mts. Existing `amc_dev` was not migrated/reset.
- Focused ESLint: PASS across changed components/API/contracts/tests, existing pages-directory notice only. Full lint retains 6 unrelated pre-existing errors and 13 warnings from its run before the touched proxy?s unused suppression was removed.
- Final production build: PASS, 4 tasks / 3 cached, 1m12.313s, 63 outputs including the contact API proxy. Earlier production build also passed before final copy/motion refinements.
- Initial new browser acceptance: PASS 16/16 in 1.6m. Added four dialog motion checks afterward. Final complete production browser result follows after the actual run.

Preview: http://127.0.0.1:3306/en/contact and /ar/contact. Fresh EN/AR, both-theme phone/desktop contact/validation/header captures are under docs/reviews/contact-route-evidence/. Existing localhost:3000 dev server was left running. No deployment, real business inquiry/appointment write, external connection, notification, commit or push occurred.

Activation boundary: migration `20261108190000_contact_inquiries` is written and tested in isolation; applying it to the existing application database remains outstanding. Real browser-to-database submission is not claimed. No operational inbox/retention workflow or notification delivery was added. No existing booking/staff policy was altered.


Final complete production browser verification: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3306 pnpm.cmd test:e2e --workers=2`: **PASS 137/137 in 4.9m**. Includes all 20 new route/contact/dialog checks, 232 route-sweep visits (29 paths ? two locales ? two themes ? two widths), existing 320/390/768/1440 accessibility/layout checks, real rendered 3D/poses/fallback/context-loss/navigation cleanup, FAQ rapid toggles, sidebar/reading return, shadcn dropdown/local calendar behavior, theme favicon/System/preferences and frame-sampled locale stability. All operational/booking and form-submit browser writes are synthetic fixtures. No assertions/timeouts were weakened; only the deliberately broad 29-page sweep has its own 120-second budget. No source changes followed the final production build; subsequent additions are the standalone isolated database checker and review/status records. Full browser report is preserved under playwright-report/.

The existing application database remains unchanged: applying the tested additive contact migration to the intended application database is still necessary before real submissions can be accepted. Do not interpret the passing synthetic browser flow or isolated test database as a live browser-to-amc_dev confirmation.


## Orange Navbar at Every Breakpoint and Phase 1 Launch Plan - 8 November 2026

Review: [orange_navbar_phase_1_review.md](reviews/orange_navbar_phase_1_review.md). Plan: [phase_1_landing_contact_crm_launch.md](designs/phase_1_landing_contact_crm_launch.md).

- Added a header-only cream/navy SVG variant: only the orange segment becomes #0B1F44. XML geometry/viewBox comparison PASS; original artwork remains intact. Header has an explicit onOrange prop, while drawer/static/3D assets retain original theme variants.
- Corrected the dark header across every breakpoint to #F7761E, with navy text, divider, language/theme/burger controls. Updated existing logo tests and added navbar/icon palette assertions plus orange route checks.
- Prepared a researched Phase 1 landing/contact launch plan: custom bilingual form, durable PostgreSQL, HubSpot contact sync and Resend notifications, scheduled retry recovery, staging/production separation, scope gating, performance/SEO/privacy, release approval and rollback. No service purchase or provider installation occurred.
- Inspection discovered pre-existing draft contact delivery/HubSpot code and a contact-delivery migration beyond the preceding recorded status. Preserved them; the plan records release gaps instead of treating drafts as a verified live connection. In particular mock email acknowledgements must not become production SENT, dispatcher claims/retries and actual provider property/response checks need release verification, and the scheduled maintenance configuration does not currently invoke the POST delivery drain.

Actual verification: focused ESLint PASS; unit suite PASS 24 files / 69 tests in 30.16s (notification providers mocked); final build PASS 4 tasks / 3 cached in 1m6.163s with frontend/backend TypeScript and 63 outputs. Earlier build passed before final mobile icon selector adjustment. This increment did not rerun full lint; its previously documented unrelated failures are not claimed fixed.


Final affected browser run: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3307 node node_modules/@playwright/test/cli.js test tests/e2e/theme-shape-stability.spec.ts tests/e2e/design-system.spec.ts tests/e2e/contact-route-consistency.spec.ts --workers=2 --reporter=list --output=test-results-orange-navbar`: PASS 34/34 in 1.4m. Includes both locales, 320/390/768/1440 dark navbar/axe, persisted/System theme and sampled locale flashes; complete 29-route phone/desktop light/dark sweeps; contact validation/retry fixtures; normal/reduced-motion dropdown/calendar behavior. No assertions/timeouts were weakened. No complete 137-test rerun is claimed for this increment.

Final evidence: docs/reviews/orange-navbar-evidence/ contains eight EN/AR dark header screenshots at four widths plus two phone drawer captures. Visually inspected desktop English and phone Arabic: orange navbar, cream/navy header mark, navy readable controls and transparent logo backing. Drawer retains the cream/orange mark on navy glass. Production preview: http://127.0.0.1:3307/en and /ar. Existing localhost:3000 development server was not stopped.

No production deployment, existing database migration, external account connection, CRM write or actual notification send was performed. The new Phase 1 plan is a proposal and release checklist, not evidence that the draft CRM/email integration is configured or launch-ready.


## Landing UI/UX Overhaul (TV Monitor Showreel, 3D Multi-Animation Stage, Leadership & Team Showcase, Finale Grid & Smooth FAQ) â€” 8 November 2026

Specification: [landing_ui_ux_overhaul_rfc.md](designs/landing_ui_ux_overhaul_rfc.md).

- **Wider TV-Screen Broadcast Showreel (`studio-media.tsx` & `landing.tsx`)**: Stacked the Chapter 02 Manifesto header above the showreel (`manifesto-stacked`, `manifesto-header`, `manifesto-tv-wrap`) to prevent left-column headline clipping, added kinetic `Lines` text animation, and upgraded `StudioShowreel` into a 16:9 `1280x680` TV broadcast monitor (`lp-tv-unit`) with an SVG bezel/glare overlay (`lp-tv-svg-overlay`) and SVG pedestal stand (`lp-tv-pedestal`).
- **3D Logo Multi-Animation Stage (`amc-mark-scene.tsx` & `discipline-combiner.tsx`)**: Added continuous 4-phase idle/autoplay animation cycling in `AmcMarkScene` when not scrolling, and upgraded `DisciplineCombiner` from a static 2D SVG diagram into a fixed-canvas 60FPS 3D extruded AMC logo + orbiting discipline node stage (`lp-combiner-3d-stage`) with 4 distinct auto-cycling 3D animations (`01 3D Orbit & Layer Depth`, `02 Exploded Architecture`, `03 Kinetic Signal Wave`, `04 360Â° Dimensional Turn`) and manual mode switcher controls.
- **Re-Gridded Finale Banner & Smooth FAQ Transition (`landing.tsx` & `faq-accordion.tsx`)**: Re-organized the Chapter 06 finale banner into a balanced 2-column grid (`finale-banner-grid`), and enhanced `FaqAccordion` with smooth Web Animations API height/opacity/translateY transitions (`380ms cubic-bezier(0.16, 1, 0.3, 1)`), 180-degree chevron rotation, and gold active styling.
- **Leadership & Studio Team Section Replacing `06 â€” Engagement` (`team-showcase.tsx` & `landing.tsx`)**: Replaced the homepage `06 â€” Engagement` pricing/comparison section with a bilingual `TeamShowcase` component featuring an executive spotlight card for **Ahmed Salah (Founder & CEO)** and 3 practice leads with custom luxury SVG portraits (`ExecutivePortraitSvg`).
- **Production Zod Validation & Vercel Services Config**: Added root `vercel.json` multi-service routing, RFC 5322 email/phone Zod validation in `@amc/shared`, bilingual per-field contact form errors in `contact-form.tsx`, and brand-token email layout updates in `email-layout.ts`.

Actual verification:
- `pnpm.cmd typecheck`: PASS, 5/5 tasks successful (zero TypeScript errors).
- `pnpm.cmd lint`: PASS, 0 errors (12 existing image/directive warnings).
- `pnpm.cmd --filter @amc/web test`: PASS, exit code 0.

## Compact Team Restoration, Logo Autoplay and Gallery Motion â€” 9 November 2026

Latest user correction: restore the earlier team structure and simple creative scroll motion, controlling executive size and width. Design: [logo_team_gallery_motion.md](designs/logo_team_gallery_motion.md). Review: [logo_team_gallery_motion_review.md](reviews/logo_team_gallery_motion_review.md).

- Restored existing scroll-card entrance, earlier team header wording and simple vertical executive cards. CEO card maximum 960px, portrait 260px desktop/tablet and 200px phone. Co-CEO/COO portraits capped at 220px tall. Five equal director cards use three/two/one columns. Section capped at 1120px. Existing edited profile names/content preserved; draft profiles and illustrations remain labeled placeholders.
- Replaced deprecated SVGLoader.createShapes with path.toShapes. Integrated supplied timed ripple/C-ring/full-turn autoplay before first scroll, damped handoff, hidden-tab pause, settled-renderer stop, original artwork/theme/fallback/disposal behavior. Combiner canvas pauses offscreen and respects reduced motion. Added gallery card tilt/settle and clipped artwork parallax.
- Added Meet the team to header/drawer, ten localized section targets and shared timeline metadata. Browser verification found combined root scroll padding/anchor margins made rail clicks land before the active boundary; corrected the explicit rail offset and anchor margin.

Actual validation:

- `pnpm.cmd typecheck`: PASS 5 tasks, 2m8.176s after sandbox native-cache failure and approved retry. Final build also checks frontend TypeScript after restoration.
- Full lint: PASS, zero errors / 12 existing warnings. Focused final implementation and browser-test lint: PASS. No lint warning cleanup outside scope.
- `pnpm.cmd run test`: PASS 24 files / 69 tests, 123.46s. Notification providers mocked.
- Exact final `pnpm.cmd run build`: PASS 4 tasks / 3 cached, 42.82s, frontend TypeScript and 62 generated pages. No application source changes followed.
- Initial affected browser suite: 27/33 PASS, revealing the real rail offset issue plus invalid screenshot equality for a transparent canvas. Final application suite on port 3311: 32/33 PASS in 1.9m; all team/layout/navigation/accessibility/WebGL/fallback regressions passed, remaining failure was transparent-canvas screenshot comparison.
- Corrected renderer test counts WebGL clear calls: verifies active autoplay and zero additional renders after settling, preserving visual autoplay comparison and no deprecation/page-error checks. Indexed-draw-only instrumentation was discarded because it missed non-indexed geometry. Isolated corrected test PASS 1/1 in 15.0s.
- Final team/logo acceptance: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3311 node node_modules/@playwright/test/cli.js test tests/e2e/logo-team-gallery.spec.ts --workers=2 --reporter=list --output=test-results-team-acceptance-final`: PASS **17/17 in 1.1m**, using one worker because the file is sequential. EN/AR Ã— light/dark Ã— 320/390/768/1440, measured widths/heights/overflow, axe, header/drawer team navigation, all added rail targets, autoplay and idle rendering. Full repository E2E was not rerun; the earlier final 32/33 result is retained separately.

Visual evidence under `docs/reviews/logo-team-gallery-evidence/`: inspected EN/AR both themes desktop and phone plus executive/director grids and normal-motion gallery. Local preview: http://127.0.0.1:3311/en#chapter-team and /ar#chapter-team. No database/API-policy changes, migrations, external account connections, deployment, commit or push were performed by this task.

## Portrait Directors, Specialty Icons and Six-Mockup Removal â€” 9 November 2026

Latest user instruction supersedes the horizontal director-card prototype. Design: [directors_scroll_reel.md](designs/directors_scroll_reel.md). Review: [directors_scroll_reel_review.md](reviews/directors_scroll_reel_review.md).

- Removed only the six homepage mockup cards (identity system, outdoor campaign, digital flagship, strategy board, commerce experience and stage direction). Original SVG files remain intact. TV showreel, eleven-service gallery, possibility cards and other sections remain.
- Retained compact CEO/Co-CEO/COO layout and existing scroll-card entrance. All eight profiles now have theme-colored decorative career icons from the existing Solar set. Executive icons move with section scroll; director accents turn/settle with their slide, including the first card. Existing content and placeholder disclosures are preserved.
- Five directors now appear as upright portrait cards, one after another from the left with a dimensional flip/fade; Arabic reverses travel. Native scrolling drives a bounded sticky sequence with previous/next buttons, keyboard activation, current-card count and progress line. Heading is â€œDirectors & discipline leadsâ€, removing the incorrect five-agency-pillars wording. Reduced motion, short screens, oversized content or unavailable JS retain the complete readable grid. Scoped cleanup restores styles and observers. Body-size refresh fixes progressive-layout scroll boundary drift.

Actual validation:

- Focused ESLint: PASS for all changed implementation/tests; five existing img warnings in landing.tsx. Final slider/test lint PASS. `git diff --check` PASS with line-ending notices only.
- Initial horizontal prototype: 1/9 browser cases passed, exposing stale scroll boundaries. Corrected with ResizeObserver refresh. Two subsequent viewport checks sampled mid-transition; polling the same strict viewport bounds after settling passed both affected EN cases. This was not a passing prototype acceptance run.
- Portrait version: `pnpm.cmd run build` PASS, 4 tasks / 3 cached, 58.876s, frontend TypeScript and 62 generated pages. Browser acceptance on port 3314: **31/31 PASS in 1.4m**, covering director transitions/native scroll/keyboard/RTL/axe/icons/portrait proportions, phone 390Ã—844 and desktop, reduced-motion/short-screen fallback, gallery absence, prior team/navigation/logo regression checks at 320/390/768/1440.
- Exact final build after first-card icon refinement: `pnpm.cmd run build` PASS, 4 tasks / 3 cached, 58.319s, frontend TypeScript and 62 static pages. No application changes followed.
- Final dedicated acceptance: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3315 node node_modules/@playwright/test/cli.js test tests/e2e/directors-reel.spec.ts --workers=2 --reporter=list --output=test-results-directors-portrait-final`: **10/10 PASS in 48.9s** (one worker for sequential file). Includes all eight locale/theme/phone/desktop slide cases, all five cards, strict portrait/viewport bounds, previous/next, keyboard and native scroll, axe, live reduced-motion restoration, short screen, explicit 3D-matrix flip/left-entry check, first-icon movement, no horizontal overflow and route cleanup/remount.
- No full workspace unit or complete repository E2E rerun for this UI-only increment; earlier unit results are historical and not substituted for new runs.

Visually inspected final desktop dark and Arabic light phone plus the flip-transition capture under `docs/reviews/directors-reel-evidence/`. Final preview: http://127.0.0.1:3315/en#chapter-team and /ar#chapter-team. Earlier task preview servers stopped; existing user development server retained. No dependency, API policy, database migration, external-account action, deployment, commit or push performed.

## Creamy Glass, Laptop Scroll and Executive Separation - 9 November 2026

Latest user correction: ordinary desktop/laptop screens must retain the same scroll-driven director sequence as larger screens; co-executive content needs clear separation below the CEO card. Restored creamy glass and transparent surrounding stage preserve visibility of the unchanged original 3D logo. Removed background/side specialty layers per the user's latest instruction; inside-portrait accents remain.

- Fixed the laptop fallback: instead of switching to a manual slider when the full portrait/card exceeded the viewport, measure the stage and adjust portrait height to the available space. Cards widen to 420px on shorter desktop viewports, reducing biography wrapping. Refit after layout/window resizing and clean up listener/size overrides. Keep the manual slider for screens below 740px tall, phone grid below 768px wide and reduced-motion HTML grid.
- Added 64-96px before the co-executive heading so the existing CEO scroll entrance cannot cover it. Retained all profile copy, illustration disclosures, team anchors and approved artwork.
- The previously authorized logging/performance changes are present: PostgreSQL connection URI removed from banner and defensively redacted in formatter; eager/high-priority header mark; opaque hero entrance; missing-orbit guard; showreel rendering paused offscreen/hidden, capped at 30fps, without invisible video mirroring. See reviews/browser_performance_logging_review.md for the small local performance sample and limits. The earlier 70-test unit result is historical, not a new unit run for this CSS/component correction.

Actual validation for this correction:

- pnpm.cmd run build: PASS, 4 tasks / 3 cached, 2m36.698s, frontend TypeScript and 62 generated pages. No application edits after this build.
- Focused ESLint for reel implementation and director/performance checks: PASS (exit 0; existing monorepo pages-directory diagnostic). git diff --check passed with line-ending notices.
- Production preview port 3324, directors-reel.spec.ts: PASS 28/28 in 3.1m. All five slides at 1280x768, 1366x768, 1440x900, 1536x864 and 1920x1080, English/Arabic and light/dark. Assertions require scroll mode on these viewports, settled card center within 2px, portrait proportions, card viewport fit, CEO-to-heading separation greater than 16px, keyboard/buttons/native scroll, axe, reduced-motion restoration, short-screen manual controls, centered phone grids at 320/390/430, flip and route cleanup.
- Visually inspected current English light 1280 and Arabic light 1366 screenshots: single centered creamy card, visible original 3D mark, readable controls and complete card content. Evidence: reviews/directors-reel-evidence/.

Local preview: http://127.0.0.1:3324/en#chapter-team and /ar#chapter-team. Full repository E2E/unit suite and field performance monitoring were not rerun for this UI correction. No dependency, API-policy, database, external-account, deployment, commit or push action.

Final supplemental run on the same unchanged production build: PASS 5/5 in 30.5s, covering live Arabic desktop-to-laptop-to-phone resize and all four English/Arabic phone/desktop logo-priority/showreel regression cases. Offscreen/pause draw cessation, bounded visible frame rate, eager header SVG, reduced-motion behavior and absence of captured missing-target/LCP warnings passed. These are local browser checks, not field Core Web Vitals or a development-console audit. Total current affected checks: 33 passing across the two runs. No application changes followed validation.

## Two-member slides and flat creamy glass - 9 November 2026

Latest user requests supersede the earlier single-card and height-limited manual-carousel behavior. Directors now form three real HTML slide groups: 2 members, 2 members, 1 centered member. The final member is not duplicated. Scroll/flip transitions operate on the whole group; arrows/count/progress use the three groups. Phone and reduced-motion layouts retain all five visible cards. Creamy glass uses the existing tint/blur/border/shadow with background-image none. No moving side icons or gradient were added; original 3D artwork and the CEO/co-executive spacing remain.

Removed the 740px height cutoff and manual-slider branch: motion-enabled desktop-width screens now use native vertical-scroll slides even on short laptop viewports. Portrait height and sticky-stage top fit the available viewport; ScrollTrigger uses the same measured start. Resize/layout observers and scoped cleanup remain.

Actual checks so far: focused ESLint PASS (exit 0, existing monorepo pages-directory diagnostic); git diff --check PASS with line-ending notice. Exact final build PASS: 4 tasks / 3 cached, 1m42.087s, frontend TypeScript and 62 generated pages. No application changes followed this build. Short-laptop native-scroll acceptance PASS 5/5 in 26.3s on port 3326: 1366x640, 1366x720, 1536x640, 1536x720 and 768x640. All three groups, centered settling, complete laptop card viewport bounds, axe and no horizontal overflow. Final broader regression result follows below.

Earlier paired prototype builds passed, but initial browser samples landed exactly on a page boundary and were moved inside the destination range. The next partial run was interrupted for the user's flat-glass/short-laptop correction. These interrupted runs are not reported as complete acceptance passes. Visually inspected final English light 1366 paired cards and Arabic light 1366x640 final singleton; plain glass, real 3D mark and centered content are visible.

Local preview: http://127.0.0.1:3326/en#directors and /ar#directors. Previous task previews on 3324/3325 stopped; user development server retained. No profile copy/artwork/dependency/API/database/deployment/commit/push change. Full workspace unit/E2E and field performance were not rerun for this UI correction.

Final paired/flat-glass regression on the unchanged production build: PASS 28/28 in 3.0m (test-results-directors-flat-glass-final). Includes English/Arabic, both themes, 1280/1366/1440/1536/1920 desktop/laptop widths, both cards fully in bounds, exact 2/2/1 visibility, centered final singleton, no background gradient, glass blur, previous/next and native scroll, axe, CEO separation, phone grids at 320/390/430, live resizing, reduced-motion cleanup and flip/remount. Together with the separate short-laptop run, 33/33 current affected browser checks passed. No application changes after final build or validation.

## Specialists organization and staggered motion - 9 November 2026

Refined the requested Directors & discipline leads section while retaining two-member slides (2/2/1), flat creamy glass, native laptop scrolling, phone grid, centered final singleton and original logo artwork. Added a short accent rule for THE SPECIALISTS, a compact navigation cluster and direct member-group range buttons (01-02, 03-04, 05), with localized accessible labels, current-step state and visible keyboard focus. Portrait/text dividers, balanced headings and consistent specialty-chip spacing clarify the profile hierarchy. Profile copy and placeholder disclosures remain unchanged.

Motion now combines the existing scroll-selected page turn with a small per-member lateral/lift reveal, opposing tilt and 60ms stagger. Cards settle to zero transform and full opacity. Interrupted transitions reset nested card transforms; teardown clears all nested/page/portrait styles. No permanent loops, background icons or gradients were added. Existing editor formatting of studio-redesign.css was preserved.

Actual validation so far: focused implementation/test lint PASS (exit 0, existing monorepo pages-directory diagnostic); whitespace check PASS. Production build PASS, 4 tasks / 3 cached, 3m33.491s, frontend TypeScript and 62 generated pages. Browser assertions verify the final 16px portrait/text spacing from the built CSS. No application edits after compilation/validation. Current browser acceptance results follow below. New preview port 3327; previous owned preview 3326 stopped and user development server retained. No dependency/API/database/deployment/commit/push change. Full repository unit/E2E and field performance monitoring were not rerun for this UI refinement.

Final dedicated acceptance on production preview 3327: PASS 33/33 in 3.4m (test-results-specialists-editorial-motion). Covers all three 2/2/1 groups at 1280/1366/1440/1536/1920 in English/Arabic and both themes, direct group buttons with keyboard activation/current-step state, exact centering and full card bounds, flat glass/16px divider spacing, previous/next/native scroll, axe, short 640/720px laptop heights, 768x640, phone grids at 320/390/430, reduced-motion restoration, resize and flip/remount. Visually inspected current English light 1280 and Arabic dark 1440 pair captures: organized header/navigation, visible divider and profile hierarchy, centered cards and unchanged decorative mark. Evidence under reviews/directors-reel-evidence/. Current preview: http://127.0.0.1:3327/en#directors and /ar#directors. No application changes after browser validation.

## Button-only specialists, clear portraits and matching co-leadership cards - 9 November 2026

Latest user instructions replace scroll-selected specialist groups with group buttons only, remove arrows/duplicate count/progress, enlarge the portrait area and move icons outside it. DirectorsReel now uses React-selected 2/2/1 groups and a short CSS stagger, with no GSAP/ScrollTrigger import, sticky runway, height fitting, scroll selection or window-scroll navigation. Phones retain the readable grid; reduced-motion desktop retains functional instant group switching.

Selected matching paired portrait cards for Co-CEO and COO, retaining CEO as the wider featured leader. All seven specialist/co-executive cards share flat creamy glass, clear 4:5 portrait wells up to 240x300px, badges below the image and a portrait/text divider. Co-executive scroll-card transforms are removed. Existing profiles, placeholder disclosures and original artwork remain unchanged.

Added two more related icons: each specialist/co-executive portrait now has four distinct existing Solar symbols around its sides, with no overlap of the image. Roles use existing chart, compass, team, calendar, check, layer, idea, code, monitor and layout symbols as appropriate. One shared observer pauses each portrait's transform-only float offscreen; tab visibility pauses all, and reduced motion disables icon movement. CEO retains its existing featured layout/two accents. No new images or fabricated profile details.

Actual validation so far: focused implementation/test ESLint PASS (exit 0, existing monorepo pages-directory diagnostic); git diff --check PASS. Exact final production build PASS, 4 tasks / 0 cached, 4m57.595s, shared/API/frontend TypeScript and 62 generated pages. No application edits after build. Final affected browser acceptance on port 3329 follows below. Earlier button-only runs were interrupted for the user's expanded icon/co-executive instruction; initial test-only corrections recognize equivalent identity matrices and wait for both staggered cards before contrast sampling. No interrupted run is reported as a final acceptance pass.

Inspected final English light co-executive screenshot: matching clear portrait wells, four symbols outside each image, badge below and consistent typography/divider. Evidence under reviews/directors-reel-evidence/. Full workspace unit/E2E and field performance were not rerun for this UI change. No dependency installation, API behavior/policy, database migration/reset, external provider, deployment, commit or push action. Existing user development server retained; earlier owned previews stopped.

Final affected acceptance on unchanged production build, port 3329: PASS 29/29 in 3.5m (test-results-team-four-icons-final). English/Arabic x light/dark at 1280x768, 1366x640, 1440x900, 1536x720 and 1920x1080. Verifies matching co-executive cards, four icons per specialist/co-executive with measured separation from portrait bounds, 280px+ desktop portrait height, flat glass, centered 2/2/1 groups, keyboard/current-step state, no group-button page-scroll jump, no selection change from wheel scrolling, static stage/no arrow cluster and full-team axe. Phone grids at 320/390/430, 28px phone icons, reduced-motion instant groups/disabled icon animation, resize, rapid switching, offscreen pause and route return passed. Inspected English and Arabic light co-executive captures and English specialist buttons capture; images are clear and icons remain around them. No final application changes after validation.

Current preview: http://127.0.0.1:3329/en#chapter-team and /en#directors (Arabic equivalents available). Earlier owned preview 3328 stopped. Full repository unit/E2E and real-tab-background timing/field performance were not separately measured; browser checks verify offscreen pausing and reduced-motion behavior, while tab visibility is handled by the listener/CSS state.

## Reversible team reveal and compact next-chapter handoff - 9 November 2026

Latest user requests: show team cards as they enter while scrolling and reverse as they leave; retain group-button member selection. Remove extra space before YOUR NEXT CHAPTER so its original animation appears earlier. Design/review: designs/team_finale_handoff.md and reviews/team_finale_handoff_review.md.

- Seven paired portrait cards use stationary observer wrappers, with CSS translate/rotate/scale entrance (24px lift, gentle X tilt, 98.5% to 100% scale), reversed on exit. Stationary wrappers avoid observer feedback from the moving card. The button-selected transition remains independent; scrolling does not change groups. Text stays fully opaque. Reduced motion disables the entrance; CEO's existing reveal remains.
- Trimmed team/approach bottom spacing, set compact 24-48px booking top margin and 16px padding, and removed an inherited 40px margin on the CTA panel. The first spacing check exposed that inherited margin; it was fixed rather than relaxing the gap assertion. Existing CTA line/panel animation values, easing, timing and original logo chapter poses remain unchanged.
- LandingMotion refreshes existing ScrollTrigger measurements on root layout-height changes via one coalesced frame and scoped observer cleanup, so group-height changes cannot leave following sections using stale positions.

Actual validation: focused lint PASS (exit 0, existing React-version-detection/monorepo pages diagnostic); whitespace check PASS. Final production build PASS, 4 tasks / 3 cached, 1m53.523s, TypeScript and 62 generated pages. No application changes after this build. Initial handoff test also used a broad h2 selector that matched the nested FAQ; corrected to the specific CTA title. Interrupted/test-selector runs are not reported as acceptance passes.

New motion/handoff acceptance on port 3331: PASS 14/14 in 1.4m. EN/AR, both themes, 1366x640/1440x900 handoff after all three group choices, measured compact card-to-banner gap, full visible heading lines, original chapter index 8, phone 390 reduced motion; EN/AR phone/desktop card entry, reverse, re-entry, independent group selection and reduced-motion restoration. Visually inspected English light laptop CTA: complete title at the earlier viewport position. Focused prior-card regression result follows below.

Full workspace unit/E2E and field performance were not rerun for this UI-only increment. No dependency/API/database/deployment/commit/push changes. Existing user development server retained. Current preview: http://127.0.0.1:3331/en#chapter-team and /en#chapter-booking (Arabic equivalents available).

Final focused card regression on the same unchanged build: PASS 17/17 in 1.6m (test-results-team-reveal-regression). EN/AR light/dark at 1366/1440, group-button keyboard/current-step behavior, four-icon portrait clearance, shared co-executive layout, centered final singleton, no scroll-driven member switching, full-team axe, phone grids at 320/390/430, reduced motion, offscreen pause and rapid navigation/route return. Together with the 14 new reveal/handoff cases, 31 affected browser checks passed. No application edits after validation. git diff --check PASS.

## Follow-us icon open/close motion - 9 November 2026

Sidebar share symbol now rotates/scales/fades into a close mark when the existing social panel opens, and reverses on close. Both groups remain inside one 22px SVG, avoiding the old display swap/layout change. Footer plus behavior and existing disclosure/focus/inert/link logic are unchanged. Reduced motion switches symbols immediately. Motion uses transform/opacity transitions only, with no loop.

Actual validation: focused ESLint PASS (exit 0; existing monorepo pages-directory diagnostic); pnpm.cmd --filter @amc/web build PASS including TypeScript and 62 pages; git diff --check PASS. Local production preview 3332, docs/reviews/check-social-icon-motion.mjs: PASS 16/16 across EN/AR, 390/1440, light/dark, normal/reduced motion. Verified open/close visual states, Escape focus return, rapid re-toggle, constant button dimensions and zero transition duration for reduced motion. Inspected English light open-state screenshot. Full workspace unit/E2E not rerun for this small icon change. No API/database/dependency/external-provider/deployment/commit/push action. Existing user dev server retained; previous owned preview 3331 stopped. Preview: http://127.0.0.1:3332/en.

## Supplied studio photography, channel 02 video and readable studio colors - 9 November 2026

Latest authorized UI increment: replaced landing mock studio SVG image slots with the three user-supplied WebP references. Hero cards map lettering to Strategy, color studies to Identity and illuminated signs to Experience; pillar/device images reuse these supplied photos. The unmounted StudioPhotoShowcase also uses these three references with accurate bilingual captions. Official logo artwork is preserved.

Converted the supplied video-1.avi to a 1280x720, 25fps, 10-second, fast-start MP4 by copying its original H.264 video track; silent/muted ambient playback and a WebP poster. Channel 02 opens selected. Existing monitor pause and channel controls operate native playback, with offscreen/tab-hidden/channel-change/reduced-motion pausing, localized media failure fallback and no hidden canvas drawing behind the pinned video. Studio-only semantic tokens use approved ivory/charcoal/gold, with readable badge, telemetry and selected-state contrast in light and dark. No global rebrand.

Actual final validation:
- pnpm.cmd --filter @amc/web build: PASS, including frontend TypeScript and all 62 generated pages. Initial sandbox attempt failed to read the installed SWC native cache; the build succeeded with tool-cache access. Final build includes all application changes; no application edits followed.
- pnpm.cmd exec tsc --noEmit -p apps/web/tsconfig.json: PASS.
- Focused ESLint for studio-media.tsx, landing.tsx and the adjusted browser-performance.spec.ts: PASS (0 errors, 6 existing img warnings and existing monorepo pages-directory diagnostic).
- Changed-file git diff --check: PASS. Workspace-wide check still reports unrelated pre-existing trailing whitespace in apps/api/src/modules/contact/contact.service.ts; this increment did not edit that file.
- docs/reviews/check-studio-media.mjs on local production preview 3333: PASS 8/8. EN/AR x light/dark x 390/1440. Checks supplied-photo loading, no landing studio SVG image sources, real decoded video dimensions/duration, playback, pause/resume, channel switching, offscreen pausing, reduced-motion pausing/disabled control, scoped axe and no horizontal overflow. Initial harness used browser.newPage, which axe rejected; corrected to an explicit browser context before the complete acceptance run.
- Existing tests/e2e/browser-performance.spec.ts: PASS 4/4 in 36.6s. Explicitly selects a canvas channel before measuring its rendering now that channel 02 opens as video. Header logo priority, offscreen/paused draw cessation, <=31fps budget, scene changes, reduced motion and captured-warning checks passed across EN/AR phone/desktop.
- Visually inspected English light phone monitor, Arabic dark desktop monitor, English light desktop photo cards and Arabic dark phone photo cards. Evidence under docs/reviews/studio-media-evidence/. Review/source mapping: docs/reviews/studio-media-update.md.

Total affected browser acceptance: 12 passing cases. Full workspace lint/unit/E2E, database checks and field performance were not rerun for this UI-only increment. No API/database/deployment/commit/push/external-account action. Existing unrelated work retained. Local preview: http://127.0.0.1:3333/en and /ar.

## Remove studio video, remap supplied images and restart - 9 November 2026

Latest user instruction supersedes the preceding video increment: remove the lagging video and use the new topic-specific image uploads. Removed the native video element, video state/effect and generated MP4/poster outputs; the original supplied AVI remains untouched. Restored the existing 30fps-bounded canvas monitor with pause/channels/offscreen/tab-hidden/reduced-motion behavior and kept the refined studio colors.

Image assignments: Strategy -> strategy.webp (supplied stratage.webp), Identity -> branding.webp, Experience and all web device previews -> web.webp. Pillars and service pages share a typed mapping: Marketing -> marketing.webp (supplied marekting.webp), Advertising -> analysis.webp, Consulting -> consulting.webp, Web Development -> web.webp. Branding detail uses branding.webp. Added responsive decorative service reference photos, including /en/services/advertising and Arabic equivalents. No client evidence or business details were invented. Review/source mapping: docs/reviews/studio-image-remap.md.

Restarted the identified project Next dev server on 127.0.0.1:3000 and stopped the earlier owned preview on 3333. Observed a slow-filesystem warning and initial development route compilation delay; these are local observations, not a proven diagnosis of the original video lag. The video is removed regardless.

Actual final validation:
- pnpm.cmd --filter @amc/web build: PASS, frontend TypeScript and all 62 generated pages. No application edits after compilation.
- Focused ESLint for the four changed/new TypeScript files: PASS, zero errors, seven img warnings (one newly added service reference image) and existing monorepo pages-directory diagnostic.
- Changed-application-file git diff --check: PASS.
- docs/reviews/check-studio-media.mjs on restarted development server 3000: PASS 8/8. EN/AR x 390/1440 x light/dark. Verifies no video elements or MP4/AVI requests, all hero/pillar/device mappings and loaded images, selectable channel 02, reduced-motion monitor behavior, scoped axe, no horizontal overflow, and matching loaded images on five service routes per case (marketing, advertising, consulting, web-development, branding).
- Existing browser-performance.spec.ts: PASS 4/4 in 39.0s. EN/AR phone/desktop, logo priority, canvas rendering <=31fps, pause/offscreen cessation, channels, reduced motion and captured warning checks.
- Visually inspected English light desktop hero cards and Arabic dark phone Advertising reference image after the existing preloader finished. Evidence: docs/reviews/studio-image-remap-evidence/.

Total affected browser checks: 12 passing. Full workspace lint/unit/E2E, database tests and field performance not rerun for this UI increment. No API/database/provider-account/deployment/commit/push action. Current local site: http://localhost:3000/en and /ar.

## Restore original mock SVG imagery - 9 November 2026

User requested removing the supplied photographs and returning to the old mock SVGs. Restored the original hero (01/02/03), pillar (01/02/04/03), device (03/01/05) mappings and all six original mock showcase entries/captions. Removed the added service reference image, its CSS, the shared photo mapping helper and nine copied WebP assets from public/studio. Original uploaded files outside the workspace remain untouched. Video remains removed. Retained the already approved studio monitor color/contrast and accessible selected-state improvements; unrelated work and official artwork remain unchanged.

Actual checks: changed-file whitespace PASS. docs/reviews/check-studio-mock-restore.mjs PASS 8/8 on the running localhost:3000 development server (EN/AR x light/dark x 390/1440). All original landing SVGs loaded with nonzero intrinsic width; no studio WebP/MP4 requests, no video element and no added Advertising service photo. TypeScript/focused lint result follows below. Full production build and repository-wide suites were not rerun for this asset rollback. No database, provider account, deployment, commit or push action.

Final rollback checks: pnpm.cmd exec tsc --noEmit -p apps/web/tsconfig.json PASS; focused ESLint on studio-media, landing and service page PASS (0 errors, 6 existing img warnings plus existing pages-directory diagnostic). All 8 browser cases passed. Current site: http://localhost:3000/en and /ar.

## Supplied services content, flat motion and device 3D integration - 9 November 2026

User authorized implementation of docs/designs/services-motion-integration-plan.md after selecting flat motion for all four pillars, 3D devices only in Web Development, and preservation of the current navy/orange palette. Adapted both source packages under docs/assets without modifying the supplied originals. Full review: docs/reviews/services-motion-integration-review.md.

Implemented reviewed EN/AR content in a typed, slug-keyed source, wired into the existing homepage service intro/taglines, services index, four pillar details and eleven summaries. Delivery timelines, numeric performance targets, unverified coverage/reporting promises and ranking guarantees were excluded. Existing scope lists and canonical routes remain. Added supplied process content and consultation-defined deliverable wording to pillar pages.

Existing four pillar artwork wells now mount dependency-free typed shader scenes with the supplied graphic posters; chapter-devices mounts one typed layered-device scene through the already installed Three.js. No new dependency, old bundled three.min.js, stock photos, autoplay video, duplicate language switch or global font/palette migration. Device textures use the actual existing English font CSS token and Cairo (the installed site has Fira Sans/Cairo despite older specs). Original official mark and original studio SVGs remain.

One shared activity slot, exposed/centered-card priority, 30fps/DPR1.5 caps, lazy engine imports, user pause, live reduced-motion, visibility handling, scoped cleanup, portable shader interpolation and static fallbacks are implemented. WebGL failures/context loss retain posters. Device textures use a disposed guard for deferred font redraw. Existing overlapping sticky cards and route/preloader transitions require exposure rechecks; the implementation handles them with event-driven updates and one bounded settled-layout timeout.

Final source checks so far:
- pnpm.cmd lint PASS: 0 errors / 9 warnings (img advisories and existing unused directives/monorepo diagnostics).
- pnpm.cmd typecheck PASS after final build: 5 tasks / 4 cached, 3.773s. A prior concurrent build/typegen run failed on temporarily missing generated files; sequential rerun passed. No unresolved source type errors.
- pnpm.cmd test PASS: 25 files / 80 tests in 25.66s. No extra unit rerun after camera/lifecycle refinements; those are covered by browser acceptance and final compilation.
- Final pnpm.cmd build PASS: 4 tasks / 3 cached in 1m9.734s; frontend TypeScript and all 62 pages. No application changes after this build.
- Changed-application-file whitespace check PASS.

Dedicated browser prototypes were used to resolve sticky-card selection, preserved focus, layout changes after reduced-motion restoration and camera framing. A full development run passed 12/13 before context-loss test injection was corrected to wait for frames on the newly resumed canvas; corrected isolated case passed. These are development checks, not substituted for final production acceptance. Full 214-case production E2E is running on port 3334; final counts/results follow below.

No API behavior/RBAC, database mutation/migration/reset, provider account, deployment, commit or push action. Existing unrelated backend/email/CRM work was retained. Existing Prisma generation tasks ran as part of workspace checks only. Local development site retained on localhost:3000; final production preview on 127.0.0.1:3334.

Final production browser results on unchanged application build, port 3334:
- Complete pnpm.cmd test:e2e run: 214 cases, 203 passed / 11 failed in 11.0m. All 13 new service-motion cases passed, including EN/AR x themes x phone/desktop; per-stage real rendering <=31fps, one selected scene, user pause/keyboard, offscreen release, live reduced-motion restoration, route return, blocked WebGL, forced flat/3D context loss, controlled document visibility, 320/768 widths, scoped axe, no captured page errors and server-rendered reviewed content across all 30 localized offering URLs.
- All eleven initial failures were in existing test assumptions: eight contact cases used a singular alert locator that now matches four field errors plus the summary; three reading-return cases expected an offset above the current document maximum. Existing BackToTop already explicitly clamps this target. No contact/reading application code was changed.
- Updated contact assertions to check #contact-error plus all four field errors. Updated the reading assertion to require the clamped origin within one browser pixel. Combined two-file rerun: 30/31 passed in 1.5m; the sole remaining Arabic reading failure was exactly one pixel. After adding the one-pixel browser rounding allowance, the complete reading file passed 11/11 in 34.6s. All 20 contact cases passed in the combined rerun. Therefore all 214 distinct cases have passing coverage across the full run plus affected reruns; this is not represented as one uninterrupted 214/214 green run.
- Final focused test ESLint and changed-file whitespace results follow if still running. No application changes followed the final production build. Test assertion corrections do not require a new application build.

Visually inspected final English desktop/Arabic phone Marketing artwork, Arabic desktop device rendering, English full Web Development chapter, and Arabic web pillar content. Evidence under docs/reviews/services-motion-evidence/. New scene controls are readable, devices fit, original artwork is unchanged and content remains real HTML. Device CSS font family uses the site's existing token; no font packages were added.

Implementation is complete. Local development: http://localhost:3000/en and /ar. Production preview: http://127.0.0.1:3334/en#chapter-identity and /en#chapter-devices (Arabic equivalents available). No deployment/commit/push. See the integration review for local performance and visibility-test limitations; no field metrics or marketing performance guarantees are claimed.

Final focused ESLint for all three affected browser test files: PASS (exit 0; existing React/pages-directory diagnostics). Final changed-file git diff --check: PASS. No checks remain running for this increment.

## Production contact/booking 500 diagnosis and prepared runtime repair - 9 November 2026

User reported a live contact POST 500 and nonworking booking after configuring HubSpot. Used full-stack and CI/CD skills, inspected code, the existing Vercel deployment/logs and public endpoints without writing real inquiries, bookings or CRM records. Report: docs/reviews/contact-booking-production-diagnosis.md.

Confirmed live fault: production deployment dpl_HvCe6kJCjzntSFf729ARYqyfUyDb (git 776e95b) crashes with Cannot find module '@nestjs/throttler' (require stack /var/task/apps/api/package.json). The same startup failure appears on contact submission, booking/config and health. Frontend /en/booking returns 200 but /health, /health/ready and /api/booking/config return FUNCTION_INVOCATION_FAILED. This is runtime packaging, not a successful API deployment. The public endpoint is booking/config; booking/settings is intentionally not allowed.

HubSpot: production environment metadata confirms the key exists. The existing local token passed private-token introspection (200, contacts.read/write and appointments.read/write) and contacts/meetings schema reads (200 each). No token value or CRM record data was printed. This is credential access validation, not proof of production delivery; local/production token values were not compared. The configured local remote database connection independently returns a Prisma upstream-database connection error, preventing booking-settings/schema verification. Production DB URL equality was not established, and no database changes were made.

Prepared code:
- Explicit compiled API outputDirectory dist/apps/api/src in root multiserver and app-level Vercel configuration; official installed adapter selects the emitted main.js.
- Build materializes the two-package Prisma runtime tree into dist/node_modules and explicitly includes it in the serverless function. A normal trace exposed an omitted Prisma package link; the staged copied artifact then imported successfully with 2,049 traced files / 232 relocated package links.
- API build resolves 17 direct dependencies and imports the emitted AppModule without opening DB/providers. Added staging/check scripts to Turbo cache inputs.
- Added Turbo passthrough for HubSpot/Resend/inbox/production-origin env names that deployment build logs warned about. No provider secret values changed.
- Public proxy preserves signed forwarding/JSON business failures and converts non-JSON or invalid-JSON invocation failures to sanitized JSON 503; malformed origins fail closed with 403.
- Readiness zero-row query covers contact/booking CRM/retry columns. No migration applied or approval gate bypassed.

Actual final checks: pnpm.cmd lint PASS (0 errors, 9 existing advisories); pnpm.cmd test PASS 27 files / 90 tests in 13.29s; pnpm.cmd build PASS 4 tasks / 1 cached in 54.535s, staged Prisma runtime/import checks and all 62 web pages; sequential pnpm.cmd typecheck PASS 5 tasks / 2 cached in 5.286s; changed-file whitespace PASS. No application edits followed the final build. Affected local production UI browser checks run on 3335 with mocked backend operations; result follows below. Full repository E2E and isolated database mutation tests were not run for this repair.

Not deployed, committed or pushed. No external account connection, provider writes, live contact/booking submission, real email, CRM write, database reset/migration/settings change. Actual live recovery remains pending deployment authorization and successful post-deploy health/readiness/config probes; database-provider connectivity may remain a separate blocker.

Final affected browser acceptance on local production preview 3335: PASS 39/39 in 2.1m (contact-route-consistency.spec.ts and operations-design.spec.ts). Covers EN/AR, light/dark, 320/390/768/1440, contact validation/retry/success/idempotency and mocked booking/staff flows. These are mocked UI regressions, not real production writes or proof of live database/provider delivery. No application changes after final build. Deployment approval remains the next action.

## Authorized production repair rollout - 10 November 2026

User explicitly approved the Vercel production deployment ("yes"). Used the existing linked almorad-amc project; no new external account was connected, no commit/push or database migration/reset was performed. Vercel CLI added .vercel to .gitignore.

First deployment dpl_8jtdyxxwmKBtR7Tvt3aYRSA8YRMb built successfully but live probes exposed output-directory flattening: /var/task/main.js lacked its ESM package boundary. Second deployment dpl_DWziHhXhSzqktCRscRhgUk7scDg5 added the local type:module manifest, resolving that error; live logs then showed @nestjs/common missing from /var/task/safe-exception.filter.js because parent workspace dependency links do not survive the relocated output. Both are failed runtime verification attempts, not successful recovery.

Revised the staging script to materialize all runtime dependencies inside the compiled entrypoint directory (161 packages), preserving nested conflicting versions and eliminating pnpm links. Explicitly include this directory and its ESM manifest in Vercel packaging. Strengthened the mandatory build check to copy the entire runtime outside the workspace, reject symbolic links, resolve all 17 direct dependencies and import AppModule with NODE_PATH cleared. It never starts Nest, connects the database or calls delivery providers. Generated temporary check folders are constrained to the OS temp directory before cleanup.

Local standalone check PASS (11,087 files, 116 MiB; AppModule imported outside the workspace). Updated mandatory isolated check PASS. Focused script ESLint PASS (existing React/pages diagnostics); whitespace PASS. API TypeScript compilation passed before staging. The previously recorded complete unit/typecheck/web build remain applicable to unchanged application behavior; no new full unit/browser suite rerun for these packaging refinements. Third production deployment and live verification results follow.

Third deployment dpl_GAYpnbYkdB5PVPnccNTSavirPGAH passed the cloud standalone runtime check and deployed. Live startup advanced past missing modules but exposed ERR_REQUIRE_ESM in @nestjs/throttler requiring the ESM @nestjs/common package. Reproduced this exact error locally with node --no-experimental-require-module. The same compiled import passes with --experimental-require-module. Vercel's official Advanced Node.js Usage documentation explicitly disables this feature by default and documents NODE_OPTIONS=--experimental-require-module as the opt-in. Added that nonsecret production environment setting (normalized without a trailing newline) as part of the authorized repair. Fourth deployment pending.

An attempted private full production environment download was rejected by automatic approval review because it would copy credentials/API keys locally and was broader than necessary. No download executed; no indirect workaround attempted. Continued using public readiness and sanitized platform logs instead. Exact production credentials were not read or printed.

Runtime documentation: https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration#experimental-nodejs-require-of-es-module

Fourth/current production deployment dpl_3dV2nJMQKyhbNb93w7J3t78QjnBy: READY, aliased to https://almorad-amc.vercel.app. Immutable URL https://almorad-i39jt4e0g-iamahmedsalahs-projects.vercel.app. Cloud build PASS: generated Prisma, staged 161 real runtime packages, isolated import of 17 direct dependencies, website TypeScript and 62 pages. Startup now progresses beyond dependency/module loading and stops on Error: Invalid API configuration: RESEND_FROM_EMAIL. This is the confirmed current blocker. Public booking/config returns sanitized JSON 503; EN/AR contact and booking pages return 200. Direct health probes did not obtain successful responses. No live form submissions were attempted.

A narrowly scoped inspection of RESEND_FROM_EMAIL only (not a database credential/provider API key) returned metadata without a usable sender value. No raw sender or secrets were printed and the production sender was not changed. Asked the user to provide the verified Resend sender address (or Name <address>) so the invalid configuration can be corrected. Do not substitute an invented sender or loosen email validation. Production database connectivity/schema and booking enabled state are still unverified because startup stops before those checks; the prior local configured database error must not be represented as a newly confirmed production database failure.

No rollback to the earlier deployments: all prior backend versions were already broken, while the current build resolves their packaging defects and improves frontend handling to JSON 503. This does not represent restored contact/booking service. Deployment approval was received and consumed; no repeat deployment authorization is needed for the same repair. Next required input is the verified sender value, then redeploy and repeat health/readiness/config checks. No database changes, real email, CRM write, commit or push.

## Sender corrected; API startup timeout investigation - 10 November 2026

User supplied ALMORAD AMC <onboarding@resend.dev>. Removed only the surrounding presentation quotes. Vercel CLI env update failed twice because it attempted to change the protected key of a Sensitive variable. A value-only PATCH to the existing RESEND_FROM_EMAIL variable succeeded, preserving its key/type and existing production+preview targets. No key/token was read or changed. The earlier deployment dpl_2g6hhdyW6vJy3kdKP852HWTRqYFi had started after the rejected CLI update, before the successful PATCH; it is not considered sender-fix verification. Deployed again after the successful update: dpl_BZJRPFy1cP81pFHrWHCUqLRXkWM8, https://almorad-enenqu6mf-iamahmedsalahs-projects.vercel.app, production alias READY.

Live verification: sender-format validation error is gone, but Vercel reports Application initialization timed out at Nest startup (~10 seconds). /health and /health/ready return platform 500; public booking/config returns sanitized JSON 503. English/Arabic contact and booking HTML return 200. User's own contact submission also appears as 503 in platform logs; the agent did not submit any inquiry. No restored service claimed.

Local diagnostic NestFactory.create with real compiled providers and dummy local-only database URL passed before database lifecycle, including production-mode secret requirements and VERCEL flag. No remote DB connection/provider write. Added safe startup stage logs, explicit existing minimum-length preflight for STAFF_PROXY_SECRET and STAFF_CSRF_SECRET, and abortOnError:false with a sanitized error-name-only catch so provider startup failures are diagnosable rather than hidden by a platform timeout. No security gate loosened. API TypeScript compile PASS, focused main.ts ESLint PASS (existing React/pages diagnostics), whitespace PASS. Production diagnostic deployment in progress; result follows.

Resend's onboarding@resend.dev is a testing sender restricted to the Resend account email. It does not verify production visitor-email delivery; a verified sender domain will be required for other recipients. Official source https://resend.com/docs/knowledge-base/403-error-resend-dev-domain. No real emails or CRM records were sent/created. User's existing deployment approval continues to cover this repair. Repository HEAD changed externally to 25b9aab; user/other-process skill edit retained.

## Listener bootstrap correction - 10 November 2026

Diagnostic deployment dpl_9VbwCAWcFKdUidKetZcx4j4gMkJT passed build but retained 500 health/503 proxy behavior. Reading individual request log entries (rather than CLI's first-message summary) established: configuration validates; all modules instantiate; routes map; Nest reports application successfully started in <500ms; then Vercel times out initialization and SIGKILLs. This excludes the earlier inference that container construction itself was hanging. There was no database readiness result at this point.

Corrected main.ts to invoke async bootstrap without a top-level await on app.listen. Vercel's listener wrapper must finish module evaluation before completing the listener handshake. This matches the official NestJS Vercel entrypoint pattern. Added scripts/check-api-entrypoint.mjs: defers listener attachment until module evaluation completes, stubs Prisma lifecycle (no DB connection), uses an ephemeral loopback port, and enforces a deadline. Mandatory isolated API runtime check now runs this handshake against the copied package; Turbo cache inputs include the new check script. Local handshake PASS; API compile PASS; focused ESLint/whitespace PASS. Initial parallel affected Vitest run had a worker exit (14 tests passed, 1 worker error), so it is not a clean pass; standalone module test passed and full affected sequential rerun PASS 4 files/15 tests in 5.63s. No full browser/unit rerun for this entrypoint-only fix. New cloud deployment in progress.

Official runtime pattern: https://vercel.com/docs/frameworks/backend/nestjs#nestjs-entrypoint-detection. No real inquiry/booking/email/CRM write or DB/schema/settings change. Existing deployment approval retained. Complete log diagnostics were filtered to failed health/config/contact requests and redacted; no credentials were printed or downloaded.

## Live API restored; production schema missing - 10 November 2026

Bootstrap correction deployment dpl_8puUkMSJ2Q4DRk672fircxWPNYfj restored /health 200. /health/ready then returned 503 database down, and booking/config returned JSON 500 with Prisma P2010. Added a bounded database failure classifier and readiness-only internal diagnostic log; it emits allowed Prisma/SQL codes and fixed categories, never raw provider messages/credentials. Privacy/classification tests and readiness tests PASS 2 files/5 tests; API compile and focused lint/whitespace PASS.

Current production deployment dpl_5sojnKQBvF94bbmD7Uz3cFvbQL4X, https://almorad-iapc2b5to-iamahmedsalahs-projects.vercel.app, READY and aliased to almorad-amc.vercel.app. Cloud API TypeScript/staging/isolated import/listener handshake and web TypeScript/62 pages PASS. Actual live probes: /health 200 {status:ok}; /health/ready 503 {status:unavailable,database:down}; /api/booking/config 500 sanitized JSON. Internal readiness diagnostic confirms P2010 / SQLSTATE 42P01 / schema_missing. Thus the production database responds but a required relation is absent; exact relation, intended DB/schema identity and migration history remain uninspected. Contact/booking are not restored and no successful persistence/provider delivery is claimed.

Reviewed all eight existing migration SQL files and recorded hashes, material effects, risks and a conditional recovery plan in docs/reviews/production-schema-recovery-review.md. Schema validate PASS. Migrations include an old-inquiry delivery SKIPPED update and an outbox unique-index replacement, so they must not be described as no data changes. No reset/table drop/record deletion proposed. No production migration/settings/DB write performed. Docker is installed but daemon unavailable, so isolated migration rehearsal and backup/PITR readiness are not verified. Existing local backup script intentionally excludes production. Explicit approval for production database recovery (targeted connection access, read-only history/identity inspection, backup/rehearsal, pending migrations) is required separately from the previously authorized app deployment. No entire production environment download or API-key exposure is needed.

No agent-created live contacts/bookings, real emails, CRM writes, database resets, commits or pushes. Existing user/other-process skill modification retained. Full details and next approval boundary are in the recovery review.

## Vercel monorepo CI/CD and automatic migration releases - 10 November 2026

User requested adapting D:/BIS/bhi47a-full-stack-web/.github/workflows/ci-cd.yml for this PostgreSQL/Prisma monorepo, linking the current Vercel project and automatically applying new pending migrations. This authorizes the reviewed automatic release path; no VPS was provisioned and no MongoDB/student-portal logic was copied. Full setup/activation/recovery instructions: docs/reviews/vercel-ci-cd-setup.md. User will configure GitHub environment secrets and requested setup instructions, which were provided.

Implemented .github/workflows/ci-cd.yml orchestrating reusable validation/security workflows. PRs and main/staging/release branches validate; reviewed main changes release after validation/security, or manual main dispatch target vercel. Deployment-only production-vercel environment, serialized production runs, actual Vercel team/project IDs, pinned CLI, encrypted checkpoint, restore/migration rehearsal, unaliased production candidate, health/readiness/bilingual/config checks, promotion and post-promotion checks. Root git.deploymentEnabled=false prevents the Git-provider auto-deploy path from bypassing/racing Actions once these files are pushed. No remote Git configuration or account linkage was changed by the agent.

Added scripts/ci: read-only migration inspection, immutable history/checksum/failure/baseline checks, canonical LF/CRLF and explicitly reviewed historical mixed-line-ending checksums, conservative risky SQL review gate, production database/manifest/commit/backup-reference gate, backup encryption/checksum/decryption/restore/rehearsal with existing-row-count preservation, immutable URL parsing and redacted release smoke. Production Vercel API build compiles first then runs migration inspection/deploy outside Turbo cache; previews/local skip migration writes. Existing applied migrations are not rewritten; pending-only Prisma deploy, never reset/db push. Host-independent database steps are reusable for a later VPS release. Release approval references are trusted CI context, not a separate credential/cryptographic authorization system.

Local validation so far:
- Workflow YAML parse PASS; actionlint 1.7.7 with ShellCheck PASS via read-only Docker source mount. One initial literal-backtick shell warning in summary formatting was corrected.
- Official Vercel JSON schema validation PASS for root/services and API configurations (AJV with draft schema metadata validation disabled; supported configuration constraints evaluated).
- New release safety tests PASS 7/7, including wrong targets, missing release context, history drift/failed/gapped baselines, SQL review checks and hostile/ambiguous deployment URLs.
- All 8 migrations applied on dedicated local amc_test PostgreSQL 18; repeat release deploy applied zero migrations.
- Database integration suite final PASS 4 files/12 tests in 10.13s. Initial failure was stale single-outbox assertion; updated to require exactly EMAIL+HUBSPOT intents for the same booking event and no duplicates on idempotent retry.
- Backup/rehearsal PASS from a source *_test database with 6 historical migrations and one synthetic contact inquiry: encrypted artifact checksum/decryption, restore to another local *_test DB, two pending migrations, no pending afterwards, existing rows preserved, old-inquiry EMAIL/HUBSPOT statuses SKIPPED. No actual notification sent. Earlier plaintext-restore-only prototype passed before encrypted recovery was added; only the latter is represented as encrypted recovery validation.
- Existing pnpm db:restore:check PASS: 13 restored table counts match; constraints restored and original test DB unchanged.
- Complete pnpm lint PASS 0 errors/9 existing warnings; unit suite PASS 28 files/93 tests. Replaced a dummy nonce that triggered the unchanged Gitleaks rule; affected notification unit file rerun PASS 9/9.
- Production build PASS 4 tasks/2 cached in 4m23.968s, 62 pages and mandatory isolated API dependency/listener checks. Initial sandboxed attempt failed only on Windows SWC cache permissions; normal-access rerun passed.
- Sequential typecheck PASS 5 tasks/2 cached in 8.459s after the same SWC sandbox-cache issue was resolved by normal-access execution.
- Secret scan PASS on exported reviewable source only (ignored local credentials/build artifacts excluded; no finding values printed). Production dependency audit PASS: no known vulnerabilities.
- Staff/client production browser suite PASS 6/6 in 34.2s after replacing obsolete native-date-input selectors with real calendar keyboard/accessible-button interactions. Covers actual isolated DB booking persistence, unchanged confirmed time while cancellation/reschedule request remains staff-reviewed, EN/AR, RBAC/CSRF/session/password behavior and scoped accessibility. Full 214-case public browser suite was not rerun for this CI change; it remains configured in CI.

Final isolation refinement removes local .env loading from staff browser API startup, supplies explicit isolated database URLs, disables HubSpot/inbox, and uses the existing disabled email-provider mock sentinel. An initial empty string RESEND_API_KEY was rejected by startup validation; corrected to mock. Final isolated-browser rerun result follows below. No application build change required for these test-only changes.

No production DB backup/schema change, real inquiry/booking/email/CRM write, remote GitHub environment/secret creation, commit, push or new deployment was performed during this CI task. Existing Vercel deployment remains the earlier repaired API with missing production relation until the reviewed release actually runs. Local configured remote direct URL still reports upstream connection failure; it was not treated as proof of production URL equality. CI activation depends on owner configuration of VERCEL_TOKEN, matching PRODUCTION_DIRECT_URL and BACKUP_ENCRYPTION_KEY in production-vercel; optional Vercel automation bypass when protection applies. Never claim a live GitHub run passed without logs. User/other-process skill edit retained.

Final isolation browser rerun PASS 6/6 in 32.2s with no .env loading, explicit local *_test URLs and email/CRM disabled. Final live read-only probes still show /health 200 and /health/ready 503; this CI code has not been pushed/activated and has not migrated production. Optional VPS image scans now require an explicit scan_containers input, so manually invoking the Vercel release does not implicitly start VPS validation. Final workflow/ShellCheck and temporary test-container cleanup results recorded below. User will configure environment secrets; activation still requires a reviewed commit/push (not performed). No further production migration approval is being requested for the authorized reviewed CI path.

## Studio simplification, service content, local demo and CI activation ? 10 November 2026

Implemented standalone EN/AR team pages (existing design-preview notice, noindex), removed team and Better together from landing/chapter rail (eight remaining chapters), compact laptop monitor, five primary desktop links with booking CTA and tablet/mobile drawer, and unique audience/process/FAQ content for all eleven bilingual service pages. Service booking CTAs preselect only services enabled by actual schedule. Current user-approved navy/orange and original artwork preserved.

Local amc_demo PostgreSQL18 container created on loopback55440 with persistent demo-only volume. Eight migrations applied; idempotent seed completed with two synthetic staff accounts, six appointments and two change requests. Demo launcher creates ignored local credentials, applies migrations before seeding, and clears external provider access. Seed now checks an existing non-demo schedule before account mutations. Browser verified sample receptionist sign-in, calendar appointment visibility and Branding preselection. Local sample password is documented in docs/reviews/studio-update-and-demo.md; no production demo account created.

Validation: pnpm lint PASS (zero errors/nine existing warnings); typecheck PASS five tasks; full build PASS four tasks including isolated API import and listener handshake (10m15.643s on Windows); final web rebuild PASS64 prerendered pages. Unit rerun PASS28 files/93 tests with maxWorkers1 after initial resource-contention hook timeouts and stale chapter assertions. Release tests PASS8/8, actionlint PASS, source-only Gitleaks including selected docs PASS. Focused studio/service browser tests PASS14/14; existing team/navigation/gallery checks PASS51. Full public run completed212 passed/16 failed in9.7m: all failures referenced removed landing team behavior or removed desktop FAQ link. Updated those tests for standalone team/booking navigation and visible footer FAQ; affected-file reruns PASS25/25. All observed failures resolved; do not describe the initial full run as clean. No database suite rerun this UI turn; prior CI turn DB12/12 and staff6/6 results remain recorded above.

GitHub access via existing credential helper verified repository push permission. Required repository secret NAMES verified: VERCEL_TOKEN, PRODUCTION_DIRECT_URL, BACKUP_ENCRYPTION_KEY (values never read). Created production-vercel environment and main-only deployment policy (both HTTP200). Owner explicitly authorized commit/push after checks. Current immutable Vercel URL redirects to authentication302; added reviewed CI helper to create masked short-lived candidate automation access when no persistent bypass is configured, then revoke in always() cleanup. Network-stubbed lifecycle test passes. Production readiness remains503 before activation; no production migrations or delivery success claimed. Commit/push and first Actions outcome follow below.

First activated Actions run 42838010535 (commit db9c8a7) passed source secret scanning; validation stopped at unit palette test because docs/design.md was ignored/untracked and absent on the clean Linux runner. No release job/database mutation started. Added the existing required design reference to Git (content unchanged); focused palette tests PASS2/2 and source+document Gitleaks PASS. Publishing the clean-checkout correction under the existing commit/push approval.


## Conversion motion, About navigation and restore diagnostics - 10 November 2026

Added booking CTA hover/focus sweep, contact/booking pending treatment and API-success-only envelope/calendar acknowledgement SVGs. Added a scoped one-pass GSAP journey carrying original official SVG artwork across process cards 01-04, with server-rendered readable steps, reduced-motion fallback, cleanup and completed-animation resize alignment. Dark favicon now uses official navy background with unchanged mark paths. EN/AR navigation and About metadata use About us / Arabic equivalent. Removed localized Credits pages and footer link; required Solar/font attribution remains in linked public/third-party-notices.txt. Details: docs/reviews/conversion-motion-and-restore-preflight.md.

CI restore now preflights archive extension names against the isolated runner and emits only validated missing extension names. Kept the existing PostgreSQL 18 package installation: its versioned contrib package is already provided by postgresql-18. Full archive restore, encrypted checkpoint, fail-closed migration gates and plaintext cleanup preserved. Original GitHub extension_unavailable failure is NOT established as resolved: the supplied log omits the extension name, and no new remote release/rehearsal was run. Asked for the specific extension line. A redundant contrib alias was considered then removed after checking Debian package metadata; it would not fix an unknown provider extension.

Executed so far: pnpm lint PASS (exit 0); pnpm test PASS 28 files/93 tests; pnpm db:validate PASS. Full release safety suite PASS 33/33; additional preflight missing-extension integration assertion PASS in focused 6/6 file rerun. First release run 32/33 because native-client fixture needed the new TOC/preflight calls; corrected and full rerun passed. Initial sandbox typecheck failed at Windows SWC cache permissions. Normal-access retry generated route types then found a strict undefined lookup (fixed) and stale generated Credits type (removed). Production compilation PASS; final build/typecheck/browser results follow. No production DB access, migration, live form submission, provider delivery, commit, push or deployment.

Final verification: pnpm typecheck PASS five tasks (four cached) in 21.706s after the strict lookup/stale-route corrections. Full pnpm build PASS four tasks (two cached) in 27m11.141s, including API standalone staging (161 packages), isolated import (17 direct dependencies), listener handshake with DB lifecycle stubbed, and 62 web pages. A final web-only production rebuild after adding the existing logo theme wrapper also PASS (62 pages and TypeScript). Final full ESLint rerun PASS exit 0. Unit 93/93 and schema validation results above remain applicable. Release safety final rerun PASS 33/33, including hyphenated uuid-ossp parsing and missing-extension preflight cleanup/blocking coverage.

Targeted production Playwright run PASS29/29 in32.8s: contact validation/retry/API-success artwork across EN/AR dark/light mobile/desktop; viewport layout/nav/favicon checks at320/390/768/1440; reduced-motion fallback; actual logo travel to04 and resize alignment with only one visible theme asset; EN/AR mocked booking acknowledgement; theme/system/locale icon switching; removed Credits404. First production attempt18passed/11failed due new test asserting a unique icon before hydration; added the existing count wait and rerun passed. Earlier dev attempts were cancelled after a stale preview lock, connection refusal and slow initial compilation; sandbox production startup hit SWC cache restrictions and normal-access rerun succeeded. These are not represented as clean passes. No full public/staff/database integration rerun for this UI work.

Visual QA: initial screenshots captured the preloader, so screenshot cases now wait for it to hide. Refreshed suite17/18 with one Chromium ERR_NO_BUFFER_SPACE navigation failure; that single case rerun PASS1/1. All16 screenshots saved under docs/reviews/conversion-motion/. Reviewed EN dark1440 and AR dark390 images: readable four-step layout, RTL ordering and navy/orange palette preserved. Browser APIs were intercepted for contact/booking tests; no live submission or provider effect. Original mark paths preserved in navy favicon. Restored build-generated next-env.d.ts to its original tracked content. No commit, push or deployment.

Owner does not have the missing extension name. CI now emits rehearsal_extensions_missing with validated names before full restore; the next actual CI run is required to identify/fix the exact extension dependency and prove the original rehearsal passes. No extension was omitted, no recovery gate bypassed and no production DB connection was made.

## Theme, form feedback and local development staff â€” 11 November 2026

The studio monitor and four service illustrations now use the approved cream/navy/orange palette in light mode and navy/orange/cream in dark mode. The service artwork corners match the surrounding card, with a subtle orange border. The AMC strip uses official AMC artwork because the supplied assets folder contains only AMC variants; no client logo or client relationship was invented. The four-step process mark now follows a continuous arc and fades out after card 04, leaving that card in focus. Reduced-motion steps remain static and readable. The process, monitor and strip visual checks are in `docs/reviews/conversion-motion/`, `docs/reviews/home-motion/`, and `docs/reviews/home-theme/`.

Contact and staff sign-in now have accessible red/green field feedback and shadcn-style status alerts with reduced-motion-aware transitions. Contact preserves retry data and displays a success state only after a positive API acknowledgement. Staff sign-in has an accessible show/hide password control with right-side placement for the LTR password in both locales, and a short success confirmation before workspace navigation. Local Manager and Receptionist provisioning is restricted to loopback `amc_dev`, writes random passwords to ignored `.env.dev-staff`, and refuses to change existing accounts; example identities and setup instructions are in `.env.example` and `README.md`. The initial `pnpm staff:dev:setup` invocation reported both accounts ready. A later idempotence check could not connect to `127.0.0.1:5432` (Prisma P1001): Docker Desktop's engine pipe was absent and `com.docker.service` remained stopped, including after an attempted service start. The persisted account rows and their passwords were therefore not reverified in this final pass. No hosted database was contacted.

The three reported browser warnings were addressed: official mark image sizing, theme initialization script placement, and Next's smooth-scroll document marker. A production browser check across `/en` and `/ar` observed none of those warnings. Web production build PASS (62 pages), strict web/API TypeScript PASS before the last UI polish; final repository checks are recorded below. Browser verification: conversion motion 20/20 PASS (including logo travel/hide), theme and warning checks 2/2 PASS after correcting the test's stale-page theme setup, contact and sign-in feedback/retry 14/14 PASS across relevant locale/theme/viewport combinations. An earlier contact browser run exposed checkbox movement when blur feedback inserted a row; feedback now appears during input and the full eight-case contact retry sweep passed. Browser submissions used mocked API responses; no message was sent. Sign-in success was mocked; no authenticated live session was claimed. No commit, push or deployment.

The supplied GitHub `pnpm test:e2e:staff` log later showed 2/6 passing and four strict-locator failures: `form button` now matched the new eye toggle and the submit button. The staff browser helper and no-JavaScript assertion now select explicit button types. The Arabic password control has an LTR wrapper around the password and eye only; the Arabic label remains RTL. A mobile browser assertion checks the eye position in both visibility states. Local verification after that change: web production build PASS (62 pages), `pnpm lint` PASS, `pnpm typecheck` PASS (5/5 tasks), `pnpm test` PASS (28 files, 93 tests), public browser form feedback 7/7 PASS including Arabic mobile eye placement and no-JavaScript disabled controls; screenshot `docs/reviews/form-feedback/sign-in-ar.png` reviewed. The full isolated-PostgreSQL staff browser suite was not rerun locally because Docker Desktop's engine and the local test database were unavailable. The GitHub failure is therefore addressed in source but a new CI run is still required to establish 6/6. The separate `pg` deprecation warning was not the cause of these four failures and remains untraced. No migrations, commit, push or deployment were performed for this correction.

Later supplied public Playwright shard logs showed 12 failures in shard 2/4 and 10 in shard 4/4. The shared axe failure was `scrollable-region-focusable` on the overflowing brand ticker. The strip is now a named keyboard-focusable region with horizontal keyboard scrolling, a visible focus outline and motion paused on focus; the duplicate visual track remains hidden from assistive technology. The other four shard 4/4 failures were a stale assertion for a literal `id="amc-theme-init"` tag. Next serializes the `beforeInteractive` initializer into a script queue in `<head>`; local production HTML inspection found its first occurrence before `<body>`. The test now verifies that placement and continues sampling for light flashes across locale switches.

Validation for these shard fixes: web production build PASS (62 pages and TypeScript), `pnpm lint` PASS, affected `foundation.spec.ts` 16/16 PASS, `theme-shape-stability.spec.ts` 12/12 PASS, and the focused keyboard ticker case 1/1 PASS at a 390px viewport. The first keyboard test used a wide reduced-motion viewport whose single static track did not overflow; the viewport was corrected and the case passed. The full CI shards were not rerun or pushed, so their new remote results remain unverified. No database, migrations, external services or deployment were changed.
# Prisma Postgres extension blocks native release rehearsal â€” 11 November 2026

The new CI diagnostic identifies `prisma_postgres` in the production archive. The current release job restores the full archive to a stock, loopback-only PostgreSQL 18 cluster; that cluster does not provide the source provider's extension. Prisma's published extension list does not list `prisma_postgres`, so no verified PostgreSQL 18 package was found to add to the runner. The release remains blocked before deployment. No archive entry was skipped and no substitute extension was created.

Updated the preflight diagnostic to name the provider-compatible isolated target required for a faithful restore, while keeping generic package guidance for standard missing extensions. Added a subprocess regression check for the exact `prisma_postgres` case and plaintext cleanup. Focused release tests PASS 9/9; full release suite PASS 33/33; Node syntax and `git diff --check` PASS. A real restore was not run locally. The next operational step requires an isolated provider-compatible rehearsal database with the extension and a reviewed connection/cleanup design. No production database connection, hosted database creation, deployment, commit or push was performed here.

## Vercel deploy-only release path — 11 November 2026

Owner explicitly requested removing database backup and restore rehearsal from the GitHub release job after repeated `prisma_postgres` extension failures. The release job now validates and security-checks first, deploys an unaliased Vercel candidate with production migrations explicitly disabled, verifies health/schema/bilingual routes, promotes, and verifies the production domain. Removed the release-only PostgreSQL setup, backup artifact, backup encryption/direct database secrets, manifest-derived migration build variables, and cluster shutdown. Normal production API builds now skip migrations; the guarded explicit migration path remains available separately. This workflow no longer supplies a database recovery checkpoint or applies pending migrations. A deployment whose code requires unapplied schema changes may fail candidate health verification and must be handled as a separate reviewed database release. Validation: release suite PASS 33/33, full ESLint PASS, YAML parse and deploy-only assertions PASS, Node syntax and `git diff --check` PASS. No live deployment or database operation was performed for this edit.

## Candidate readiness failure after deploy-only release — 11 November 2026

Owner supplied GitHub job output: the unaliased Vercel candidate deployed, `/health` passed, and `/health/ready` failed four attempts; promotion was skipped. The job log does not include the API runtime's `database_readiness_failed` event, so it cannot distinguish a missing schema from connection/authentication/provider failure. Readiness verifies PostgreSQL plus required application tables and columns. The pre-existing status record shows production readiness 503 before this release, but does not prove the current failure category. No readiness bypass or production schema write was made.

The API readiness 503 now includes only its bounded failure category (`schema_missing`, `authentication`, `connection`, `provider_upstream_unreachable`, or `unclassified`); the CI smoke prints that category and HTTP status on failure without logging SQL, URLs, credentials, or provider response bodies. The next candidate run can identify the appropriate database repair while continuing to block promotion until readiness passes. Focused health/database tests PASS 6/6; focused ESLint, Node syntax and whitespace checks PASS. Live candidate readiness remains unverified after this diagnostic edit.

## Confirmed missing production schema; targeted migration access pending — 11 November 2026

The new candidate smoke reports `/health` PASS and `/health/ready` HTTP 503 with `schema_missing`. The production Vercel project lists both `DATABASE_URL` and `DIRECT_URL`, but their values and target identity have not been verified. Workspace `.env` contains only loopback development URLs. A read-only `vercel env run -e production` migration inspection unexpectedly loaded workspace `.env`; a safe classification probe confirmed it passed loopback URLs, so that attempt did not contact production or apply migrations. Automatic approval review rejected a full production Vercel environment export because it would download unrelated secrets. No alternate route to those secrets was used.

The eight checked-in migration files remain checksum reviewed; the contact-delivery file updates existing inquiry status, and the HubSpot lifecycle file replaces an index. Added `NODE_OPTIONS` to Turbo's hashed global environment and `AMC_RELEASE_MIGRATIONS` to its passthrough environment to address the platform warning without disabling strict environment filtering. Corrected `.env.example` to say normal Vercel deploys do not migrate. Local verification: Turbo configuration/dry-run PASS, migration policy PASS (8 reviewed), Prisma schema validation PASS, `git diff --check` PASS. Production target verification, recovery checkpoint, migration application and readiness recheck remain pending targeted database credentials. No production database write, deployment, commit or push was performed in this turn.

## Production schema repair and CEO staff access — 11 November 2026

The owner supplied only the production `DATABASE_URL` and `DIRECT_URL` in ignored `.tmp/production-db.env` and explicitly requested migration of the correct production database. Read-only inspection found an empty Prisma Postgres `public` schema, eight pending checksum-reviewed migrations, and the required `prisma_postgres` and `btree_gist` extensions. A guarded one-time bootstrap applied exactly those eight migrations to the empty schema; post-check found zero pending migrations. The direct and runtime URLs subsequently connected to the same database and `public` schema, with 13 application/migration tables. Live `/health/ready` returned `status: ok, database: up`; live `/api/booking/config` returned HTTP 200. The original contact and booking `P2010` errors were consistent with the missing tables, but live contact submission and email delivery were not exercised because that would create a real inquiry and external messages. No data rows existed to back up before the bootstrap; no reset or seed was run.

The owner supplied the first CEO email and a password. The existing production provision command created the CEO account and audit event successfully without logging the password. The password was shared in chat, so the owner should change it after first sign-in. Booking remains disabled: the live configuration reports `booking_enabled=false`. The owner supplied weekly office hours and an Alexandria address but meeting format, notice, duration interpretation, and verified directions are still being clarified. Do not enable booking or publish directions from incomplete settings.

CEO-only staff account management was added to the API and staff portal for listing, creating, updating roles/active status/passwords, and deactivating Manager and Receptionist accounts. Mutations revoke sessions and write audit events; CEO accounts cannot be changed through these endpoints. Deactivation retains the row for audit. The UI is bilingual. Validation so far: `pnpm typecheck` PASS, `pnpm lint` PASS, focused Vitest 2 files / 6 tests PASS; production build running at the time of this entry. This code is not yet deployed, committed, or pushed.

The owner then clarified that visitors should choose a meeting length from 30 minutes through 5 hours. The booking wizard now offers 30-minute increments; slot availability and reservation confirmation check the chosen duration, while rescheduling preserves the booked interval length. Existing clients that omit the new field continue to use the configured default duration. The supplied office address may be displayed without a directions link; a link appears only after a verified Google Maps URL is configured. Focused booking/staff tests PASS (5 files, 20 tests), final TypeScript PASS (5/5 tasks before the last compatibility adjustment), and final lint/build were running at the time of this update. Production booking remains disabled because the owner has not specified a minimum advance notice or authorized the remaining operational settings; no settings were invented. The new code remains local and was not deployed.

Final local validation for commit `3c25a4f`: `pnpm lint` PASS, `pnpm test` PASS (30 files, 100 tests), `pnpm typecheck` PASS (5/5 tasks before the optional duration compatibility change), and `pnpm build` PASS (4/4 tasks, web 62 generated pages and API standalone runtime import/listener handshake). The owner subsequently specified 24 hours' minimum notice. The remaining production booking configuration values, including slot interval, buffers, lookahead, change cutoff, and enabled services, have not been supplied or written. This commit was pushed to `origin/main` by an external actor while validation was running; the repository's push-triggered release workflow may deploy it. No manual Vercel deployment or promotion was initiated here.

After that status entry, the owner requested completion. A manual unaliased production-target Vercel candidate was built from the reviewed workspace, with migrations disabled during build, then promoted. Candidate `dpl_F2uYxReuR1LEEDSscHGWDYuWXxHL` passed `/health`, `/health/ready` (`database: up`), `/api/booking/config` HTTP 200, and HTTP 200 for `/en`, `/ar`, `/en/contact`, and `/ar/staff/login`. The production domain passed `/health/ready` after promotion. A one-time CEO sign-in probe returned login 200, protected staff-accounts GET 200, and logout 200; it logged no password, cookie, or CSRF token. Production booking still reports `enabled: false, schedule: null`. No live contact POST was made because it would create an actual inquiry and trigger external mail. The owner has supplied 24-hour notice; approval of remaining existing operational defaults is pending before writing settings. The CEO password was sent in chat, so the owner should change it through the staff portal.

The owner approved the existing operational defaults. The first CEO-authenticated settings read returned HTTP 503 while no settings row existed; no write occurred. A guarded retry checked the public configuration was empty, then created version 1 through the authenticated staff API, which wrote its audit event. The saved settings contain the user-supplied Monday–Thursday and Saturday–Sunday hours (Tuesday opens 09:30), Friday closed, `Africa/Cairo`, both meeting formats, the supplied office address in English and Arabic, no directions URL, and all 11 services. The approved defaults are 15-minute start spacing, five-minute buffers, 30-day lookahead, and 60-minute change cutoff; minimum notice is 24 hours. The public config then returned `enabled: true`, six open days, `leadMinutes: 1440`, and both formats enabled. Read-only live slot checks for Saturday 14 November returned HTTP 200 and correctly sized 30-minute and 300-minute slots for both online and office meetings. No customer booking or contact inquiry was created; actual email delivery remains unverified. The empty-settings GET 503 should be repaired separately so staff can see a clean first-time setup state if settings are removed.

Post-promotion route checks returned HTTP 200 for production `/en`, `/ar`, `/en/booking`, and `/en/contact`; none of those responses carried `X-Robots-Tag: noindex`. The production project lists `CONTACT_INBOX_EMAIL`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` by name, but values and actual outbound delivery were not inspected. The CEO password supplied in chat should be rotated via the staff portal.

After settings creation, a second CEO session probe returned HTTP 200 for login, protected account list, protected booking-settings read, and logout. This confirms the staff settings page can read the configured row. No Manager or Receptionist identities were invented or provisioned.

### 2026-11-11: Studio media, forms, and transactional email preparation

The four owner-supplied MP4 films and pause posters from `docs/assets/amc-service-videos` were copied into public assets and connected to the existing studio monitor without changing its bezel or viewport size. The monitor now advances through four films, starts muted, offers sound/play/pause controls, pauses offscreen, and respects reduced motion. Service cards retain the current navy/orange system: their borders and nested radii align, the light poster inversion was removed, and a theme-aware still frame is rendered when WebGL is available. Submission illustrations are centered above contact and booking success states.

All native select menus under `apps/web/src` were replaced with the existing Radix/shadcn select styling, including public booking, client management, receptionist filters/actions, analytics, and staff account roles. The displayed role names are Admin for the existing `CEO` role and CEO for the existing `MANAGER` role; API role values and permissions are unchanged. New client bookings now require a valid phone number in the UI and shared API schema. Existing booking records and staff edits remain compatible with nullable historical phone data. Booking management still requires the private token and staff review; phone number alone does not grant access.

Contact delivery no longer marks messages SENT when Resend is unconfigured. Unconfigured steps remain recoverable after provider setup. The booking endpoint now schedules a prompt email outbox drain after a saved booking when Resend is configured. Booking screens report actual queued/delivered/failed/unconfigured status, and shared email templates use the current site palette plus the existing official logo in header and footer. The booking receipt wording now says the request was saved and will be reviewed, rather than claiming staff approval. No live message was sent or received in this task; production Resend sender-domain verification, inbox routing, and actual delivery still require end-to-end provider checks before claiming live email works.

Validation: direct web and API TypeScript checks passed; full ESLint passed; full unit test run passed (30 files, 102 tests); focused contact/notification tests passed (18/18); `git diff --check` found no whitespace errors. The workspace `pnpm typecheck` gate could not complete because local Next/SWC native binding loading was rejected by Windows cache ownership/DACL checks, including a workspace cache attempt. Web TypeScript was checked directly with `tsc --noEmit` instead. No production deployment, database migration/write, customer booking/contact submission, or real email was performed for this change.

The owner then chose a template preview instead of live email delivery for now. Added reproducible synthetic previews under `docs/reviews/email-template-preview/` for English/Arabic booking receipts and contact replies, the studio contact alert, reschedule, and cancellation. The gallery includes rendered PNGs and links to full HTML email files. All sample identifiers use `PREVIEW-ONLY` or `example.invalid`; no provider API was called. Visual inspection of the gallery and a 375px Arabic booking screenshot confirmed the logo in the header/footer, RTL layout, and no horizontal overflow. This visual check exposed cramped reference rows on mobile; booking email details now stack labels and values. Booking email service names are localized from the shared service catalogue instead of showing raw slugs. Live delivery and inbox receipt remain unverified until a verified sender and studio inbox are supplied.

### 2026-11-11: PostgreSQL 18 CI installation mirror failure

The supplied `Validate workspace` log failed while downloading Ubuntu's `liburing2` dependency for PostgreSQL 18. The PostgreSQL apt repository was reachable; the runner's Azure Ubuntu mirror repeatedly failed DNS resolution and apt then exited 100. The `setup-postgres` composite action now replaces only the GitHub runner's `mirror+file:/etc/apt/apt-mirrors.txt` URI with Ubuntu's HTTPS archive on that disposable runner, preserves the signed source configuration, bounds apt retries/timeouts, fails apt update on any missing index, and verifies the installed PostgreSQL major version before starting the isolated cluster. PostgreSQL 18 and the native backup/restore test path remain required. This mitigates the observed mirror failure; it does not prove the next hosted run can reach Ubuntu's archive.

Validation in this Windows workspace: extracted composite install shell passed `bash -n`; action YAML parsed successfully with PyYAML; all 33 `scripts/ci/*.test.mjs` tests passed; `git diff --check` found no new whitespace errors. The actual Ubuntu apt installation and GitHub Actions rerun were not executed locally. No database, deployment, commit, or push was changed for this fix.

### 2026-11-11: Studio monitor playback handoff and controls

The studio monitor now reruns playback when its scene index changes, so the next supplied film starts after the previous film ends without requiring a manual pause/play cycle. Playback promise rejection only switches to the paused state when the browser explicitly blocks autoplay; interrupted loads no longer do so. The sound and play/pause controls now include accessible icons and labels, and the monitor bezel, screen, pill, controls, and chapter buttons use the site's squircle treatment with existing radii as fallback. The monitor size and supplied film artwork were not changed.

Sound remains opt in and its setting persists across English/Arabic route changes in the same browser session. When an Arabic voice is installed on the visitor's device, enabling sound on the Arabic route speaks each existing Arabic chapter title and mutes the underlying film track while that voice is available. This is browser speech synthesis of scene titles, not a recorded Arabic dub of the films. Without an Arabic voice, the film audio remains available through the sound control.

Validation: direct web TypeScript check PASS; targeted ESLint PASS; `git diff --check` PASS. A browser regression test was added for the automatic film handoff, but it could not be validated locally: port 3000 served an older build with client controls disabled, and a fresh Next development server on port 3001 failed to load the SWC native binding because the Windows cache directory was rejected. The new browser test therefore still needs a CI run with a fresh build. No deployment, database action, commit, or push was performed for this change.

### 2026-11-11: Monitor icon controls and decorative numbering cleanup

The monitor sound and playback controls are now icon only, with localized accessible names, hover titles and 44-pixel targets. The browser speech synthesis added in the previous monitor change was removed because the owner requested a genuinely human Arabic male voice. No suitable Arabic audio files were present in the repository; the owner plans to supply four recordings. Until then, the Arabic route uses the supplied film audio when sound is enabled, and no Arabic narration is claimed.

Decorative ordinal indicators were removed from the monitor chapter controls, service card artwork badges, gallery cards, process cards, public section labels, chapter rail, mobile navigation, brand ticker, team badges and pagination, FAQ items, service index and booking step badges. Semantic labels and real quantities, dates, durations, booking references, timecode and structured-data positions remain. The process mark still moves across four cards; it now animates each heading instead of a removed number badge.

Validation: direct web TypeScript check PASS, targeted ESLint PASS, `git diff --check` PASS. Browser visual verification remains unavailable in this Windows workspace because a fresh Next server cannot load its SWC binding; the existing port-3000 server serves an older build. No audio asset was fabricated, and no deployment, database action, commit or push occurred.

### 2026-11-11: Icon transitions, theme-aware service artwork, and Arabic voiceover preparation

The monitor sound and playback buttons now contain only SVG icons with localized accessible names. A shared icon component animates sound on/off and play/pause states; the service and Every Screen motion controls use the same icon-only pattern. The icon transitions turn off under reduced-motion preference. Static service posters now use a warm light-theme treatment; the live service shader uses warm cream/neutral values rather than cool blue in light mode, while the dark palette stays navy. The Every Screen canvas receives a matching warm light treatment. A local browser-rendered comparison of the existing poster art confirmed the chosen warm filter avoids the previous pale-blue result; full-page visual QA remains pending because local Next/SWC cannot start.

The owner supplied four Egyptian Arabic scripts and specified Azure's `ar-EG-SalmaNeural` female voice at about -5% rate, with a half-second pause between the two sentences. The owner subsequently chose to attach four finished recordings, so the temporary Azure-generation command and key placeholder were removed. The monitor has a 0.4-second cue and synchronizes optional Arabic tracks with each video, pausing them with the film and reverting to source audio if a voice file fails to load. The manifest accepts WAV or MP3 paths and currently contains four null entries; no Arabic audio was generated or published because recordings have not yet been attached. The previously removed browser speech synthesis remains absent. Azure SalmaNeural is a synthetic neural voice; a literal human voice requires a human recording.

Validation after the final simplified manifest and player hookup: web TypeScript PASS, targeted ESLint PASS, and `git diff --check` PASS. A local browser-rendered poster comparison showed the warm light treatment avoids the former blue cast, but full-page browser QA remains blocked by the local Next/SWC issue. Audio quality and timing need verification after the four finished recordings become available. No deployment, database action, commit or push was performed.
### 2026-11-11: Staff browser tests aligned with current booking controls

The supplied CI log showed three failures: the manager test used native `selectOption` against a Radix combobox, and both localized client booking tests omitted the newly required phone field. Updated `apps/api/tests/staff.browser.ts` to choose the localized visible Radix options for staff approval and client cancellation/rescheduling, verify the selected text and closed state, and fill a reserved synthetic phone number. The client tests now assert the phone field is required, its value is persisted, and the pending change has the intended kind, while retaining the unchanged confirmed appointment and staff-review assertions.

Validation: `pnpm lint` PASS; `pnpm test` PASS (30 files, 102 tests); `pnpm test:e2e:staff --list` PASS (all six tests discovered using a synthetic local test URL); `git diff --check` PASS. Full staff browser execution was not run: no PostgreSQL listener was found on the usual local ports, and the Docker daemon is unavailable. Test discovery does not verify browser behavior; the repaired scenarios still require the isolated PostgreSQL CI run. No application behavior, schema, production data, deployment, commit, or push was changed.

### 2026-11-11: Supplied Arabic recording split and connected to the studio monitor

Prepared four MP3 tracks from the owner's `docs/assets/ar-voice.wav` (18.729796 seconds), cutting at quiet boundaries of 5.34, 9.99 and 14.46 seconds. Speech speed and internal sentence pauses remain unchanged, with tiny fades only at cut edges. The manifest maps the cuts in film order: brand architecture, kinetic typography, outdoor campaigns, web/3D. The owner subsequently confirmed this scene order. No transcript or audible cut-quality verification is claimed. Each cut fits within the corresponding 9.6-second film after the existing 0.4-second cue. The existing Arabic audio player retains opt-in sound and video synchronization; English uses the original soundtrack. Original WAV and film assets were preserved.

Added reproducible `scripts/prepare-studio-voice.mjs` and a local gallery with four standalone H.264/AAC previews under `docs/reviews/arabic-voiceover/`. Each preview copies the original video stream and adds the corresponding narration with the same cue, padded to 9.6 seconds. The website uses the four smaller MP3s under `apps/web/public/studio/monitor/audio/`. No external audio service or new software download was used.

Validation: FFmpeg error-sensitive decode PASS for all eight exports; all four MP4 durations/codecs verified (9.60 seconds, H.264/AAC); direct web TypeScript PASS; focused ESLint PASS; JavaScript syntax PASS; whitespace check PASS. The pnpm wrappers produced no output and were stopped after equivalent direct local checks succeeded. Fresh-site browser playback, audible cut quality, and semantic scene matching remain unverified. No deployment, database action, commit, or push was performed.

### 2026-11-11: Chapter sidebar above footer and theme-correct Every Screen fallback

The owner clarified that the chapter sidebar must remain visible on top of the footer. Its fixed navigation is now portaled to a viewport overlay outside the landing page's isolated stacking context, at layer 40 above the footer's layer 30. The overlay passes pointer input through except at the navigation itself; the existing chapter actions, keyboard navigation, RTL positioning and mobile visibility rules remain in use. Raising the rail's child z-index alone could not escape the original isolated parent.

The Every Screen static fallback previously rendered a dark navy browser mockup on a warm background in light mode. Added explicit light/dark SVG variants derived from the existing vector artwork, preserving its geometry and original source. The devices stage switches these images with the theme in CSS, covering reduced motion, loading and failed WebGL without waiting for hydration; the former dark inversion filter was removed for these fallback images. The existing live canvas treatment remains in place.

Validation: direct web TypeScript PASS; focused ESLint PASS; whitespace check PASS. An isolated local Chromium fixture loading the actual project CSS and new SVGs passed four light/dark ? LTR/RTL cases, verifying theme image visibility and pointer hit-testing of the sidebar over the footer. Light/dark screenshots were visually inspected; evidence is under `docs/reviews/sidebar-every-screen/`. This fixture does not validate the full Next application or hydrated chapter interactions. Full-site browser QA remains pending; no deployment, database action, commit or push was performed.

### 2026-11-11: Docker-free hosted database development and production-mode local preview

The owner requested development against a database URL in `.env`, without local PostgreSQL/Docker, plus local production-mode email testing. `dev:setup` now checks the configured runtime connection and migration history read-only and generates Prisma Client. It does not start Docker, apply migrations, seed accounts, or send messages. The previous optional Docker setup remains available as `dev:setup:docker`; isolated automated database-test safeguards remain unchanged. Prisma remains the required ORM.

Added `db:check`, `preview:cert`, `preview:build`, and `preview:local`. The preview runs the built API and standalone Next server in production mode behind a loopback HTTPS proxy at `https://localhost:4443`, preserving secure staff cookies, CSRF requirements and real provider credentials. It copies the required public/static assets into the standalone output and stops both processes on shutdown. The local certificate is generated under ignored `.tmp/local-https` using existing OpenSSL; no system trust setting is changed. Build migration authorization is disabled, and preview startup performs only read-only database checks before launching the apps. Added an explicit `email:test --to <controlled-recipient>` command: one real provider message, no booking/contact records, no guessed recipient. Provider acceptance is reported separately from inbox receipt.

Validation so far: full ESLint PASS; all CI helper tests PASS (39/39, including six new runtime/proxy tests); JavaScript syntax and whitespace PASS; generated-certificate TLS handshake with verification enabled PASS; missing-recipient email command correctly refused to send. The sandboxed build hit the existing SWC Windows cache-ownership restriction; the authorized outside-sandbox retry completed successfully (4/4 tasks, 62 web pages, web TypeScript, API isolated runtime import and listener handshake). The actual root `.env` continues to contain loopback DATABASE_URL/DIRECT_URL; its read-only check failed connection without printing credentials. The hosted database choice/URLs and live test recipient have been requested and remain pending. No hosted database was connected/migrated, no application data was created, and no real email, deployment, commit or push was performed. See `docs/local-hosted-development.md` for the exact commands and provider-testing limits.

### 2026-11-11: Owner-selected production database and separate contact/booking inboxes

The owner selected the existing production database and supplied `info@almorad-amc.com` for contact alerts and `bookings@almorad-amc.com` for booking alerts. Copied only the previously owner-supplied DATABASE_URL/DIRECT_URL from ignored `.tmp/production-db.env` into ignored root `.env`, preserving all other secrets; configured the two inboxes and contact Reply-To. The read-only check passed outside the network-restricted sandbox with zero pending migrations. No schema migration or business-data write was run. Development's automatic booking defaults are now restricted to loopback databases so a hosted database is never silently provisioned or re-enabled.

Contact owner routing already used CONTACT_INBOX_EMAIL. Added BOOKING_INBOX_EMAIL and a separate `BOOKING_CREATED:OWNER:EMAIL` transactional intent for newly created bookings when configured, without a schema migration. The owner email uses authenticated staff-calendar access, escapes client input, omits private client tokens/attachments, and uses the client's email as Reply-To. Client receipts retain their own delivery/idempotency state and reply to the booking inbox. The public delivery message ignores internal owner-alert status. Existing historical appointments were not backfilled or drained, and staff-reviewed changes remain unchanged.

Live diagnostic email attempts to both requested inboxes were rejected by Resend with HTTP 403. The configured sender is on resend.dev; a read-only domain-status inspection was not permitted by the configured key (HTTP 401), so no claim about the business domain's verification status is made. No provider message ID or inbox receipt was obtained. Bounded test-email diagnostics now distinguish provider rejection categories without printing raw provider messages, credentials or recipient details. The owner requested domain-verification steps; official guidance and project-specific settings are saved in `docs/resend-sender-setup.md`.

Validation: final full unit suite PASS (33 files / 108 tests); focused regression PASS (3 files / 6 tests); API source TypeScript and API compilation PASS; focused ESLint PASS. Final full ESLint and web TypeScript checks PASS. Database integration/browser suites were not redirected to production. The full production build from the preceding step predates these routing changes; the updated API was compiled directly, and a fresh full production build/start remains pending. No real booking/contact record, production deployment, commit or push was performed. Outbound email readiness remains blocked on a verified sender and appropriately scoped sending key.

### 2026-11-11: Requested staff accounts, mailbox instructions, and public browser regression repair

The owner requested Admin access for iamahmedslahio@gmail.com and Manager access for eng.kahaledmorad@almorad-amc.com and dr.belalkhaledmorad@almorad-amc.com. The existing API CEO role supplies every permission and is displayed as Admin; MANAGER supplies appointment operations, analytics and settings, but not staff management. A scoped read-only production lookup found none of these three accounts. Prepared ignored `.tmp/staff-account-passwords.env` for the owner's three passwords and an atomic provisioning script using the existing scrypt password helper, explicit roles, audit events, exact previously verified database target and post-write hash verification. No account provisioning has been executed; password entry and the owner's ready message remain pending. No credentials were generated or printed.

Read-only DNS checks found Cloudflare nameservers and a Google root MX at smtp.google.com. Added `docs/resend-domain-and-inboxes.md` with current official sending-verification and Resend Inboxes creation/forwarding instructions. Receiving directly at Resend requires a planned MX change; forwarding preserves current Google mail routing. No domain, DNS, inbox, billing or mail-account setting was changed.

The supplied public E2E logs referenced obsolete canvas monitor selectors, assumed one image per device fallback, and omitted the required phone in the mocked booking flow. Replaced canvas-specific checks with video offscreen/pause/chapter/reduced-motion behavior, checked theme-aware monitor surfaces without changing supplied film art, selected visible fallback images, and filled a reserved synthetic phone. Local browser verification passed nine focused video/theme/booking/WebGL cases with the API deliberately pointed at an unused loopback port and booking endpoints mocked; no production database or outbound email was used by the browser suite. The full service matrix then exposed an active-state flag that remained true for a paused still frame. Corrected that flag without hiding the still canvas. A fresh web production build (62 pages and TypeScript) passed, focused ESLint and whitespace passed; the final eight service locale/theme/viewport cases PASS on the fresh build (1.9 minutes). Together with the nine focused cases, all 17 targeted browser cases passed. The full public suite and hosted CI shards were not rerun. No deployment, commit or push was performed.

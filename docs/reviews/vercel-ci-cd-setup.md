# Vercel CI/CD setup and operation

Status: implemented and locally verified. On 10 November, existing Git credentials verified repository push access and repository secret names (values never read). The production-vercel environment was created with a main-only deployment rule. Owner authorized commit/push after checks. First live Actions release remains pending.

The workflow adapts the structure of the supplied VPS workflow, using this repository's PostgreSQL/Prisma, pnpm 11.11.0, Node 24 and Vercel services. It does not copy MongoDB/student-portal checks or enable a VPS deployment.

## Connect the existing project

Repository: https://github.com/iamahmedsalah/ALMORAD-AMC

Project: almorad-amc. Public, nonsecret identifiers are already in `.github/workflows/ci-cd.yml`:

- Vercel project: `prj_3OWasVxcZyRAJDWlt9pNqCW6EW3S`
- Vercel team: `team_9mwMW7QGs5HfZuTYgXeftexz`
- Production domain: https://almorad-amc.vercel.app

The **production-vercel** environment now exists. Restrict deployment branches to `main`. The required secrets currently exist at repository scope and are inherited by the environment job. They may be moved to environment scope by an administrator; use secrets, not plain variables or committed files:

| Secret | Value |
| --- | --- |
| VERCEL_TOKEN | Create an access token at https://vercel.com/account/settings/tokens with access to the existing iamahmedsalahs-projects team. Use the least available access needed for deployment/promotion, set an expiry and rotate it. |
| PRODUCTION_DIRECT_URL | Copy the intended direct PostgreSQL migration/admin TCP URL from the database provider. It must point to the same intended database/schema as Vercel Production DIRECT_URL. Use postgres:// or postgresql://, not prisma+postgres://. |
| BACKUP_ENCRYPTION_KEY | Unique random value, at least 32 characters. Keep a recovery copy in your password manager; a lost key makes retained encrypted backups unrecoverable. |
| VERCEL_AUTOMATION_BYPASS_SECRET | Optional existing bypass. If absent, CI generates a short-lived project automation bypass before candidate deployment, masks it, exports only to the current runner and revokes it in an always-run cleanup step. Deployment protection stays enabled. |

To generate a backup key locally, run this yourself and save its output in GitHub and your password manager. Do not paste the output into chat:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Environments/secrets support depends on repository visibility and GitHub plan. If `production-vercel` is unavailable, resolve that plan/access limitation before activating this workflow; do not silently remove the environment boundary. CodeQL also requires appropriate availability for the repository. Read existing required-check names from an actual run before enabling branch protection.

In Vercel keep the current project root at the monorepo root and allow `vercel.json` to define the `api` and `web` services. Do not create two replacement projects or set the root directory to apps/web. Existing production runtime values (database, signing/CSRF/booking/cron secrets, Resend and HubSpot) remain in Vercel. Keep `NODE_OPTIONS=--experimental-require-module` in Production. Do not put release-only `AMC_RELEASE_*` flags or backup references into persistent environment settings.

## Activate

1. Configure the environment secrets above. Owner-supplied production booking settings and a verified Resend sending domain are separate from CI setup.
2. Review and commit/push the workflow, scripts and Vercel configuration together. No commit/push has been performed by the agent. Once pushed, automatic Git-provider deployments are disabled by `git.deploymentEnabled=false`; GitHub Actions owns the release so direct Git deployments cannot race or bypass validation. Preview Git deployments are also disabled; only enable preview releases after configuring an isolated preview database.
3. PRs/main/staging/release branches run validation/security. A main push releases automatically after both reusable workflows pass. For a deliberate manual release choose Actions > CI/CD - Vercel monorepo > Run workflow, branch `main`, deployment_target `vercel`. Default manual target `validate` does not release.
4. Require reviews for migrations, release scripts and workflows using CODEOWNERS/branch rules. Required environment reviewers may be enabled if you want a human gate for each release; the user has requested automatic releases after reviewed main changes. Never permit untrusted PR code to use production secrets.

## Release order

- Validation: workflow/shell lint, immutable install, generated icons, migration review gate, Prisma generate/validate, lint/unit, isolated PostgreSQL migrations and collision/RBAC/outbox tests, backup-restore check, build then typecheck, public/staff Playwright checks and production dependency audit.
- Security: redacted secret scan and CodeQL. Optional VPS image/container checks remain available on manual security dispatch; a live VPS is not assumed.
- Release: serialize production runs, inspect applied migration names/checksums/failed state without writes, then make an encrypted database backup using PostgreSQL 18 client tools. Upload only the encrypted dump and checksum metadata as a 14-day GitHub artifact.
- Decrypt that artifact, restore into disposable local `amc_release_test`, apply the pending migrations and verify none remain. Check that migrations do not remove preexisting tables/rows. This checks schema/data preservation, not all business-data invariants.
- Vercel deploy uses production environment with `--skip-domain`. The API build first compiles and runs isolated dependency/listener tests. Outside Turbo's cached build task, `scripts/ci/vercel-api-build.mjs` inspects actual migration history and runs `prisma migrate deploy` only for genuinely pending migrations. No pending migrations means a no-op. Preview/local builds skip production migrations entirely.
- Production migration requires matching database fingerprint, exact migration manifest digest, release commit and backup/rehearsal reference passed by this CI run. A mismatch, failed history, nonempty schema without migration history or migration error stops the candidate.
- Verify immutable candidate health, DB readiness, public booking config and EN/AR routes. Promote only after passing, then check production again. Failed candidates leave the production domain on its previous deployment, but schema expansions already applied are not automatically reversed.

Automatic migrations are not run during every request or API cold start. No migration reset, db push, arbitrary production seed, invented staff account or auto-enabled booking availability is included.

## Adding a migration

Create migrations in development using the project's Prisma version, inspect their SQL and commit them under apps/api/prisma/migrations. Existing applied migration SQL is immutable. CI detects obvious data-changing/destructive operations and requires an explicit reviewed canonical SHA-256 in scripts/ci/reviewed-migrations.json. This is a conservative text check, not a full SQL safety proof. Changes containing FK ON DELETE can also trigger review. Keep the reviewed checksum list append-only; do not regenerate approvals blindly. Current historical checksum exceptions only account for reviewed Windows mixed line endings; canonical LF/CRLF forms are also accepted.

New backward-compatible schema additions migrate automatically after the reviewed change reaches main. Breaking/contracting changes need a separate expand/contract plan and rollback review. New migrations are rehearsed against the current production snapshot before Vercel executes them.

## Backup recovery

Download the matching production-db-backup-RUNID-ATTEMPT artifact and verify database.dump.enc SHA-256 against backup.json and the GitHub artifact digest. Keep the encryption key separately. Decrypt using OpenSSL AES-256-CBC, PBKDF2 and 200000 iterations. Rehearse into an isolated *_test database first. Do not restore over production or roll back DDL automatically; inspect compatibility and obtain explicit recovery authorization. Backup artifacts expire after 14 days; use provider PITR/longer-term storage separately when needed. Raw dumps stay in the ephemeral runner and are removed after successful encryption/rehearsal; they are never uploaded.

The first backup can be blocked if the configured database is unreachable or nonempty without trustworthy migration history. Confirm the intended database/schema and review baselining rather than forcing a reset.

## Limits and VPS transition

Health/config checks do not create a real inquiry/appointment, send email or write CRM records. A reachable booking config can correctly report enabled=false until real non-demo owner-approved settings exist. The current onboarding@resend.dev sender is test-only; production visitor delivery requires a verified sender domain. Do not claim bookings/email/HubSpot delivery work solely because CI passes.

The backup/rehearsal/migration inspector is host-independent. For a later VPS release reuse validation and the reviewed database steps, then add pinned-host-key SSH/container deploy/health/rollback jobs after the VPS exists. Vercel deployment remains the only configured production release target today.

References: [Vercel CLI staged production deployment](https://vercel.com/docs/cli/deploying-from-cli), [GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [Vercel automation bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation), [Prisma migration deployment](https://docs.prisma.io/docs/cli/migrate/deploy).

## Verified setup on 10 November 2026

GitHub repository secret metadata contains VERCEL_TOKEN, PRODUCTION_DIRECT_URL and BACKUP_ENCRYPTION_KEY. No values were downloaded. Environment production-vercel created successfully (HTTP 200), main-only deployment branch policy created (HTTP 200). The current immutable Vercel URL redirects to authentication (HTTP 302); the workflow now creates/revokes short-lived bypass access when a persistent automation secret is absent. One network-stubbed lifecycle test verifies generation, masking/export, revocation and preservation of an existing bypass.

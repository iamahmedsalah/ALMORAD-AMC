# ALMORAD AMC — CI/CD & Release Engineer — AGENTS.md

Read this skill's `SKILL.md` and relevant `references/` first. In an ALMORAD AMC repository also read repository `AGENTS.md` and approved `docs/architecture.md` / `docs/design.md` before making changes. This skill is standalone; it must never require the Full-Stack Engineer skill or any other companion skill to run.

## Rules
- Use PostgreSQL + Prisma; never substitute MongoDB/Mongoose/Student Portal patterns.
- Keep genuine business scope, eleven services, RTL/LTR, exact palette, three fonts, booking-change review workflow.
- Inspect repo contracts and secrets policies before any edits; no invented APIs or fabricated verification.
- Follow least privilege, preserve user data, protect booking tokens, and never connect external accounts without authorization.
- Always add tests/verification for the requested task and state any unrun checks honestly.
- Final report: scoped summary, files changed, validation results, risks and rollout/next steps.

## Specialty gate
## Workflow: inspect → plan → build → validate → release → observe
1. Read root `AGENTS.md`, architecture/design docs, lockfile, scripts, `.github/workflows/`, Dockerfiles, compose, Prisma schema/migrations, infrastructure configuration and health endpoints. Never import legacy Student Portal/Vercel-specific checks.
2. Establish actual environment names (`dev`, `staging`, `production`), runner, hosting, registry, branch protection and deploy strategy. If absent, propose defaults clearly.
3. Draw artifact path: lint/typecheck/unit → ephemeral PostgreSQL integration/e2e → build web/api/worker → container scan → stage → smoke → backup/safe migration → deploy → verify → alert/rollback.
4. Separate CI validation from CD production write permissions; require explicit human approval for destructive or live deployment actions.
5. Fail closed on vulnerable packages, failed tests, unreviewed migrations and broken bilingual public pages; never claim a workflow passed without logs.

## Must-have checks
- Verify actual `pnpm`/`npm` scripts before running; use immutable lockfile install. Pin Node LTS compatibility and supported Prisma runtime; use a matrix only when useful.
- ESLint, TypeScript strict, unit/integration/e2e, Playwright localized book/change-request/RBAC smoke, accessibility, bundle and Next build.
- PostgreSQL ephemeral service for integration tests. Generate Prisma client, validate schema, check migration drift safely. `prisma migrate deploy` is for reviewed staged/prod migrations only; NEVER `migrate reset`, `db push` or destructive commands on production.
- Transaction and exclusion constraint tests must prove two simultaneous attempts cannot double-book the same staff/room. Email and Slack worker retries must be idempotent and independent of booking commits.
- Verify `/ar`, `/en`, eleven service pages, sitemap/robots, alternates, structured-data syntax, canonical, 404 behavior; static WebGL fallback and no forced animation in reduced-motion.
- Security gates: dependency audit, CodeQL/SAST as available, secret scanner, SBOM/container scan, runtime secret presence without logging values, restricted credentials, runtime non-root and healthchecks.
- Back up Postgres (consistent snapshots/PITR where available) and rehearse restore; migration changes may not be reversible by rolling back an app image alone. Require backward-compatible expand/contract and staged cutover.
- Test health/readiness including DB and critical workers; monitor error rate, latency, job failures and booking throughput after release. Record artifact digest and rollback recipe.
- Canary or staged deploy, then smoke `/ar`, `/en`, API health, booking flow with synthetic test data, and office directions link (once verified).

## Minimal pipeline expectations
Prefer GitHub Actions w

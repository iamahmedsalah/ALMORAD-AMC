---
name: almorad-amc-ci-cd-verifier
description: Production release engineering and CI/CD verification for the ALMORAD AMC bilingual Next.js 16/NestJS 12 monorepo with PostgreSQL/Prisma, Redis/BullMQ, Resend, Docker/VPS. Use for GitHub Actions workflows, deployment, Prisma migrations, secret scanning, tests, rollback, backup/restore, monitoring, performance and security release gates.
---

# ALMORAD AMC — CI/CD & Release Engineer

This is a **standalone** ALMORAD AMC skill: it works independently and does not require another AMC skill to be installed. Use this skill when requests match its description. For requests needing multiple specialties, coordinate by reading the actual project docs rather than assuming other skills exist.

## Source-of-truth order
1. Inspected repo/config/migrations/assets: actual implementation.
2. User-approved `docs/architecture.md` and `docs/design.md`, verified official brand material: intended requirements.
3. The bundled references in **this skill**: tactical guidance, never claims of implementation.
4. Clearly flag differences; don't silently overwrite requirements or invent live connections.

## Project facts (not assumptions)
- Brand: ALMORAD AMC — Growth & Brand Studio. Four pillars: Marketing (Social Media Management, Personal Branding, Market Research & Analysis, Branding); Advertising (Media Buying, Billboards & Outdoor Advertising, Corporate Events); Consulting (E-commerce Consulting, Management Consulting); Web Development (E-commerce Websites, Company Websites & Landing Pages).
- Public localized URLs: `/ar`, `/en`; RTL Cairo Arabic, LTR IBM Plex Sans English, selective Redaction 100 English display.
- Exact swatches: `#0B0A08`, `#14120E`, `#BE9D5B`, `#D8BE86`, `#F5F1E7`, `#CFCBC0`, `#A6A39B`, `#7A5F28`. Two fully developed themes.
- Stack intent: Next.js 16 App Router, React 19, NestJS 12, PostgreSQL + Prisma ORM and Migrate, Redis/BullMQ, Resend, Docker/VPS; conditional Google Search Console/Analytics/Business Profile/Maps/Calendar and Slack connections.
- Client meetings in-office or online, secure booking management links, reschedule tickets reviewed by reception, CEO/Manager analytics. Do not invent office details, contact numbers, team members, reviews or client results.
- Inspect actual project manifests, architecture/design docs, schemas, CI and code before applying a change; documentation describes target behavior, not proof of implementation.


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
Prefer GitHub Actions with explicit permissions (`contents: read` by default), concurrency control, dependency caching, `permissions` scoped per job, OIDC for cloud auth when possible, and protected deployment environments. Never print tokens. Keep schema application isolated from untrusted PR workflow execution.

## Release report contract
Include release SHA/image digests, migrations reviewed/applied, backup/restore readiness, commands **actually executed** and exit codes, test counts, security findings, environment smoke results, monitoring status, deployment approval/rollback decisions and blockers. When no repo or infrastructure access exists, provide workflow templates as PROPOSALS, not as verified deployments.


## Relevant references — self-contained
- `references/pipeline.md` — pipeline.
- `references/postgres-release.md` — postgres release.
- `references/docker-vps.md` — docker vps.
- `references/verification-checklist.md` — verification checklist.
- `references/task-prompt.md` — task prompt.

## Request protocol
Classify the task, inspect relevant files, consult the needed bundled references, propose file-by-file changes and acceptance criteria, implement only authorized actions, run actual checks where tools allow, and report results separately from proposed checks. Never claim tests, deployment, rankings, Google connection, or interactions succeeded without evidence.

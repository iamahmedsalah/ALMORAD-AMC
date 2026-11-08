---
name: almorad-amc-full-stack-engineer
description: Senior production full-stack engineering skill for ALMORAD AMC Growth & Brand Studio. Use for building, reviewing, securing, debugging, refactoring or planning the bilingual Next.js/NestJS website, SEO-first service pages, Three.js/GSAP 3D landing experience, PostgreSQL/Prisma bookings, office directions, receptionist/CEO dashboards, Google integrations, Slack, Redis/BullMQ, Resend, and technical Codex prompts.
---

# ALMORAD AMC — Full-Stack Engineer

Operate as a cross-functional senior engineering team: technical lead, frontend/backend architect, PostgreSQL database engineer, DevOps/SRE partner, security reviewer, accessibility engineer and product engineer. This skill is **project-specific**, not a repackaged student portal skill.

## Non-negotiable source hierarchy

1. Actual inspected code, lockfile, schema, migrations, tests and deployed contracts take precedence for the *implemented* state.
2. User-approved current project documentation is the requirement source of truth: `docs/architecture.md` (Almorad AMC Architecture V4), `docs/design.md`, and approved company portfolio assets, when present.
3. The references bundled with this skill define the intended implementation and guide new work; they do not prove that code exists.
4. Never treat old Student Portal MongoDB/Mongoose files as project requirements.
5. On conflicts, explicitly report discrepancies and choose a safe, backward-compatible path. Never silently discard functionality.

## Core product

One agency website, not multi-tenant SaaS. Public English and Arabic site (`/en`, `/ar`), premium 3D landing, four pillars/11 service detail pages, approved portfolio case studies, verified office location, online/in-office booking, secure client management links, receptionist operations and CEO/manager analytics. Booking-change requests are **staff reviewed**, not automatic client reschedules. Resend emails, Slack notifications, optional authorized Google Calendar/Meet; Google Search Console/GA4/Business Profile at release.

## Default technology contract

- Frontend: Next.js 16 App Router (use current patched compatible stable release), React 19, strict TypeScript, Tailwind CSS 4, shadcn/ui/Radix, next-intl, next-themes, React Hook Form, Zod, TanStack Query for client server state as needed.
- Motion: React Three Fiber/Three.js/Drei for isolated client-side 3D scenes, GSAP/ScrollTrigger for scoped animation. SVG/static fallback, reduced motion, performance budget.
- API: NestJS 12 (current patched compatible stable release), TypeScript, DTO boundary validation, OpenAPI, typed shared contracts, thin controllers, secure session/auth + server-side RBAC.
- **Persistence: PostgreSQL + Prisma ORM ONLY.** Prisma schema, Prisma Client, Prisma Migrate, SQL migrations for database-level guarantees, transactions, explicit indices, query plan checks. Never generate Mongoose, ObjectId, Mongo sessions, `.lean()`, `populate()`, `bulkWrite()`, or Mongo Atlas advice.
- Background/infra: Redis, BullMQ workers, transactional outbox, Resend email, Slack (authorized), Docker on VPS, TLS reverse proxy, backups and monitoring.
- Package manager and exact package versions are read from the existing repository. Do not invent installed packages. Validate Prisma version-specific API and `prisma.config.ts` behavior before editing.

## Identity, brand, language (hard rules)

- Exact swatches: Black `#0B0A08`, Charcoal `#14120E`, Gold `#BE9D5B`, Soft gold `#D8BE86`, Ivory `#F5F1E7`, Warm grey `#CFCBC0`, Muted grey `#A6A39B`, Deep gold `#7A5F28`. Use semantic tokens, WCAG-aware foreground pairs, complete dark/light themes.
- Arabic font **Cairo**; English UI font **IBM Plex Sans**; selective English artistic display font **Redaction 100**. Never use Redaction for functional controls or Arabic text.
- Arabic `/ar` uses RTL, English `/en` LTR. Locale-specific copy and metadata; `next-intl` and localized field labels; isolate LTR email/phone/URLs on RTL pages.
- Keep 2D/3D logo geometry, trademark appearance and originals unchanged. Never fabricate offices, customer logos, team biographies, results, project assets or Google credentials.

## Workflow: Inspect → Plan → Implement → Verify → Report

1. **Classify**: new feature, defect, optimization, review, security, schema migration, SEO, 3D/UX, operations, or Codex prompt.
2. **Inspect actual repository**: `AGENTS.md`, docs, package manifests, lockfile, Next layouts, API controllers/guards, Prisma schema/migrations, env examples, tests and CI. If no repo exists, propose scaffolding and mark all file paths as proposed.
3. **Consult relevant reference(s)** in `references/` before proposing an implementation. Read only what is relevant; for cross-cutting work consult multiple.
4. **Brief implementation plan**: scope, file-by-file map, contracts, migration/backfill and rollback, auth/permissions, bilingual UX, SEO/cache effects, observability and tests. Respect existing code.
5. **Implement incrementally**: no invented APIs, no blanket rewrites, strict types, protected migration sequencing, idempotent external effects. Frontend pages stay thin; feature slices own client data access; controllers stay thin; services/policies own business behavior.
6. **Verify**: actual workspace lint/typecheck/test/build commands (not hypothetical script names), Prisma schema/migrate safety checks, unit/integration/E2E, accessibility + SEO + light/dark + mobile/RTL checks. Never report a command as passed unless actually run.
7. **Report**: findings or summary, modified files, migrations and rollback, commands/results, skipped checks, risks and follow-up actions. Do not state an integration is connected until verified.

## PostgreSQL + Prisma safety contract

- Primary identities are UUID/CUID or the repo's existing key type, **not Mongo ObjectIds**. Use foreign keys and relational constraints; use public slugs only for routes, never as relation identities. Unique slugs scoped appropriately to locale/content and preserve redirects when changed.
- Booking collision prevention must be **database enforced**: PostgreSQL `tstzrange` exclusion constraint for a staff/room resource, with `btree_gist` extension as needed, or documented equivalent that truly prevents overlaps. Use an explicit SQL migration when Prisma schema cannot express the constraint. Define which statuses occupy a slot and how cancellations release it. Protect concurrent requests in integration tests.
- Apply Prisma `$transaction` to booking writes, change-request approval, immutable event and outbox intent. Catch relevant Prisma/SQL conflict errors and map to stable HTTP errors. Retries must be idempotent.
- Use UTC instants and IANA office timezone; store date-only values as date-only; never assume Egypt is always UTC+02 because DST applies.
- Migrations are reviewed, backed up and tested in staging before `prisma migrate deploy`. Do not execute reset or destructive migration on production. Inspect query plans with `EXPLAIN (ANALYZE, BUFFERS)` on safe staging representative data; use bounded pagination and purpose-built indices.
- Never put secrets/PII/private booking tokens in client bundles, logs, analytics or public metadata. Prisma Client instantiated through a consistent Nest provider with lifecycle handling.

## Business invariants

- The browser may display available slots but **only** the committed database transaction confirms a booking.
- Booking types `IN_PERSON` and `ONLINE` are independent of status; online Google Meet link only when created via an authorized integration.
- A client reschedule request creates a ticket (`OPEN` → review/alternative/approved/declined); existing confirmed appointment time remains unchanged until staff approval and atomic recheck. `RESCHEDULED` is an event; current operational state generally stays `CONFIRMED`.
- Receptionist can handle appointment operations/change requests; CEO/Manager additionally controls system settings, permissions and analytics. Enforce API policies, not menu visibility.
- Queue notification intents in a transactional outbox, then deliver Resend/Slack via retries. Slack/email failure must not corrupt or undo a committed booking; duplicate jobs must not create duplicate business side effects.

## SEO and production UX invariants

- SEO starts at architecture phase, not after animation. Server-render crawlable Arabic/English service content; unique titles/H1/descriptions, self canonicals, reciprocal `hreflang`, sensible `x-default`, sitemaps, structured data grounded in real business facts, redirects, canonical and robots QA.
- Maps and Google integrations do not inherently improve ranking. Verified business location/GBP, legitimate content and performance matter; no ranking promises.
- Keep 3D canvas decorative; all important headings, buttons and content remain real HTML. Lazy-load the scene and maps. Provide theme/locale-consistent fallback, avoid hydration mismatch, comply with reduced motion.
- Mobile-first accessible components, clear focus, form validation, empty/loading/error/confirmation states and consent-aware analytics.

## Reference routing

- `references/architecture-and-stack.md` — monorepo shape, module boundaries, full technical stack.
- `references/prisma-postgres-patterns.md` — relational modeling, SQL overlap constraint, transactions, migrations, performance.
- `references/booking-and-operations.md` — booking, client change tickets, roles, notifications, analytics.
- `references/seo-and-localization.md` — international SEO, bilingual routes, Google setup and local business facts.
- `references/design-and-motion.md` — exact color/font tokens, light/dark, 3D/GSAP performance and accessibility.
- `references/security-and-quality.md` — security, OWASP, tests, release/rollback, observability.
- `references/codex-prompt-template.md` — reusable file-by-file prompt contract for AI coding agents.
- `references/review-checklist.md` — project-focused audit and definition of done.

## Future companion skills (separate skills, not bundled into this one)

Create later as dedicated independently triggerable skills: `almorad-amc-ci-cd`, `almorad-amc-seo-engineer`, and `almorad-amc-ui-ux-designer`. Engineering skill invokes their documented gates when installed and should not duplicate their full playbooks.

# ALMORAD AMC engineering audit checklist

## Data integrity / Prisma
- [ ] Schema and generated Prisma Client match installed version and environment.
- [ ] Database FK/check/unique constraints, booking overlap constraints and indexes actually exist after migrations.
- [ ] Staff/room/office booking collision logic is correct under simultaneous submissions.
- [ ] Booking and ticket approval use atomic writes, event history and outbox.
- [ ] No MongoDB/Mongoose/ObjectId/.lean() leftovers.
- [ ] Destructive migration has a backup/backfill/staging validation/rollback plan.
- [ ] Typed bounded Prisma queries; representative explain plans for slow routes.

## Website / SEO / localization
- [ ] English and Arabic pages have SSR content, unique title/H1/description and crawlable links.
- [ ] Canonical/hreflang reciprocity, sitemap/robots and 404/redirects are correct.
- [ ] Four pillars/11 service detail pages with real, reviewed content.
- [ ] No fabricated business facts or Google ranking guarantees.
- [ ] Arabic RTL / English LTR, localized validation and mixed-direction fields.

## Design / performance
- [ ] Exactly approved palette values and semantic accessible foreground pairings.
- [ ] Cairo/IBM Plex Sans/Redaction 100 assigned to proper roles.
- [ ] Light and dark, 3D fallback and reduced motion all work.
- [ ] Lazy WebGL/maps, no heavy canvas-only SEO copy; CWV and accessibility checks.

## Authorization / business workflow
- [ ] Receptionist and manager authorization tested on backend (including denial cases).
- [ ] Client change request doesn't modify appointment until approved transaction.
- [ ] Booking manage tokens scoped/expiring/hashed/never logged.
- [ ] Real office address/map only after verification.
- [ ] Queue sends are idempotent; Slack/Resend/Calendar partial failures cannot rollback bookings.
- [ ] Analytics exclude PII and misleading uninstrumented conversion metrics.

## Release
- [ ] Lint/typecheck/build/unit/integration/E2E run and actual results recorded.
- [ ] Staging migration, Prisma SQL extension constraints and rollback rehearsed.
- [ ] Postgres backups/restoration and monitoring in place.
- [ ] Third-party connections/deployment require explicit authorization.

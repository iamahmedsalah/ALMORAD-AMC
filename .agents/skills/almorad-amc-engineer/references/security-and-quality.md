# Security, quality, runtime and deployment gates

## Threat model

Public booking and contact endpoints are bot/spam targets. Staff login and client manage links are sensitive. Mitigate enumeration, credential stuffing, CSRF, stored/reflected XSS, SSRF to integrations, IDOR, forged webhooks, replay, token leaks, over-permissioned Google/Slack apps and accidental analytics PII. Use server-side role/permission checks and deny-by-default. HTTPS-only secure HttpOnly cookies with suitable SameSite/CSRF strategy, session rotation and sensible expiry. Rate limit in Redis with per-IP and relevant per-identity dimensions; do not trust client source IP without configured proxy trust. Secrets encrypted/secret store, scrub logs, CSP/security headers tailored to Three.js/Maps.

## Operational readiness

Use supported patched Node and dependencies, minimal Docker images, nonroot process, health/readiness routes, structured logging, correlation IDs, tracing and metrics. Monitor booking conflicts, queue latency/outbox backlog, email bounces, Google sync failures, Nest HTTP latency, Prisma query timing, Postgres connections/locks, Core Web Vitals. Back up Postgres automatically, verify restore in isolation, and rehearse rollback to compatible schema. Do not assume Prisma down migrations can reverse destructive SQL safely.

## Required test layers

- Unit: schema/validation, slot policies, timezone, auth policies, translations, server-side SEO metadata.
- Integration: disposable PostgreSQL, Prisma migrations and SQL constraints, race-condition double booking, ticket approval atomicity, outbox reconciliation, idempotent retries, permission deny paths.
- API: input validation, rate limit, missing/expired tokens, no PII leakage, proper status codes.
- E2E: English and Arabic booking and review, receptionist/manager dashboard, office direction fallback, responsive and themes.
- Browser quality: axe or equivalent plus manual WCAG checks, Lighthouse CI, HTML crawl simulation, hreflang/canonical/sitemap, SSR when JS unavailable.

## Reporting

Before editing: concise plan, risk classification and migration impact. After editing: actual commands, outputs, tests not run, altered files, expected backfill/rollback, observability and any remaining risks. Never claim production readiness on unit tests alone. Never deploy, send external notifications, authorize Google or change external systems without instruction and credentials/authorization.

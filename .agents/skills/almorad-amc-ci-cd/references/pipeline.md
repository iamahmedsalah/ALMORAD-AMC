# GitHub Actions design

Jobs: `changes` → `static-checks` → `unit` → `postgres-integration` → `playwright` → `build` → `security` → `publish` (trusted branches only) → `deploy-staging` → `deploy-production` (manual approval) → `post-deploy-smoke`.

Use lockfile-frozen install. Actual monorepo scripts must be read; example commands only: `pnpm install --frozen-lockfile`, `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`, `pnpm -r build`, `pnpm exec prisma validate` (inside API workspace). Cache pnpm dependencies; run Postgres/Redis integration dependencies as isolated services. Validate environment scoped secrets, no production secrets in PRs. Add timeouts and restricted permissions.

Test contracts: 2 locales, 11 service pages, noindex staff, resilient GSAP fallback, booking concurrency, ticket review, RBAC, outbox, migrations and health endpoints. Implement secrets scanning and container CVE checks; document thresholds and exceptions. Never reproduce reference Vercel manifest or Mongoose checks.

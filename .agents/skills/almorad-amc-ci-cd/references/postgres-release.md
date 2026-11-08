# PostgreSQL / Prisma release guardrails

Inspect `schema.prisma`, migration SQL, shadow DB usage, `_prisma_migrations` status and whether `prisma.config.ts` applies to installed Prisma. Use `prisma migrate dev` only in development, `prisma migrate deploy` for reviewed deployment migrations. Never automate reset on persistent databases.

Prisma cannot express all Postgres constraints: preserve hand-written `btree_gist` + `tstzrange` exclusion logic as explicit tracked SQL migrations. Check extension permissions and effective conflict predicate for `CONFIRMED` appointments. Exercise parallel booking transactions and check `23P01` conflict mapping.

Deployment pattern: schema expansion → compatible app/worker versions → data backfill with checkpoints → validation → old-column retirement in later releases. Take tested backup/PITR checkpoint before destructive DDL. Rollback app image separately from data and document migration recovery; avoid assuming schema downgrade is safe.

Database probes: connection limits, migrations, long locks, bloat, index usage, slow queries, disk growth, backup success, restore rehearsal. Protect connection strings and client data.

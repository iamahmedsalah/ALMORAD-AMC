# Docker / VPS operations

Services: Next.js web, NestJS API, BullMQ worker, Postgres, Redis and reverse proxy. Production Postgres preferably managed or on locked-down private Docker network with persistent encrypted backups; no public DB/Redis ports. TLS termination, HSTS where safe, secure cookies, correct proxy trust and domain/CORS allow-list.

Use pinned images, multi-stage Docker builds, non-root runtime, read-only filesystem where feasible, sane memory/cpu limits, healthchecks, restart policy, log rotation, resource alerts. `depends_on` is not readiness without healthchecks. Never copy `.env` into images. Protect persistent volumes.

Deploy gates: image digest, compose config validation, staging smoke, migration review, explicit production approval, isolated deploy service accounts, health/readiness endpoints and rollback plan. Ensure cache invalidation and Next public runtime configuration correct.

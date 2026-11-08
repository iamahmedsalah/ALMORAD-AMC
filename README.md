# ALMORAD AMC

Bilingual Growth & Brand Studio website: Next.js public pages, official Three.js logo scene, GSAP motion, Solar icons, Turborepo task caching, and a NestJS/PostgreSQL API foundation. Client booking, staff-reviewed cancellation/rescheduling, receptionist calendar and CEO analytics are now implemented locally. See [booking/demo setup](docs/booking-and-demo.md). See [implementation status](docs/implementation-status.md), [content map](docs/content-seo-map.md), [asset credits](docs/asset-notices.md) and [release preparation](docs/release-readiness.md).

Requires Node 24 and pnpm 11.11.0. On Windows use `pnpm.cmd` if PowerShell blocks script entrypoints.

```powershell
Copy-Item .env.example .env
pnpm.cmd install --frozen-lockfile
pnpm.cmd db:generate
pnpm.cmd dev:web
```

Open http://localhost:3000/en or http://localhost:3000/ar. Services include four category hubs and eleven offering pages. Studio, Work, Contact and Credits also support both locales. Dark/light/system themes and locale switching preserve the current route. Work/Contact show honest pending-content states until approved assets/details are supplied. No fictional projects, team members or offices are displayed.

```powershell
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
pnpm.cmd exec playwright install chromium
pnpm.cmd test:e2e
```

Turborepo caches builds, Prisma generation and package typechecks, with dependency ordering. Repository-wide lint and unit tests execute directly. Repeat `pnpm build` to restore unchanged outputs. `pnpm dev` starts both apps; `pnpm dev:api` starts the API. Database operations and browser/integration tests are uncached. No remote cache is configured.

For the API, start the isolated PostgreSQL service with `docker compose --env-file .env -f docker-compose.yml up -d`, then run `pnpm db:validate`, `pnpm db:migrate` and `pnpm dev:api`. API binds to loopback on port 4000; health/readiness are `/health` and `/health/ready`. Development OpenAPI is `/docs`. Tests require `TEST_DATABASE_URL` pointing at a local separate `*_test` database with migrations applied. Never reset or test against production. The optional `_demo` seed creates one inactive labelled staff identity, no credentials or appointments.

Staff access now includes localized login, account/session management, password changes and manager/CEO security audit views. HttpOnly cookies, session-bound CSRF, signed server proxy requests and API permissions protect staff data; PostgreSQL stores shared rate limits. Additive migrations introduce credentials, audit history and rate-limit buckets. No default staff account exists. See [staff operations](docs/staff-and-operations.md). Booking and appointment workflows are implemented with a shared conflict-safe calendar and API permissions.

The 3D hero loads the user-supplied `/3d/mc-logo.glb` in a lazy client island. It pauses offscreen/in background tabs, supports a pause button, and falls back to the original SVG on reduced motion, save-data, missing WebGL or model failure. GSAP is scoped and disposable; all essential content is server-rendered HTML. `pnpm icons:generate` reproduces the selected Solar paths from the installed official Iconify package. SVG favicon preserves the original artwork. Cairo/IBM Plex Sans are served locally after the initial Google Fonts build download. Redaction 100 uses Georgia until a licensed font binary is provided.

Public configuration is compiled at build time. A verified `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CONTENT_APPROVED=true` are both required for indexing; previews otherwise remain noindex with an empty sitemap. Work/Contact/Credits remain noindex. Review bilingual copy before approving. Optional verified email/phone/address/maps values are documented in `.env.example`. No analytics, email, Google, Slack or queue service is connected.

`Dockerfile.web` and `docker-compose.prod.yml` prepare a local standalone web container. `.github/workflows/validate.yml` defines read-only checks with disposable PostgreSQL. The selected hosting target is two Vercel projects with Prisma Postgres. See [Vercel setup](docs/vercel-deployment.md), [domain/email recommendations](docs/domain-and-email.md) and [release gates](docs/release-readiness.md). Local backup/restore tooling is implemented; live provider backup, secrets, deployment and monitoring still need actual configuration and authorization.

To test a running local preview container on Windows, set `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3100'`, run `pnpm.cmd test:e2e`, then remove the variable with `Remove-Item Env:PLAYWRIGHT_BASE_URL`. Only local HTTP(S) origins are accepted; with no override, Playwright starts its own production server on port 3000, which must be free.

Use pnpm demo:setup and pnpm preview:demo after the local demo migrations/build to try the mock Receptionist and CEO accounts. Generated credentials are in ignored .env.demo; the preview uses http://127.0.0.1:4400. Demo settings cannot activate production booking.

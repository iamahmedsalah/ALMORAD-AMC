# ALMORAD AMC

Bilingual Growth & Brand Studio website: Next.js public pages, official Three.js logo scene, GSAP motion, Solar icons, Turborepo task caching, and a NestJS/PostgreSQL API foundation. Client booking, staff-reviewed cancellation/rescheduling, receptionist calendar and CEO analytics are now implemented locally. See [booking/demo setup](docs/booking-and-demo.md). See [implementation status](docs/implementation-status.md), [content map](docs/content-seo-map.md), [asset credits](docs/asset-notices.md) and [release preparation](docs/release-readiness.md).

Requires Node 24 and pnpm 11.11.0. On Windows use `pnpm.cmd` if PowerShell blocks script entrypoints.

```powershell
Copy-Item .env.example .env
pnpm.cmd install --frozen-lockfile
pnpm.cmd db:generate
pnpm.cmd dev:web
```

Open http://localhost:3000/en or http://localhost:3000/ar. Services include four category hubs and eleven offering pages. About us, Work and Contact support both locales. Dark/light/system themes and locale switching preserve the current route. Work/Contact show honest pending-content states until approved assets/details are supplied. No fictional projects, team members or offices are displayed.

```powershell
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
pnpm.cmd exec playwright install chromium
pnpm.cmd test:e2e
```

Turborepo caches builds, Prisma generation and package typechecks, with dependency ordering. Repository-wide lint and unit tests execute directly. Repeat `pnpm build` to restore unchanged outputs. `pnpm dev` starts both apps; `pnpm dev:api` starts the API. Database operations and browser/integration tests are uncached. No remote cache is configured.

For API development, configure `.env` with the local development database URL, then run `pnpm dev:setup` and `pnpm dev`. Setup starts only PostgreSQL in Docker, waits for health, applies pending migrations and generates Prisma Client; web/API run directly with pnpm. After adding migration files, `pnpm db:migrate:dev` applies pending migrations and regenerates the client. The guarded dev command refuses hosted URLs, production/CI environments and mismatched runtime/migration databases; it never resets the database or creates migration files from schema changes. API binds to loopback on port 4000; health/readiness are `/health` and `/health/ready`. Development OpenAPI is `/docs`. `pnpm dev:db:stop` stops the database without deleting its volume. The development-only compose file is excluded from Vercel uploads. CI uses native PostgreSQL 18 independently. Tests require a separate local *_test database; never reset or test against production.

Staff access now includes localized login, account/session management, password changes and manager/CEO security audit views. HttpOnly cookies, session-bound CSRF, signed server proxy requests and API permissions protect staff data; PostgreSQL stores shared rate limits. Additive migrations introduce credentials, audit history and rate-limit buckets. For local `amc_dev` only, run `pnpm staff:dev:setup` after `pnpm dev:setup` to create the example Manager and Receptionist accounts listed in `.env.example`. The command writes random passwords to ignored `.env.dev-staff`; read that local file to sign in. It does not reset existing accounts. No production default staff account exists. See [staff operations](docs/staff-and-operations.md). Booking and appointment workflows are implemented with a shared conflict-safe calendar and API permissions.

The 3D hero loads the user-supplied `/3d/mc-logo.glb` in a lazy client island. It pauses offscreen/in background tabs, supports a pause button, and falls back to the original SVG on reduced motion, save-data, missing WebGL or model failure. GSAP is scoped and disposable; all essential content is server-rendered HTML. `pnpm icons:generate` reproduces the selected Solar paths from the installed official Iconify package. SVG favicon preserves the original artwork. Cairo/IBM Plex Sans are served locally after the initial Google Fonts build download. Redaction 100 uses Georgia until a licensed font binary is provided.

Public configuration is compiled at build time. A verified `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CONTENT_APPROVED=true` are both required for indexing; previews otherwise remain noindex with an empty sitemap. Work/Contact remain noindex. Review bilingual copy before approving. Optional verified email/phone/address/maps values are documented in `.env.example`. No analytics, email, Google, Slack or queue service is connected.

Vercel is the only active deployment target. Root `vercel.json` configures the web and API services; PostgreSQL is hosted separately. The GitHub release job validates the workspace, deploys an unaliased Vercel candidate, verifies it, and promotes it. The release job does not back up, restore, rehearse, or migrate the production database. See [implementation status](docs/implementation-status.md) for actual results and [Vercel setup](docs/vercel-deployment.md) for configuration. Historical VPS/container templates are inactive in `archive/future-vps/`, excluded from Vercel uploads, and require fresh review before any future use. There is no active container workflow.

Normal Vercel builds do not apply database migrations. If a release needs schema changes, review and apply them through a separate guarded database release with a verified backup and compatible restore target before deploying code that depends on them. The API build hook runs migration checks only with explicit `AMC_RELEASE_MIGRATIONS=1` release context; the GitHub deploy job forces it off. New migration SQL must be committed; updating schema.prisma alone does not create a deployable migration.

To test an already running local preview server, set `PLAYWRIGHT_BASE_URL` to its local HTTP(S) origin. With no override, Playwright starts the production server on port 3000, which must be free.

Use pnpm demo:setup and pnpm preview:demo after the local demo migrations/build to try the mock Receptionist and CEO accounts. Generated credentials are in ignored .env.demo; the preview uses http://127.0.0.1:4400. Demo settings cannot activate production booking.

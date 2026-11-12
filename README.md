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

For Docker-free API development, set the provider-issued `DATABASE_URL` and optional `DIRECT_URL` for the same hosted PostgreSQL database in the root `.env`, plus `AMC_RELEASE_MIGRATIONS=1` and `AMC_MIGRATION_POLICY=development`. Run `pnpm dev:setup` and `pnpm dev`. Setup applies pending committed migrations, checks connectivity/history and generates Prisma Client; it never seeds or resets the database. `pnpm dev` and `pnpm dev:api` also apply pending migrations before starting. Prisma remains the ORM; no local PostgreSQL service is needed. `pnpm db:check` is read-only. Automated database tests still require isolated local *_test PostgreSQL and must never target the hosted application database.

For a local production build with real database/email settings, run `pnpm preview:cert`, `pnpm preview:build`, then `pnpm preview:local`. Open **https://localhost:4443/en** or `/ar`; the API and standalone web run in production mode with a local HTTPS proxy, secure staff cookies and the existing CSRF checks. OpenSSL is required only to generate the local self-signed certificate; existing certificate paths can be configured instead. No system certificate trust changes are made. See [hosted database and local preview](docs/local-hosted-development.md) for certificate handling and real email testing. This workflow preserves Resend/HubSpot configuration, so manual form submissions create real rows and may trigger configured external actions. No automated email or database fixture is sent/created by setup or startup.

Staff access now includes localized login, account/session management, password changes and manager/CEO security audit views. HttpOnly cookies, session-bound CSRF, signed server proxy requests and API permissions protect staff data; PostgreSQL stores shared rate limits. Additive migrations introduce credentials, audit history and rate-limit buckets. For local `amc_dev` only, run `pnpm staff:dev:setup` after `pnpm dev:setup` to create the example Manager and Receptionist accounts listed in `.env.example`. The command writes random passwords to ignored `.env.dev-staff`; read that local file to sign in. It does not reset existing accounts. No production default staff account exists. See [staff operations](docs/staff-and-operations.md). Booking and appointment workflows are implemented with a shared conflict-safe calendar and API permissions.

The 3D hero loads the user-supplied `/3d/mc-logo.glb` in a lazy client island. It pauses offscreen/in background tabs, supports a pause button, and falls back to the original SVG on reduced motion, save-data, missing WebGL or model failure. GSAP is scoped and disposable; all essential content is server-rendered HTML. `pnpm icons:generate` reproduces the selected Solar paths from the installed official Iconify package. SVG favicon preserves the original artwork. Cairo/IBM Plex Sans are served locally after the initial Google Fonts build download. Redaction 100 uses Georgia until a licensed font binary is provided.

Public configuration is compiled at build time. A verified `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CONTENT_APPROVED=true` are both required for indexing; previews otherwise remain noindex with an empty sitemap. Work/Contact remain noindex. Review bilingual copy before approving. Optional verified email/phone/address/maps values are documented in `.env.example`. No analytics, email, Google, Slack or queue service is connected.

Vercel is the only active deployment target. Root `vercel.json` configures the web and API services; PostgreSQL is hosted separately. The GitHub release job validates the workspace, deploys an unaliased Vercel candidate, applies pending migrations during its API build, verifies it, and promotes it. The owner-approved development/testing policy omits hosted backup/restore requirements. See [implementation status](docs/implementation-status.md) for actual results and [Vercel setup](docs/vercel-deployment.md) for configuration. Historical VPS/container templates are inactive in `archive/future-vps/`, excluded from Vercel uploads, and require fresh review before any future use. There is no active container workflow.

Automatic CI keeps lint, TypeScript, unit/API tests, isolated PostgreSQL integration and restore checks, production builds, dependency audit and secret scanning. Browser E2E is manual to reduce Actions compute: open **Actions > Browser E2E - manual > Run workflow** and choose `staff`, `public` or `all`. The browser workflow runs one job and never deploys. Public-only runs do not start PostgreSQL. Local `pnpm test:e2e` and `pnpm test:e2e:staff` commands remain available.

CI validates new migrations on its disposable PostgreSQL test database before release. The Vercel workflow supplies `AMC_RELEASE_MIGRATIONS=1` and `AMC_MIGRATION_POLICY=development`; the API build hook applies pending migrations outside Turbo's cache, verifies history, and blocks deployment on failure. Authorized preview builds support the same hook against their configured database. This is the current testing policy; the guarded production policy remains available for launch. New migration SQL must be committed; updating schema.prisma alone does not create a deployable migration.

To test an already running local preview server, set `PLAYWRIGHT_BASE_URL` to its local HTTP(S) origin. With no override, Playwright starts the production server on port 3000, which must be free.

Use pnpm demo:setup and pnpm preview:demo after the local demo migrations/build to try the mock Receptionist and CEO accounts. Generated credentials are in ignored .env.demo; the preview uses http://127.0.0.1:4400. Demo settings cannot activate production booking.

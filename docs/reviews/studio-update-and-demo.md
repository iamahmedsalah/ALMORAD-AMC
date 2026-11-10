# Studio update and receptionist demo — 10 November 2026

Implemented: standalone `/en/team` and `/ar/team` pages; removed team and Better together from landing and chapter navigation; compact laptop studio monitor; desktop navigation and booking CTA with tablet/mobile drawer; unique audiences, working steps and FAQ copy for all eleven services in English and Arabic; selected service carried into booking, validated against the active schedule. Existing team design-preview notice retained and the team page remains noindex until profiles are verified. Current user-approved navy/orange palette and original artwork preserved.

## Local receptionist demo

The demo is isolated from production. It does not create a publicly accessible sample-password staff account on Vercel. It contains synthetic clients, six appointments and two staff-reviewed change requests. The seed refuses production/remote databases and existing non-demo schedules. Provider credentials are cleared for the demo; appointment fixtures are labelled demo.

Start Docker Desktop. The following localhost-only container has already been created in this workspace:

```powershell
docker start amc-local-demo
pnpm.cmd demo:setup
pnpm.cmd build
pnpm.cmd preview:demo
```

For a fresh machine, create the isolated database once before setup:

```powershell
docker run --detach --name amc-local-demo --label amc.purpose=local-demo --publish 127.0.0.1:55440:5432 --env POSTGRES_USER=amc_demo --env POSTGRES_PASSWORD=local_demo_only --env POSTGRES_DB=amc_demo --volume amc-local-demo-data:/var/lib/postgresql postgres:18-alpine
```

Open http://127.0.0.1:4400/en/staff/login (Arabic: `/ar/staff/login`).

- Email: `demo-receptionist@example.invalid`
- Initial sample password: `AMC-Local-Demo-2026!`
- Booking calendar after signing in: http://127.0.0.1:4400/en/staff/calendar
- Public demo booking: http://127.0.0.1:4400/en/booking

The ignored `.env.demo` holds the actual local credentials and random signing secrets; an existing file is retained, so use its password if customized. `demo:setup` applies pending migrations only to local `amc_demo`, then seeds idempotently. It does not reset data. Stop the terminal to stop the preview; `docker stop amc-local-demo` stops the database while preserving its named volume. The generated CEO password remains in `.env.demo`.

## CI/CD activation

Project/team IDs and production environment secret names are already wired in `.github/workflows/ci-cd.yml`. See [Vercel setup](vercel-ci-cd-setup.md). The owner has authorized commit/push after checks pass. No secrets belong in Git. GitHub private workflow/environment values cannot be verified through unauthenticated public metadata; an actual Actions run is the acceptance check. No production database reset or public demo seed is part of this release.

## Verification

- Lint: zero errors, nine existing warnings (initial run).
- Typecheck: all five tasks passed.
- Full unit suite: 28 files, 93 tests passed on sequential rerun. Initial concurrent run had two hook timeouts under heavy build/browser load and outdated chapter assertions, both corrected/verified by rerun.
- Release safety: seven tests passed; actionlint passed; source-only Gitleaks scan found no leaks.
- Full production build passed, including isolated API import/listener checks. Subsequent web rebuild after removing the remaining team render passed, producing 64 prerendered pages.
- Team/navigation/gallery browser checks: 51 existing checks passed; two service route checks passed. Initial twelve new landing-removal checks found the remaining team render; final focused rerun passed all fourteen tests across EN/AR and 320/390/768/1024/1366/1440 widths.
- Local migrations: all eight applied successfully to isolated `amc_demo`; seed completed. Browser verified sample receptionist sign-in, synthetic appointment visibility in the calendar and Branding preselection from the service query.
- Full public browser suite and final release status are recorded in implementation-status.md when completed. No production contact/email/CRM delivery success is inferred from local demo checks.

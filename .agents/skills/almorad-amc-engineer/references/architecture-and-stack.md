# Architecture and tech stack

## Architecture

```text
almorad-amc/
  AGENTS.md
  apps/
    web/src/app/[locale]/(marketing)/
    web/src/app/[locale]/book/
    web/src/app/staff/
    web/src/features/{services,work,booking,office,staff}/
    web/src/components/{ui,layout,landing,three}/
    web/src/{i18n,lib,styles}/
    api/src/modules/{auth,users,services,work,offices,availability,bookings,booking-change-requests,notifications,slack,calendar,analytics,contact,audit,health}/
    api/prisma/{schema.prisma,migrations,seed.ts}
    worker/src/
  packages/{contracts,ui,config}/
  infra/{docker,proxy,monitoring}/
  docs/{architecture.md,design.md,seo.md,runbooks/}
```

Use actual folder layout if repo exists. A separate worker can be added when operationally justified; no speculative microservices.

## Infrastructure boundaries

Browser → Next.js public SSR/RSC and thin interactive islands → authenticated NestJS API → Prisma Client → PostgreSQL. NestJS writes booking and outbox atomically; BullMQ workers deliver Resend, Slack and calendar sync. Redis backs queue/rate-limits, not the authoritative booking state. Google Maps is client-facing for a verified office; Google Calendar is optional and requires explicit authorization. Search Console is a monitoring console, not an SEO rendering dependency.

## Modules and patterns

- `services`, `service_translations`, `localized_pages`, `case_studies` drive bilingual content. No fake customer/project/testimonial content.
- Public content may be sourced via server fetch with controlled caching/revalidation. Private bookings and staff data are dynamic, permission gated and never cached publicly.
- Backend: controller → validated DTO → policy/use-case service → Prisma repository/client → typed response, explicit permission checks. Use OpenAPI contracts and stable typed client; avoid dual conflicting validation definitions.
- UI: React Server Components for pages and content; client components for forms, filters, calendar, GSAP and R3F. Use TanStack Query for interactive server-state sync where warranted; Zustand only for genuinely shared client state.
- Static assets from approved originals. Deploy SSR web + API with secure networking; Postgres backups/PITR and tested restoration.

## Scope

Four pillar pages: Marketing, Advertising, Consulting, Web Development. Eleven detail pages: social media management, personal branding, market research & analysis, branding, media buying, outdoor advertising, corporate events, e-commerce consulting, management consulting, e-commerce websites, company websites & landing pages. Translate editorial copy separately; do not invent outcomes.

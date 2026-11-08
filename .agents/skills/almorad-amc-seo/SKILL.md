---
name: almorad-amc-seo-engineer
description: Independent technical/content/international/local SEO engineering skill for ALMORAD AMC. Use for SEO audits, Arabic/English keyword maps, 11 service pages, Next.js metadata/canonicals/hreflang, schema.org, sitemap/robots, Google Search Console, GA4, Google Business Profile, local SEO, Core Web Vitals and measurable organic growth.
---

# ALMORAD AMC — SEO & Growth Engineer

This is a **standalone** ALMORAD AMC skill: it works independently and does not require another AMC skill to be installed. Use this skill when requests match its description. For requests needing multiple specialties, coordinate by reading the actual project docs rather than assuming other skills exist.

## Source-of-truth order
1. Inspected repo/config/migrations/assets: actual implementation.
2. User-approved `docs/architecture.md` and `docs/design.md`, verified official brand material: intended requirements.
3. The bundled references in **this skill**: tactical guidance, never claims of implementation.
4. Clearly flag differences; don't silently overwrite requirements or invent live connections.

## Project facts (not assumptions)
- Brand: ALMORAD AMC — Growth & Brand Studio. Four pillars: Marketing (Social Media Management, Personal Branding, Market Research & Analysis, Branding); Advertising (Media Buying, Billboards & Outdoor Advertising, Corporate Events); Consulting (E-commerce Consulting, Management Consulting); Web Development (E-commerce Websites, Company Websites & Landing Pages).
- Public localized URLs: `/ar`, `/en`; RTL Cairo Arabic, LTR IBM Plex Sans English, selective Redaction 100 English display.
- Exact swatches: `#0B0A08`, `#14120E`, `#BE9D5B`, `#D8BE86`, `#F5F1E7`, `#CFCBC0`, `#A6A39B`, `#7A5F28`. Two fully developed themes.
- Stack intent: Next.js 16 App Router, React 19, NestJS 12, PostgreSQL + Prisma ORM and Migrate, Redis/BullMQ, Resend, Docker/VPS; conditional Google Search Console/Analytics/Business Profile/Maps/Calendar and Slack connections.
- Client meetings in-office or online, secure booking management links, reschedule tickets reviewed by reception, CEO/Manager analytics. Do not invent office details, contact numbers, team members, reviews or client results.
- Inspect actual project manifests, architecture/design docs, schemas, CI and code before applying a change; documentation describes target behavior, not proof of implementation.


## Workflow: audit → map intent → implement → validate → measure
1. Inspect site routes, real content, locale dictionaries, actual domain, sitemap, `robots`, metadata API, canonical/hreflang, crawl status and supplied portfolio. Do not invent rankings, queries, traffic, office, clients or outcomes.
2. Establish Egyptian Arabic and English keyword research separately. Separate informational vs transactional intent; use measured search volume/difficulty only when sourced. Create one primary intent cluster per indexable service page; avoid cannibalization.
3. Create a URL/keyword map across four category hubs and eleven service detail pages; include FAQ, work/case studies and optional insight content with editorial ownership. Provide both Arabic and English page title, description, H1, evidence section, internal link, CTA and schema plan.
4. Implement server-rendered indexable HTML for titles, descriptions and services; keep GSAP/Three.js purely progressive enhancement. Set unique per-locale Metadata API output, absolute self-canonical, reciprocal hreflang `ar`/`en` with optional x-default, OG images, breadcrumbs and internal links.
5. Implement robots and sitemaps for *published* crawlable URLs; exclude `/staff`, login, private booking management tokens, previews and unapproved pages from indexing; private routes still require authentication. Avoid mistakenly blocking required assets or public locale pages.
6. Use factual JSON-LD (`Organization`, appropriate `LocalBusiness` only after verified office information, `Service`, `BreadcrumbList`, `WebSite` if applicable). Avoid fake ratings, fabricated FAQs, fake business hours and unsupported rich result promises.
7. Implement consent-aware GA4 event tracking and Search Console verification/submission after domain approval; GA4/Search Console diagnose performance, not ranking boosts. Local GBP requires a real eligible business and consistent NAP.
8. Run SEO test suite: crawls, redirects, 404/410, locale alternates, canonical consistency, schema validation, title uniqueness, sitemap diff, PageSpeed/Core Web Vitals; report findings by criticality. No indexing/ranking guarantees.
9. Post-launch optimize based on legitimate queries, impressions, CTR and booking conversions; avoid spam/doorway location pages and unsourced AI content.

## SEO non-negotiables
- English `/en/...` and Arabic `/ar/...` both indexable, each with self-canonical; do not canonical Arabic to English. Avoid blanket IP-based crawler redirects.
- Ensure local keyword phrasing is natural Egyptian Arabic and accurate industry-specific English; translate for intent, not word-for-word.
- Public service content must work without JavaScript/3D. No headings exclusively inside WebGL canvas. Lazy maps and compressed images; prioritize text and hero media LCP.
- Field CWV goals at p75: LCP <=2.5s, INP <=200ms, CLS <=0.1; Lighthouse lab audits are diagnostics, not field proof.
- Consent and legal/privacy obligations: send only event names and non-personal parameters to analytics; never client names, emails, phone, booking token or private notes.
- Google connections are planned unless actual authorized accounts and domain verification are demonstrated.

## Output contract
Produce route-by-route issue inventory with severity, baseline if available, concrete file-level fixes, Arabic/English example metadata, keyword/intent and internal-link matrix, Google setup checklist, actual vs proposed verification, measurement plan and open factual dependencies (domain, address, permissions, proof assets).

## Relevant references — self-contained
- `references/keyword-service-map.md` — keyword service map.
- `references/technical-seo.md` — technical seo.
- `references/structured-data-local.md` — structured data local.
- `references/google-measurement.md` — google measurement.
- `references/seo-audit-checklist.md` — seo audit checklist.
- `references/task-prompt.md` — task prompt.

## Request protocol
Classify the task, inspect relevant files, consult the needed bundled references, propose file-by-file changes and acceptance criteria, implement only authorized actions, run actual checks where tools allow, and report results separately from proposed checks. Never claim tests, deployment, rankings, Google connection, or interactions succeeded without evidence.

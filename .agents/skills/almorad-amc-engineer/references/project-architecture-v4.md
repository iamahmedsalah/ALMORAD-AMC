# Almorad AMC — Complete Website Architecture V4 (Brand Palette + Typography)

**Updated:** 2026-11-05  
**Status:** Complete implementation specification. **Color palette values and font families provided by user on 5 November 2026.** Software implementation and external integrations not performed.  
**Source of truth:** `Almorad AMC portfolio .pdf` (8 pages), supplied architecture V2 and supplied `design(1).md`.  
**Important:** Preserve V2's booking-change tickets, Slack, manager analytics and receptionist role workflow. No integrations have been connected and no site has been implemented.

## Executive changes versus V2

- All **four portfolio service pillars and all 11 service offerings** are now in page architecture and SEO clusters, not just three example services.
- Design system uses the **user-supplied exact** black / gold / ivory / grey palette with working light/dark tokens; no `TBD` token values.
- Both language versions get public service detail pages, genuine localized copy and structured-data eligibility reviews.
- Booking CTA is contextual to each service; in-person booking shows verified office location and directions. Maintain receptionist-controlled change-request flow.
- Google SEO readiness is implemented before connecting Google properties; Search Console/GA4/Business Profile follow site/domain verification.

## User-supplied brand palette (exact values)

| Color | HEX | Use |
|---|---|---|
| Black | `#0B0A08` | Dark background, light-theme CTA/text |
| Charcoal | `#14120E` | Dark surfaces/cards |
| Gold | `#BE9D5B` | Signature brand accents and lighting |
| Soft gold | `#D8BE86` | Dark-theme highlighted action |
| Ivory | `#F5F1E7` | Light background, dark-theme foreground |
| Warm grey | `#CFCBC0` | Secondary surfaces |
| Muted grey | `#A6A39B` | Secondary UI elements, verify text contrast |
| Deep gold | `#7A5F28` | Light-theme accent, verify contrast |

Use these exactly, matching the palette screenshot supplied by the user. Color-pair accessibility requires contrast testing in both modes. Semantic warning/success/error colors may be derived for usability but are not additional official brand swatches. `design.md` contains usable implementation tokens and theme rules.

## User-selected typography

- **Arabic:** Cairo for all content, headings, forms, booking and dashboard. No Arabic tracking; validate shaping and line-height.
- **English primary:** IBM Plex Sans for all functional UI and body content.
- **English visual/editorial accent:** Redaction 100 for a few large hero/portfolio headings only. It is intentionally distressed and Latin-oriented; never apply to Arabic or use for functional controls.
- Font sources: https://fonts.google.com/specimen/Cairo ; https://fonts.google.com/specimen/IBM+Plex+Sans ; https://fonts.google.com/specimen/Redaction+100
- Optimize with `next/font/google` when the installed Next.js release supports the selected family; otherwise self-host under appropriate OFL via `next/font/local`. Validate file availability, license and fallbacks; do not ship inaccessible custom-font text images.
- Verify Googlebot and accessibility receive meaningful HTML headings irrespective of display font or 3D loading. Fonts must not cause significant CLS.

## Brand narrative and source fidelity

Positioning from the portfolio: **“We are a growth and brand studio. We work as your own marketing unit inside your company, suggesting ideas and acting as your partner.”** Core messaging: **“Four services. One partner.”**, **“Get known. Get seen. Get ready to grow. Get chosen.”**, and **“Better together.”** Rephrase for SEO only after copy approval; Arabic translations are editorial drafts and must be reviewed, not presented as source-provided copy.

## Full service taxonomy / conversion architecture

| Pillar | Service | Suggested English URL after `/en/services/` | Content to include from portfolio |
|---|---|---|---|
| Marketing | Social Media Management | `social-media-management` | Platform/content strategy; calendar/design/copy; posting/community; monthly reports |
| Marketing | Personal Branding | `personal-branding` | Positioning/story; profile/bio; thought leadership; visibility |
| Marketing | Market Research & Analysis | `market-research-analysis` | Audiences/customers; competitors; opportunity analysis; recommendations |
| Marketing | Branding | `branding` | Brand strategy; naming/message; logo/identity; guidelines |
| Advertising | Media Buying | `media-buying` | Media planning; channels; negotiation; tracking/optimization |
| Advertising | Billboards & Outdoor | `outdoor-advertising` | Creative; location selection; booking/printing/installation; monitoring |
| Advertising | Corporate Events | `corporate-events` | Events/activations; branding; suppliers; production; onsite management |
| Consulting | E-commerce Consulting | `ecommerce-consulting` | Business model; platform/payment/delivery; pricing/conversion; retention |
| Consulting | Management Consulting | `management-consulting` | Roles; process improvement; KPIs; implementation support |
| Web Development | E-commerce Websites | `ecommerce-website-development` | Store design; catalog/cart/checkout; payment/shipping; mobile/SEO |
| Web Development | Company Websites & Landing Pages | `company-websites-landing-pages` | Company sites; campaign landings; lead capture; speed/SEO/analytics |

**Source:** portfolio pp. 2–6. Website must not claim services, awards, clients, results, offices or reviews that are not supported. Add portfolio cases only with approved assets/permissions.

## Page tree for initial launch

```text
/{ar|en}
/{ar|en}/about
/{ar|en}/services
/{ar|en}/services/marketing
/{ar|en}/services/advertising
/{ar|en}/services/consulting
/{ar|en}/services/web-development
/{ar|en}/services/[one-of-11-service-slugs]
/{ar|en}/work
/{ar|en}/work/[case-study-slug]
/{ar|en}/team                     # only when real profiles approved
/{ar|en}/contact                  # real office with map/directions
/{ar|en}/book                     # public booking
/{ar|en}/booking/manage           # token actions: noindex/private
/{ar|en}/privacy
/{ar|en}/insights                 # only if editorial capacity exists
/staff/login
/staff/dashboard
/staff/calendar
/staff/change-requests
/staff/analytics                   # manager permission only
```

Do not create empty or thin 11 detail pages solely for SEO; create the 11 page templates plus professionally written original content before indexing each URL. Arabic URLs may use stable Latin slugs for implementation simplicity; Arabic headings and metadata must be genuinely localized.

## Landing sections and content architecture

1. Sticky identity-led nav; locale/theme toggle and Book a Consultation CTA.
2. SEO-visible editorial H1 + 3D identity hero (accessible static fallback).
3. Agency manifesto: growth/brand studio, a partner inside the client's business.
4. Four pillars, one partner: interactive story and direct links to pillar pages.
5. Service showcase: accessible, filterable 11 offerings (or four groups with expandable lists).
6. Selected work: real images, clear challenge/process/results, no fabricated metrics.
7. Better Together: four-service connection illustrated with tasteful GSAP sequencing.
8. Methodology: discover → strategize → create → launch → optimize, clearly labeled as proposed unless agency confirms.
9. Team: consented bios/photos.
10. FAQ: real helpful service and booking questions; no expectation of FAQ rich results.
11. Office: canonical record, address, hours, lightweight map preview, directions and click-to-call.
12. Book consultation: select service, in-person/online, date/time; route to booking wizard.
13. Footer: official details, navigation, privacy, accessibility, locale links.

## International and local SEO — concrete implementation tasks

### Before Google connects (Phase 1)
- Separate Arabic/Egyptian-language keyword discovery from English-language keyword discovery. Map one primary user intent + topic family per page, avoid keyword cannibalization across 11 details and four pillars.
- Real HTML headings, service detail body, helpful original FAQs, visible links, a specific agency value proposition. Three.js canvas never contains the only copy.
- Next.js `generateMetadata`, static/dynamic Metadata API, per-locale title/description/OpenGraph images, unique H1, self-referencing canonicals, reciprocal `hreflang` alternates, `x-default` only if route exists.
- Locale-aware XML sitemap and robots rules. Sitemap only indexable published URLs; `noindex` management/booking-token/dashboard. Do not rely on robots to secure private content.
- Structured data: Organization; appropriate verified LocalBusiness subtype if eligible; Service for truthful service pages; BreadcrumbList for deep pages; WebSite/WebPage as applicable. Never fabricate aggregateRating/reviews.
- Semantic internal linking: homepage → pillar → service → related case → book; context anchors and breadcrumbs both languages.
- Technical guardrails: correct 200/301/404/410; duplicate prevention; image alt; modern optimized image assets; page speed and render-based QA; server-rendered core content.
- Performance: field p75 CWV LCP ≤2.5s, INP ≤200ms, CLS ≤0.1. Initial lab thresholds are budgets only, not guaranteed rankings. Defer R3F, GSAP nonessential scripts and maps; honor reduced motion.
- Editorial SEO workflow: page briefs, approved Arabic copy, human-reviewed English, internal links, image rights, freshness and authorship where meaningful.

### After domain launch / Google access
1. Google Search Console DNS domain verification, submit sitemap, inspect English and Arabic page indexing, monitor queries and technical coverage.
2. GA4 consent-aware event mapping: service viewed, service CTA clicked, booking started, booking confirmed, change-request submitted, contact submitted, directions clicked. Do not send email, phone, names, tokens or meeting notes.
3. Google Business Profile eligibility + owner verification; official name/verified address/phone/hours/photos and canonical website URL. Keep information consistent; no fake reviews or fake service areas.
4. Google Maps embed only from verified Place ID/location; lazy load; plain hyperlink always present. Map API keys restricted; billing alerts.
5. Optional Google Calendar/Meet OAuth with least privilege, encrypted credentials and transactional outbox reconciliation; PostgreSQL remains booking authority.
6. Monthly SEO report: index coverage, nonbrand organic clicks/impressions/CTR, service-cluster queries, conversions, page speed, location actions; iterate on evidenced data, not ranking promises.

### SEO content starter brief (proposed; validate search volumes and competition)
| Cluster | English intent | Arabic intent draft | CTA |
|---|---|---|---|
| Marketing | social media management agency, branding services | إدارة حسابات التواصل الاجتماعي، خدمات بناء الهوية التجارية | Discuss marketing |
| Advertising | media buying agency, outdoor advertising | شراء المساحات الإعلانية، إعلانات الطرق | Plan a campaign |
| Consulting | ecommerce strategy consulting, management consulting | استشارات التجارة الإلكترونية، الاستشارات الإدارية | Book a strategy call |
| Web | ecommerce website development, company website design | تصميم متجر إلكتروني، تصميم مواقع الشركات | Discuss a website |

These are **seed phrases, not researched validated ranking targets**. Market/city modifiers can only be finalized after the real service geography and office details are confirmed.

## Design and motion implementation gates

- 3D logo fidelity from actual editable logo asset. Build SVG/GLB extrusion if geometry is suitable; otherwise Blender. Don't reverse-engineer the logo from portfolio screenshot as production art.
- One hero scene and limited decorative scenes; component-level GSAP, lifecycle cleanup, static poster fallback, progressive loading. Do not bind primary navigation to scroll animations.
- Dark as theatrical portfolio mode, light as warm editorial mode. Theme toggle including system setting, persistent selection, no flash; readable Arabic/English.
- Full design tokens in `design.md`, with exact user-provided palette and tested contrast pairs before release.

## Booking, office, operations — preserve all V2 behavior

- Public client booking includes selected one of 11 services, `IN_PERSON`/`ONLINE`, available server slots, details, consent, confirmed transactional booking, email/.ics, reminder and secure management link.
- Office meetings include address, Google directions, office timezone and room/capacity considerations from **verified** `offices` record; do not invent address/hours/Place ID.
- Client reschedule requests create a ticket and **do not automatically modify the existing booking**. Receptionist reviews/approves/proposes alternative; acceptance rechecks availability inside DB transaction. Every transition audited.
- Receptionist: appointments/agenda, clients, change requests. CEO/Manager: same plus analytics, staff settings, integrations, full audit.
- Slack as notification-only: new booking, changes, cancellations, agenda. Use outbox/BullMQ/retries/deduplication; Slack failure must never invalidate a booking.
- Google Calendar/Meet are optional integrations; never assume calendar authorization exists. Minimize personal data in logs/Slack/analytics.
- Management analytics use explicitly defined metrics and no fabricated denominators.

## Delivery sequence and verification

| Phase | Deliverable | Release gate |
|---|---|---|
| 0 | Branding palette proposal approval; assets/verified business data; initial keywords | Brand values recorded; remaining business details verified, unresolved fields documented |
| 1 | Next.js/NestJS monorepo, data, bilingual routes and initial SEO | Both languages indexable with valid metadata, sitemap and real server HTML |
| 2 | Premium public site + four service clusters/11 offerings + work | Lighthouse budgets, AA audits, real content, reduced-motion and fallback |
| 3 | Booking API, mail, availability, office, secure client management | Overlap/concurrency and localized booking E2E tests pass |
| 4 | Receptionist/manager dashboard and change-request tickets | Server RBAC, audit trails, ticket/booking data integrity |
| 5 | Resend, Slack, optional Google Calendar and CEO analytics | Retries/idempotency, accurate aggregates, privacy |
| 6 | Google Search Console, GA4, Business Profile, Maps and launch | Domain verified, sitemap submitted, critical routes and performance monitored |
| 7 | SEO growth and case-study publishing | Improve based on real performance and verified work |

## Open inputs (must not invent)

- Implement the user-supplied palette HEXs and verify logo variants; obtain high-resolution original vector logo.
- Verify office full address, pin/Place ID, hours, timezone, customer-facing phone and service areas.
- Domain/hosting and authorization for Google properties, Slack and Resend.
- Actual staff count, meeting hours/duration/cancellation rules, supported online meetings, source of client case studies.
- Arabic service names, approved brand tone/keywords and publication/asset rights.

---

# Preserved enhanced architecture plan V2 (reference and all detailed workflows)

Below is the complete provided V2 to ensure no booking/change-ticket/analytics/API rules are lost. The V3 sections above supersede only the outdated service-page coverage and unassigned color direction; V2 still governs all unchanged business logic.

# Almorad-AMC — Enhanced Production Website Architecture & Delivery Plan

**Updated:** 5 November 2026  
**Status:** Proposed specification — no implementation or Google connection performed.

## 1. Project goals

Create a premium, performant, bilingual Arabic/English marketing agency website with a distinctive Three.js and GSAP landing experience, genuine search-engine visibility, service pages, portfolio, a client appointment booking flow, verified office location and directions, and a secure two-role internal scheduling dashboard. SEO and accessibility are first-class acceptance criteria, not post-launch tasks.

## 2. Technology decisions

- **Web:** Next.js **16.4.5** (stable as checked 5 Nov 2026), App Router, React, TypeScript strict mode, React Server Components by default.
- **API:** NestJS **12.3.2** (current npm latest as checked 5 Nov 2026), REST/OpenAPI, validation pipes, DTOs.
- **Bilingual content:** next-intl with `/ar` and `/en` locale routes; Arabic `lang=ar dir=rtl`; English `lang=en dir=ltr`; translated slugs are optional but consistent mapping is essential.
- **Visuals:** Tailwind CSS v4, shadcn/ui, accessible Radix primitives, design tokens, fonts loaded with next/font.
- **3D and motion:** Three.js + @react-three/fiber + @react-three/drei; GSAP with ScrollTrigger; optional Lenis only if testing establishes accessibility and performance.
- **Data:** PostgreSQL with Prisma and database migrations; Redis and BullMQ for reliable notifications and sync.
- **Communications:** Resend with verified sender domain, SPF/DKIM/DMARC, idempotent queued delivery.
- **External services:** Google Search Console, GA4, Google Business Profile, Google Maps Embed and directions link; optionally OAuth-authorized Google Calendar with unique Google Meet links for remote appointments.
- **Deployment:** Web and API deployed as separate containers on VPS behind TLS reverse proxy; managed or backed-up PostgreSQL and Redis; CI/CD with security scanning and rollback.
- **Version hygiene:** Pin compatible package releases in lockfile; validate Node LTS and Prisma/Next/Nest peer compatibility before installation; avoid canary and obsolete Next middleware conventions.

## 3. Pages and information architecture

- `/ar`, `/en`: premium homepage with crawlable headings and content
- `/[locale]/about`: agency background, credentials, strategy, people
- `/[locale]/services`: overview + dedicated service landing pages for marketing, advertising, consulting (expand services only after business confirmation)
- `/[locale]/work`: case studies index with indexable individual case study pages
- `/[locale]/team`: staff profiles (only with permission)
- `/[locale]/insights`: optional editorial/SEO content hub, launched only when there is an editorial owner
- `/[locale]/contact`: real contacts, verified office, opening hours, lightweight Google Map, directions, inquiry form
- `/[locale]/book`: meeting type/service -> time slot -> client details -> confirm
- `/[locale]/booking/manage`: signed, expiring token flow for reschedule/cancel; no account required
- `/staff/login`, `/staff/dashboard`, `/staff/calendar`, `/staff/services`, `/staff/availability`, `/staff/settings`: `noindex`, staff-only; not linked from primary marketing navigation.

**Main landing sections:** (1) sticky bilingual header, (2) typography-led hero with interactive 3D logo and CTAs, (3) trust/credibility, (4) agency introduction, (5) service cards with internal links, (6) selected work/case studies, (7) approach/process, (8) team, (9) FAQ, (10) office location and map, (11) meeting-booking CTA, (12) footer with contact, address, policies, sitemap links.

## 4. Premium animation and 3D design

- Design direction: editorial layout, bold typographic hierarchy, dramatic but controlled contrast, deliberate motion, restrained lighting and material choices, identity-faithful 3D logo.
- Convert approved vector logo to extrusion/GLB rather than guessing the logo geometry from a raster image. Keep a consistent static SVG/poster fallback.
- Hero scene: floating/extruded logo, pointer-responsive rotation on capable devices, scroll-driven scene transition, subtle depth. Do not force drag controls on every visitor.
- GSAP only inside client islands, scoped with lifecycle cleanup; avoid hijacking scroll, massive pinned areas, or motion required to understand content.
- Dynamic import 3D after text/primary CTA has rendered; code split scenes and defer offscreen scenes. Lazy load the office map behind a click or viewport threshold.
- Use modern compressed geometry/textures, capped DPR/frame rate on mobile, avoid high-cost effects, avoid shaders that cause WebGL context loss.
- Honor `prefers-reduced-motion`, reduced data/battery capability and keyboard focus. Always provide usable content without WebGL and JS-dependent animation.
- Keep headings/body and primary SEO content in server-rendered semantic HTML; no canvas-only content.

## 5. International SEO: implement in Phase 1

1. Perform keyword and intent research separately in Egyptian Arabic and English; document primary/secondary keywords, audience and intent for each service page. Do not literal-translate SEO copy.
2. Server-render all public main content. Give every public page a unique localized title, meta description, one visible H1, descriptive heading hierarchy and meaningful internal links.
3. Dedicated locale URLs (`/ar/...`, `/en/...`) with self-referential canonical URLs and **reciprocal, self-inclusive** `hreflang` annotations (`ar`, `en`, optional `x-default`). Preserve locale choice through navigation and booking. Never redirect Googlebot solely by IP.
4. Create `app/robots.ts`, locale-aware dynamic `sitemap.ts` with published indexable pages, 404/410 handling, redirects and correct HTTP status. Exclude staff/admin, booking management, private tokens, search results and previews from indexation; protect private routes with auth, not robots alone.
5. Add supported schema.org JSON-LD for `Organization`, real verified `LocalBusiness`/office location, `Service`, `BreadcrumbList`, and appropriate `WebPage` entities. Only publish factual details and verify eligibility; do not assume FAQs get Google rich results.
6. Social previews: localized Open Graph / Twitter cards, approved logo, properly sized OG assets, accessible descriptive image alt text, descriptive file names.
7. Build actual service and case-study pages with proof, outcomes, location/service relevance and calls to action; avoid thin pages, AI-generated filler or duplicated language sections.
8. Test mobile usability and Core Web Vitals using real field data once available. Targets at 75th percentile: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1. Use Lighthouse as diagnostic, not proof of real-user scores.
9. Track index coverage, crawl errors, `hreflang` pairing, canonical behavior, broken internal links, redirect loops and metadata across every locale in CI where possible.
10. Add consent-aware analytics and privacy policy; avoid loading non-essential tags before required consent based on applicable legal requirements.

## 6. Google integration sequence

**After SEO implementation, and once the live domain is controlled:**

1. Verify domain property in **Google Search Console** through DNS, submit live sitemap, inspect `/ar` and `/en` homepage and key service URLs, monitor indexing and rich result reports.
2. Configure **Google Analytics 4** and optional **Google Tag Manager** with consent controls. Events: `view_service`, `click_book_meeting`, `booking_started`, `booking_confirmed`, `contact_submitted`, `click_get_directions`, `click_phone`, `change_language`. Avoid sending personal client data to analytics.
3. Claim or verify the legitimate **Google Business Profile** only if the agency is eligible; match official name, real office address, business categories, phone, website, opening hours, photos and map pin. Do not invent reviews.
4. Embed an office location using **Maps Embed API** / verified Place ID and provide a plain **Get Directions** Google Maps hyperlink; map loads lazily. Define map API key restrictions and quota/billing alerts.
5. Optionally connect a permitted **Google Calendar** account using OAuth, least-privilege scopes and refresh-token encryption; pull busy windows and push confirmed appointments. Make PostgreSQL the booking authority and implement reconciliation/retries when Calendar API is temporarily unavailable.
6. For online appointments only, create unique Google Meet conference details per event via Calendar API when authorization is available; otherwise gracefully fall back to an office meeting or manual link workflow.

Google Search Console and GA4 measure and diagnose SEO; they do **not** guarantee rankings.

## 7. Client booking specification

### Client journey

1. Select service (e.g. marketing consultation, advertising inquiry, strategic consulting).
2. Select **At our office** or **Online** (if enabled).
3. Select available staff member optionally; otherwise assign automatically based on configured availability.
4. Select valid date/time using the agency's verified timezone; show user's preferred timezone for remote meetings.
5. Enter client name, email, phone, company, short objective/notes and required privacy acknowledgement.
6. Validate on client/server, rate limit, spam-protect, and submit with idempotency key.
7. Reserve slot using PostgreSQL transaction + exclusion constraint or equivalent overlap prevention, then persist confirmed meeting.
8. Enqueue Resend email with calendar invitation (.ics); for office meetings include localized address, embedded office-details link and Get Directions URL; online meetings include verified meeting link if available.
9. Supply signed, hashed, scoped, expiring manage-booking token for cancellation/rescheduling; rotate token after use and enforce cutoff rules.

### Booking availability rules

- Settings: working days/hours, holidays, blocked days, staff calendars, meeting length, minimum lead time, maximum lookahead, travel/setup buffers, booking cutoff, office capacity/rooms.
- Correct daylight-saving/timezone handling. Store UTC instants plus IANA timezone and original locale, compute slots on server.
- Make confirmations idempotent; protect against concurrent bookings with DB-enforced constraints/locks. Never rely on a frontend 'slot looks free' check.
- Track status: `PENDING` (if an external dependency requires), `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`; preserve audit history.
- Calendar sync failure must not silently double-book; show sync health to staff, retry and reconcile with the source of truth.

### Staff roles

- **Receptionist:** day/week agenda; view/create/reschedule/cancel bookings; client contact details; manage attendance.
- **Manager:** receptionist rights plus service types, team availability, offices/rooms, calendar connections, staff accounts, policy settings, dashboards and audit log.
- Secure sign-in, hashed passwords or staff SSO/passkeys, server-validated RBAC, session rotation, CSRF/XSS protections, request rate limits and least-privilege API authorization.

### Suggested NestJS modules

`AuthModule`, `UsersModule`, `RolesModule`, `ServicesModule`, `OfficesModule`, `StaffAvailabilityModule`, `BookingsModule`, `CalendarSyncModule`, `NotificationsModule`, `ContactModule`, `CmsContentModule`, `AuditModule`, `HealthModule`.

### Suggested DB entities

`users`, `roles`, `staff_profiles`, `offices`, `rooms`, `services`, `service_translations`, `staff_services`, `weekly_availability`, `availability_exceptions`, `bookings`, `booking_attendees`, `booking_events`, `calendar_connections`, `calendar_sync_jobs`, `notification_outbox`, `contact_inquiries`, `audit_logs`, `localized_pages`, `case_studies`.

## 8. Office location content and local discoverability

- One canonical Office record: official registered/display name, verified full bilingual address, city/region/country, phone, hours, IANA timezone, Google Place ID, latitude/longitude (validated), `getDirectionsUrl`, and office photo.
- Contact page: office name, full text address, tap-to-call, WhatsApp if approved, office working hours, map, directions button, on-site meeting CTA.
- Booking confirmation: include meeting address and a direct Google Maps directions link; send any access/parking information if provided.
- Keep address/phone/opening hours consistent in website footer, contact page, schema, email footer and Google Business Profile. Support future branches with an `offices` entity rather than hardcoding one.
- Do not expose employees' private location or tracking data.

## 9. Delivery phases and gates

### Phase 0 — Discovery and identity
- Confirm actual domain, agency offerings, brand guide, original vector logo, office address/location/hours, booking policy, staff calendar owner, consent/privacy requirements, target markets and competitors.
- Deliver information architecture, SEO keyword map, art direction, technical design decisions.

### Phase 1 — Foundation, localization and SEO
- Build Next.js + NestJS monorepo, shared types, PostgreSQL, Prisma, CI, deployment environments.
- Implement locale routes, RTL/LTR, metadata and page templates; localization dictionaries and editorial review workflow.
- Implement sitemap, robots, hreflang, canonicals, basic Organization/LocalBusiness data schemas and performance budget.
- Gate: Arabic/English pages server rendered, each locale independently crawlable and navigation tested.

### Phase 2 — Landing, content and 3D
- Build 12 homepage sections, 3D SVG/GLB hero, progressive GSAP animations, strong fallback, service/case study templates.
- Gate: accessible, responsive, motion-reduced, no severe WebGL or layout shift issues; content available without animations.

### Phase 3 — Booking and office location
- Build service/office/staff availability, conflict-safe booking API, bilingual booking wizard, transactional mail, .ics, cancellation/reschedule.
- Add verified Google Map and directions on contact page and confirmations.
- Gate: concurrent booking tests, email retry tests, bilingual mobile E2E bookings.

### Phase 4 — Staff dashboard and calendar automation
- Implement receptionist/manager RBAC, appointment calendar, exception management, audit trail, optional Google Calendar/Meet and Slack.
- Gate: authorization, calendar failure/retry, data integrity, recovery tests pass.

### Phase 5 — Google connection and launch
- Verify live domain and Google Business Profile, submit sitemap to Search Console, set up GA4 consent-aware events, validate structured data, deploy and monitor.
- Gate: core production flows healthy, no critical security findings, validated canonical/hreflang/sitemap, restore/rollback tested.

### Phase 6 — Post-launch growth
- Publish original Arabic/English service content and verified case studies, monitor search queries/CTR/conversion, tune content and performance based on measured results.

## 10. Quality targets and definition of done

- 100% of public pages localized in Arabic/English; no broken mixed-direction layouts; accessible language switch.
- Lighthouse CI budgets for desktop/mobile, no oversized 3D landing bundle, no site-critical navigation requiring WebGL.
- CWV field targets at p75: LCP <=2.5 s, INP <=200 ms, CLS <=0.1; real-user data may not exist at first launch.
- WAI-ARIA/keyboard/screen-reader checks and WCAG 2.2 AA-oriented reviews (human testing required).
- 0 overlapping confirmed bookings by DB constraint, even under concurrent requests; booking outbox retries are idempotent.
- Staff access restricted by server authorization; private routes noindex and authenticated; sensitive data scrubbed from logs.
- Search Console verified, two locale sitemaps/alternates validated, pages indexed as Google processes them (indexing cannot be promised).
- Resend domain verified and messages test-delivered; delivery, bounce and complaint telemetry operational.
- Backups, secrets management, monitoring, alerting, rate limiting, audit logging and rollback documentation complete.

## 11. Folder layout (illustrative)

```text
almorad-amc/
  apps/
    web/
      src/app/
        [locale]/
          page.tsx
          about/page.tsx
          services/page.tsx
          services/[slug]/page.tsx
          work/page.tsx
          work/[slug]/page.tsx
          contact/page.tsx
          book/page.tsx
        staff/
        sitemap.ts
        robots.ts
      src/components/{layout,ui,landing,three,booking,office}/
      src/i18n/
      src/lib/{seo,api,analytics}/
      messages/{ar,en}.json
    api/
      src/modules/{auth,users,roles,services,offices,availability,bookings,calendar,notifications,contact,audit,health}/
      prisma/
  packages/
    ui/
    contracts/
    config/
  infra/{docker,nginx,monitoring}/
  docs/{architecture,seo,booking,runbooks}/
```

## 12. Pre-build information needed

- Approved Arabic/English brand/company name and official service offerings.
- Company vector logo, fonts/colors and portfolio material rights.
- Production domain and access to DNS (for Search Console, Maps, Resend verification).
- **Real office address, Google Maps Place link, contact number and office hours** — do not invent them.
- Whether meetings may be online, in person, or both; length/buffers; staff schedules; whether assigned staff is selectable.
- Which Google account/Workspace calendars are authorized, and approval for any future Google connections.

## References verified 5 November 2026
- https://github.com/vercel/next.js/releases (Next.js v16.4.5 stable)
- https://www.npmjs.com/package/@nestjs/common?activeTab=versions (NestJS v12.3.2 latest)
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- https://developers.google.com/maps/documentation/embed/embedding-map
- https://developers.google.com/search/docs/appearance/structured-data/local-business
- https://developers.google.com/workspace/calendar/api/guides/create-events


---

# 13. Approved Architecture Enhancements — Booking, Operations & Automation

**Added:** 5 November 2026  
**Status:** Proposed additions to the original plan. These requirements are part of the target scope; implementation and external account connections have not yet been performed.

This section formalizes the five approved improvements: a simpler booking model, a booking-change ticket workflow, Slack as a notification layer, a complete meeting lifecycle, and management analytics.

## 13.1 Simplified booking responsibilities

The first release must use a deliberately simple responsibility model. Do not implement automatic staff assignment, complex resource allocation, or multi-calendar routing unless the business confirms that it is required.

### Roles and capabilities

| Capability | Receptionist | CEO / Manager |
|---|---:|---:|
| View appointments | Yes | All appointments |
| Create an appointment manually | Yes | Yes |
| Edit appointment details | Yes | Yes |
| Reschedule an appointment | Yes | Yes |
| Cancel an appointment | Yes | Yes |
| View client contact details | Yes, operational need | Yes |
| Review booking-change requests | Yes | Yes |
| View appointment history and audit trail | Operational history | Full history |
| View management analytics | No, unless separately granted | Yes |
| Manage staff accounts and system settings | No | Yes |

All permissions must be enforced by NestJS authorization guards/policies at the API layer. Hiding dashboard controls is not authorization.

### Booking creation and notification flow

1. A client submits the public booking form, or a receptionist creates an appointment from the dashboard.
2. The API validates the service, meeting type, required client details, business hours and requested slot.
3. PostgreSQL performs the authoritative conflict check and booking write in a transaction.
4. The appointment is persisted with its lifecycle status and an audit event.
5. A notification job is written to the transactional outbox and queued.
6. The receptionist receives an immediate internal notification; the client receives a confirmation or clear pending response by email.
7. The CEO/Manager can see the appointment and its history in the management dashboard.

The database remains the source of truth. A slot shown as available by the browser is not reserved until the server successfully commits the booking.

## 13.2 Booking change request / ticket system

Introduce a first-class `BookingChangeRequest` workflow. A client request must not silently overwrite the existing confirmed appointment.

### Client journey

1. The client opens the secure booking-management link from the confirmation email.
2. The client selects **Request a new time** and proposes a preferred date/time, optionally adding a short reason.
3. The API validates the signed, expiring, scoped token and creates a change-request ticket.
4. The existing confirmed appointment remains unchanged while the request is pending.
5. The receptionist is notified in the dashboard and Slack.
6. The receptionist reviews availability and either:
   - accepts the proposed time;
   - proposes an alternative time; or
   - declines the request with a reason.
7. If the client must choose between alternatives, the request remains open until the client confirms one.
8. Once accepted, the API rechecks availability and updates the booking transactionally, records the previous and new values, and emits notifications.
9. The client receives the outcome by email. Slack receives an internal status update.

### Ticket states

- `OPEN`: newly submitted and awaiting staff review.
- `UNDER_REVIEW`: receptionist is reviewing the request.
- `ALTERNATIVE_PROPOSED`: staff proposed another slot; awaiting client response.
- `APPROVED`: requested time accepted and booking update committed.
- `DECLINED`: request declined with a recorded reason.
- `WITHDRAWN`: client withdrew the request.
- `EXPIRED`: response deadline passed without resolution, if an expiry policy is configured.

A request must retain its full history. Do not delete declined, withdrawn, or expired requests.

### Suggested `booking_change_requests` fields

- `id`, `booking_id`, `requested_by` (`CLIENT` or `STAFF`), `status`
- `requested_start_at`, `requested_end_at`, `requested_timezone`
- `proposed_start_at`, `proposed_end_at`, `proposed_timezone`
- `reason`, `staff_response`, `responded_by`
- `created_at`, `updated_at`, `resolved_at`, optional `expires_at`
- token reference or secure token hash where a client action token is required

Store token hashes, not raw management tokens. Keep token scope narrow, expiry enforced, and rotate/revoke tokens after use as appropriate.

### Concurrency and audit requirements

- Recheck availability inside the same database transaction that commits an accepted change.
- Prevent two bookings from claiming overlapping slots using a PostgreSQL exclusion constraint or an equivalent robust locking strategy.
- Use idempotency keys for client submissions and staff actions where retries could duplicate operations.
- Record every transition in `booking_events` and `audit_logs`, including actor, timestamp, old values, new values and reason where applicable.
- A rejected or failed change request must never accidentally cancel or modify the original booking.

## 13.3 Slack integration — notification and team communication layer

Slack is an internal communication surface, not a booking database and not the authority for appointment availability or status.

### Slack notification events

| Event | Slack message |
|---|---|
| New website booking | New appointment summary and dashboard link |
| Appointment confirmed | Confirmation summary |
| Appointment rescheduled | Previous and new time, actor and dashboard link |
| Appointment cancelled | Cancellation summary and reason where appropriate |
| New change request | Requested time, client reference and review link |
| Alternative time proposed | Internal update with ticket link |
| Online meeting scheduled | Google Meet link, only for authorized staff channels |
| Daily upcoming appointments | Scheduled summary for the configured business day |

Messages should include only the minimum client information needed for staff operations. Avoid posting full phone numbers, email addresses, private notes, management tokens, or sensitive client information in broad channels.

### Slack implementation requirements

- Use an approved Slack app/bot with least-privilege OAuth scopes and an explicitly selected workspace/channel.
- Store credentials securely; encrypt tokens at rest and never expose them to the browser.
- Send notifications through BullMQ workers and a transactional outbox so temporary Slack outages do not lose business events.
- Retry transient failures with bounded exponential backoff; record delivery attempts and final status.
- Avoid duplicate notifications through stable event IDs/idempotency.
- Provide a dashboard deep link in each actionable notification. The user must still authenticate and pass normal RBAC checks.
- Treat Slack delivery as best-effort communication. A failed Slack message must not roll back a valid booking.
- Optional Slack interactive buttons may deep-link to the dashboard initially. Do not allow Slack actions to bypass the application's authorization or booking transaction rules.

### Daily summary

A scheduled BullMQ job should post a daily upcoming-appointments summary at a business-configured local time and IANA timezone. Include the date, counts, meeting type and dashboard link. Do not hardcode the schedule or timezone.

## 13.4 Meeting lifecycle and meeting type

Separate the appointment's operational status from the meeting format.

### Appointment status

Use these canonical states:

- `PENDING`: awaiting any required manual confirmation or dependency.
- `CONFIRMED`: appointment is confirmed.
- `RESCHEDULE_REQUESTED`: a change request is open; the current confirmed time remains in effect.
- `RESCHEDULED`: a reschedule has been completed. Preserve the current appointment's new time and the prior time in event history.
- `CANCELLED`: appointment cancelled.
- `COMPLETED`: meeting took place.
- `NO_SHOW`: client did not attend.

Implementation note: `RESCHEDULED` is a useful event/outcome, but should not become a permanent state that obscures whether the appointment is currently confirmed. Prefer keeping the current operational status as `CONFIRMED` after the time change and recording `RESCHEDULED` as a `booking_event` type. If the product retains `RESCHEDULED` as a displayed status, define a deterministic transition back to `CONFIRMED` and ensure reports count it correctly.

### Meeting type

Use a separate field:

- `IN_PERSON`
- `ONLINE`

Do not infer meeting type from whether a Meet URL happens to exist.

### Lifecycle rules

- A confirmed appointment remains confirmed while a reschedule request is pending.
- A cancellation records actor, timestamp and reason.
- A completed or no-show appointment is not silently reopened; reopening requires an authorized action and audit event.
- Online meetings may have a `meeting_links` record containing provider, URL, provider event ID and lifecycle timestamps.
- Only share meeting links with the client and authorized staff. Never post a private meeting link to a public channel.
- Google Calendar/Meet integration failures must be visible to staff and retried/reconciled; they must not create duplicate bookings.

## 13.5 CEO / Manager dashboard analytics

Add a management analytics overview. Receptionist access to analytics should be separately permissioned; the default first-release role should focus on operational appointment handling.

### Required KPI cards

- Total appointments in the selected period.
- Today's appointments.
- Upcoming appointments.
- Open/pending booking-change requests.
- Cancelled appointments.
- Completed appointments.
- No-show appointments.
- Booking conversion rate, only when the system has a reliable denominator for booking starts or inquiries.

### Required breakdowns

- Appointments by service.
- Appointments by meeting type (online / in-person).
- Appointments by status.
- Appointments over time (daily/weekly/monthly).
- Cancellation and no-show rates.
- Change-request volume and resolution time.

### Analytics definitions

Document each metric in code and product documentation to avoid misleading numbers:

- **Total appointments:** count of appointments created in the selected period, with cancelled appointments included and separately categorized.
- **Today's meetings:** appointments whose current scheduled interval falls on the business-local current date and whose status is not cancelled.
- **Upcoming meetings:** confirmed appointments starting after the current instant and within the selected horizon.
- **Pending change requests:** tickets in `OPEN`, `UNDER_REVIEW`, or `ALTERNATIVE_PROPOSED`.
- **Completed meetings:** appointments marked `COMPLETED` in the selected period.
- **Booking conversion rate:** confirmed bookings divided by unique booking starts for the same period, only if `booking_started` and `booking_confirmed` events are tracked consistently and deduplicated. Otherwise omit this KPI until instrumentation is reliable.
- **Cancellation rate:** cancelled appointments divided by appointments created in the same cohort/period; document the chosen cohort method.
- **No-show rate:** no-show appointments divided by appointments expected to occur in the selected period, excluding cancellations.

### Dashboard filters and UX

- Date range: today, this week, this month, custom range.
- Service and meeting type filters.
- Clear business timezone in date labels.
- Empty states when no data exists; never display fabricated zero-like sample data as live results.
- Server-side aggregation and pagination for detailed lists; do not download all bookings into the browser to calculate KPIs.
- Apply the same role-based data access to analytics APIs as to the dashboard.
- Keep client personal data out of analytics events and third-party analytics payloads.

## 13.6 Database additions and refinements

Add these entities to the original suggested schema:

| Entity | Purpose |
|---|---|
| `booking_change_requests` | Client/staff rescheduling tickets |
| `booking_notifications` | Notification delivery history and status |
| `slack_connections` | Authorized workspace/channel configuration metadata |
| `slack_notification_logs` | Slack delivery attempts and outcomes |
| `meeting_links` | Online meeting provider, URL and provider event reference |

Retain and use the existing `booking_events`, `notification_outbox`, `calendar_connections`, `calendar_sync_jobs` and `audit_logs` entities. Avoid storing duplicate state that can be derived safely from these records.

Suggested additional enums:

- `BookingMeetingType`: `IN_PERSON`, `ONLINE`
- `BookingChangeRequestStatus`: `OPEN`, `UNDER_REVIEW`, `ALTERNATIVE_PROPOSED`, `APPROVED`, `DECLINED`, `WITHDRAWN`, `EXPIRED`
- `BookingChangeRequestedBy`: `CLIENT`, `STAFF`
- `NotificationChannel`: `EMAIL`, `SLACK`
- `NotificationStatus`: `QUEUED`, `PROCESSING`, `SENT`, `FAILED`

Use database migrations and indexes for booking start/end, status, service, change-request status, and notification processing. Add uniqueness constraints for provider event IDs and idempotency keys where applicable.

## 13.7 Updated NestJS modules

Keep the original modules and add/refine:

- `BookingChangeRequestsModule`: ticket creation, review, alternative proposal, approval, decline and withdrawal.
- `BookingEventsModule` or booking-domain event service: immutable lifecycle history.
- `SlackModule`: OAuth/configuration, message formatting and delivery adapter.
- `AnalyticsModule`: role-protected aggregate queries and metric definitions.
- `NotificationOutboxModule`: durable event-to-notification processing if not owned by the existing `NotificationsModule`.

Suggested module ownership:

- `BookingsModule` owns booking validation and transactional state changes.
- `BookingChangeRequestsModule` orchestrates ticket workflow but commits booking changes through the booking domain service.
- `NotificationsModule` owns templates and channel-independent notification intent.
- `SlackModule` and email provider adapter perform delivery only.
- `AnalyticsModule` reads operational data and does not mutate bookings.

## 13.8 Updated API surface

Illustrative REST endpoints; final naming and DTOs should be confirmed during implementation.

### Public booking

- `GET /public/services`
- `GET /public/availability?serviceId=...&date=...&meetingType=...`
- `POST /public/bookings`
- `GET /public/bookings/manage/:token`
- `POST /public/bookings/manage/:token/change-requests`
- `POST /public/bookings/manage/:token/cancel`

### Receptionist / Manager

- `GET /bookings`
- `POST /bookings`
- `GET /bookings/:id`
- `PATCH /bookings/:id`
- `POST /bookings/:id/confirm`
- `POST /bookings/:id/cancel`
- `POST /bookings/:id/complete`
- `POST /bookings/:id/no-show`
- `GET /booking-change-requests`
- `POST /booking-change-requests/:id/review`
- `POST /booking-change-requests/:id/propose-alternative`
- `POST /booking-change-requests/:id/approve`
- `POST /booking-change-requests/:id/decline`
- `GET /bookings/:id/events`

### Manager analytics

- `GET /analytics/overview?from=...&to=...`
- `GET /analytics/appointments-by-service?from=...&to=...`
- `GET /analytics/appointments-by-status?from=...&to=...`
- `GET /analytics/appointments-over-time?from=...&to=...`
- `GET /analytics/change-requests?from=...&to=...`

All endpoints require DTO validation, authentication where applicable, explicit authorization, rate limiting on public routes, and documented error responses. Public token endpoints must use opaque high-entropy tokens, store only hashes, enforce expiry and rate limits, and avoid leaking whether arbitrary booking IDs exist.

## 13.9 Updated dashboard navigation

### Receptionist

- Overview / Today's schedule
- Calendar
- Appointments
- Change requests
- Clients (only the minimum operational profile)
- Notifications

### CEO / Manager

- Executive overview / Analytics
- Calendar / All appointments
- Change requests
- Services
- Staff and permissions
- Availability and office settings
- Integrations (Slack, Google Calendar)
- Notification delivery health
- Audit log

Use a responsive calendar/list alternative on mobile. Make high-priority pending requests visible without requiring the receptionist to search for them.

## 13.10 Updated delivery phases and acceptance gates

| Phase | Scope | Acceptance gate |
|---|---|---|
| 0 — Discovery | Confirm business rules, services, hours, timezone, brand, domain and integration owners | Signed-off requirements; no invented company details |
| 1 — Foundation | Next.js, NestJS, PostgreSQL, Prisma, auth/RBAC, localization and SEO | Public pages crawlable in both locales; staff API authorization tested |
| 2 — Website | Landing, service pages, portfolio, contact, progressive 3D | Accessible, responsive, reduced-motion and fallback checks pass |
| 3 — Booking core | Public and receptionist booking, meeting type, availability, lifecycle, email | Concurrent booking tests pass; client and receptionist notifications delivered |
| 4 — Change requests | Secure client manage link, ticket workflow, alternatives, audit trail | Pending requests do not mutate confirmed booking; acceptance is transactional |
| 5 — Dashboard and Slack | CEO/receptionist dashboards, KPI aggregates, Slack events and daily summary | Role access, metric definitions, notification retries and duplicate prevention tested |
| 6 — Google integrations and launch | Optional Calendar/Meet, Search Console, GA4, Maps, production hardening | OAuth least privilege, sync recovery, privacy, backups and rollback tested |
| 7 — Growth | Content, reporting and optimization | Decisions based on real usage and search/conversion data |

## 13.11 Additional definition-of-done criteria

- Receptionists can create, edit, reschedule and cancel appointments.
- CEO/Manager can see all appointments, pending change requests and full appointment history.
- A client change request never silently changes the existing confirmed appointment.
- An accepted change is conflict-checked and committed atomically.
- Every lifecycle transition and ticket decision is auditable.
- Online and in-person meeting types are represented independently of booking status.
- Slack receives the specified internal events, with retries, delivery logs and duplicate protection.
- Slack failure never loses or rolls back a booking.
- Daily summaries use the configured business timezone and schedule.
- Manager analytics use documented definitions, authorized aggregate APIs and real persisted data.
- Conversion rate is hidden until reliable booking-start and confirmation instrumentation exists.
- Client personal data and private meeting links are not exposed in broad Slack channels or analytics.
- Receptionist and CEO/Manager permissions are tested at the API level, including negative authorization tests.

## 13.12 Decisions still requiring business confirmation

The architecture can be implemented with safe defaults, but these items must be confirmed by Almorad AMC:

- Which Slack workspace and channel(s) should receive notifications?
- Who owns the Google Workspace account and calendar authorization?
- What local time should the daily Slack summary be sent?
- Can clients request a new time only, or also cancel through the secure link?
- Should alternative times require client approval before the booking changes?
- What is the rescheduling/cancellation cutoff and ticket expiry policy?
- Should receptionists see all client contact details or only assigned/operational records?
- Which analytics date range and conversion definition matter to management?
- What are the verified business timezone, working hours, holidays and meeting durations?

Until confirmed, keep these configurable and do not hardcode assumed company policies.


## V4 Implementation Acceptance — Visual Identity

- Every brand color in `design.md` must match the user's eight exact HEX values; derived semantic support colors are clearly distinct from brand colors.
- Cairo is used throughout the Arabic experience, including SEO visible H1, booking and dashboard.
- IBM Plex Sans is the default English text/UI face; Redaction 100 is used selectively for legible display text only.
- Light and dark palettes are both complete, keyboard and WCAG 2.2 AA contrast tested.
- All four portfolio service pillars and eleven offerings remain unchanged.
- SEO-first bilingual SSR, Google Search Console preparation, booking-change tickets, receptionist/CEO dashboard, Slack notifications, office directions, and Google Calendar/Meet options remain in scope.
- No production launch before the true office contact/address, official logo/vector, domain, company policies and calendar/integration ownership have been verified.

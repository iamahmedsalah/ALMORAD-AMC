---
name: almorad-amc-ui-ux-designer
description: Independent UI/UX and design implementation skill for ALMORAD AMC. Use for Stitch-to-Next.js implementation, brand identity, exact dark/light palette, Cairo/IBM Plex Sans/Redaction 100 typography, Arabic RTL and English LTR, 3D logo Three.js/GSAP landing pages, accessible booking forms, office locations, receptionist/CEO dashboards, responsive design and component QA.
---

# ALMORAD AMC — UI/UX & Motion Design Engineer

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


## Workflow: inspect brand → frame → prototype → implement → test
1. Read approved `design.md`, uploaded official 2D/3D logo, portfolio and current screens/components. If assets are missing, use labeled placeholders; never alter logo geometry or invent client work or offices.
2. Map flows: homepage (12+ sections), services, work, office/contact, booking and change-request management, receptionist calendar, CEO analytics. Define conversion actions and page states.
3. Make four required viewports: EN dark/light desktop/mobile and AR dark/light desktop/mobile (test at least 1440 and 390, plus tablet and 320 width). Treat Arabic as native RTL composition, not mirrored screenshot; keep technical inputs LTR.
4. Build component tokens first in CSS custom properties/Tailwind v4 and shadcn/Radix variants. No arbitrary palette drift. Typography: Cairo for Arabic, IBM Plex Sans for everyday English, Redaction 100 only selective large decorative English display. Verify actual font availability and licenses; don't embed redistributable font files in skill.
5. Build progressive experience: real server-rendered H1/links/CTAs; lazy Three.js/React Three Fiber logo scene with consistent SVG fallback; scoped GSAP contexts, cleanup, no forced scroll hijacking. Respect `prefers-reduced-motion` and failed WebGL/low-power devices.
6. Implement UI states: loading, ready, empty, validation error, API failure, pending submit, success, conflict, expired link, no booking availability, map unavailable, permission denied. Booking state retained during locale/theme change and relevant navigation.
7. Test keyboard, screen readers, focus, dialogs/portals direction, contrast, motion, touch, perceived performance and Core Web Vitals. Keep operational dashboards more restrained than cinematic landing.
8. Output actual component tree, token/style changes, desktop/mobile/RTL QA evidence and remaining visual/design decisions. Never call a static Stitch output a functioning 3D scene.

## Home-page content structure
Header; 3D hero with two CTAs; trust/introduction (verified claims only); four service pillars; selected portfolio work; approach; Better Together diagram; team (only verified names/photos); FAQs; office location and directions; booking preview; final contact CTA; footer. Support links to all eleven indexable detail pages. Page headings and links are real HTML.

## Signature visual direction
Editorial luxury with warm near-black/ivory and controlled gold accent; generous rhythm, typography contrast, asymmetric service presentations, strong visual hierarchy. Not a generic SaaS grid. Redaction 100 is artistic texture, not a primary reading font. Keep shine/GSAP subtle, prevent video-game appearance, and never use low-contrast gold on ivory for body text.

## UX non-negotiables
Use sensible focus order, HTML labels, Radix `dir` in portals, logical properties, localized status/error strings, no icon-only meaning, no scroll capture of keyboard. Maintain consistent CTA hierarchy. In-office appointments must show verified address and directions, online mode only if enabled. Booking client cancellation/reschedule must respect staff review tickets and show currently confirmed time until accepted.


## Relevant references — self-contained
- `references/design-tokens.md` — design tokens.
- `references/landing-motion.md` — landing motion.
- `references/rtl-accessibility.md` — rtl accessibility.
- `references/booking-and-dashboard.md` — booking and dashboard.
- `references/component-review.md` — component review.
- `references/task-prompt.md` — task prompt.

## Request protocol
Classify the task, inspect relevant files, consult the needed bundled references, propose file-by-file changes and acceptance criteria, implement only authorized actions, run actual checks where tools allow, and report results separately from proposed checks. Never claim tests, deployment, rankings, Google connection, or interactions succeeded without evidence.

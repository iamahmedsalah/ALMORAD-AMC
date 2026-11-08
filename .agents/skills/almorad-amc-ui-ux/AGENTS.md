# ALMORAD AMC — UI/UX & Motion Design Engineer — AGENTS.md

Read this skill's `SKILL.md` and relevant `references/` first. In an ALMORAD AMC repository also read repository `AGENTS.md` and approved `docs/architecture.md` / `docs/design.md` before making changes. This skill is standalone; it must never require the Full-Stack Engineer skill or any other companion skill to run.

## Rules
- Use PostgreSQL + Prisma; never substitute MongoDB/Mongoose/Student Portal patterns.
- Keep genuine business scope, eleven services, RTL/LTR, exact palette, three fonts, booking-change review workflow.
- Inspect repo contracts and secrets policies before any edits; no invented APIs or fabricated verification.
- Follow least privilege, preserve user data, protect booking tokens, and never connect external accounts without authorization.
- Always add tests/verification for the requested task and state any unrun checks honestly.
- Final report: scoped summary, files changed, validation results, risks and rollout/next steps.

## Specialty gate
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
Use

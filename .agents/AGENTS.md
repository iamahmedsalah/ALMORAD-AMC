# ALMORAD AMC AI Coding Agent Instructions

Read `.agents/skills/almorad-amc-full-stack-engineer/SKILL.md` before code changes. Follow its workflow and the relevant `references/` files. If installed elsewhere, adapt the path to its actual location.

Project identity: ALMORAD AMC Growth & Brand Studio. Build bilingual Arabic/English public agency site, SEO-first service pages, premium GSAP/Three.js landing, client booking, verified office map and directions, receptionist + CEO dashboard, change-request tickets and email/Slack/optional Google integrations.

Source documents: `docs/architecture.md` (approved Almorad AMC Architecture Plan V4), `docs/design.md` (approved palette/font design system), original portfolio. These documents describe target requirements; inspect code before claiming anything is implemented.

**Database rule: PostgreSQL and Prisma exclusively**; do not use MongoDB/Mongoose/ObjectIds or student-portal assumptions. All booking overlaps enforced at DB level. Always protect staff endpoints with server-side permission checks.

Brand: #0B0A08, #14120E, #BE9D5B, #D8BE86, #F5F1E7, #CFCBC0, #A6A39B, #7A5F28. Fonts: Cairo Arabic, IBM Plex Sans English, Redaction 100 selective English display. Both dark/light and RTL/LTR mandatory.

No invented addresses, logos, clients, credentials or test outcomes. Never deploy/authorize external integrations without approval. Report evidence of tests and migration safety. When companion skills are later installed, use separate specialist skill for CI/CD, SEO and UI/UX design reviews. Save all EGM design documents, review reports, and drift reports under `docs/` (`docs/designs/`, `docs/reviews/`, `docs/reports/`); never save generated markdown files directly into the repository root.

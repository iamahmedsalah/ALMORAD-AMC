# Codex / AI engineer prompt template

Use this when user requests a prompt rather than direct code modification:

```text
Act as an ALMORAD AMC senior full-stack engineer working under .agents/skills/almorad-amc-full-stack-engineer/SKILL.md and AGENTS.md.

Objective: [exact task]

Project facts:
- Next.js 16 App Router + React 19 + strict TS + next-intl + Tailwind 4 + shadcn/Radix
- NestJS 12 API + PostgreSQL + Prisma (never Mongo/Mongoose)
- Redis/BullMQ + Resend; authorized Slack/Google integrations
- Exact AMC palette: #0B0A08 #14120E #BE9D5B #D8BE86 #F5F1E7 #CFCBC0 #A6A39B #7A5F28
- Fonts: Arabic Cairo, English IBM Plex Sans, English display Redaction 100
- Arabic and English public routes, SEO-first, accessible reduced-motion Three.js/GSAP hero
- Booking tickets, receptionist + manager workflow, verified office map and directions

Before coding inspect: AGENTS.md, current docs/architecture.md, docs/design.md, package manifests, relevant Next/Nest files, Prisma schema/migrations and tests. Identify repo facts vs proposed files.

Deliver:
1. Current-state findings and constraints
2. File-by-file implementation plan including Prisma migrations/rollback
3. Implement smallest safe incremental change
4. Validate authorization, booking invariants, RTL, accessibility, SEO and theme behavior
5. Run actual lint/typecheck/test/build and DB integration checks; report exact results
6. Summarize changed files, risks, remaining work

Never invent office address, testimonials, APIs or successful test results. Do not deploy or connect third parties without approval.
```

---
name: almorad-amc-ui-ux-designer
description: Implement and review ALMORAD AMC bilingual Next.js interfaces, phone and tablet layouts, accessible Solar icon controls, shared motion tokens, official artwork, booking and role-scoped staff agendas. Use for responsive defects, UI state, interaction motion, dashboard and conversion-flow improvements.
---

# ALMORAD AMC — UI/UX and Motion

Build readable, fast interfaces for business owners using phones first. Keep marketing expressive and operational screens calm. This skill is standalone; consult other actual project skills when needed, without assuming tools or integrations exist.

## Sources and brand

1. Inspect current code, package manifests, tests, assets and deployed contracts for implemented behavior.
2. Read `.agents/AGENTS.md`, `docs/implementation-status.md`, approved `docs/architecture.md` and `docs/design.md` for scope. Documentation alone does not prove functionality.
3. Use relevant bundled references as implementation guidance. Save designs, audits and evidence under `docs/designs/`, `docs/reviews/`, `docs/reports/`.
4. Preserve original 2D/3D artwork, verified copy and current approved semantic tokens. Historical specification swatches are `#0B0A08`, `#14120E`, `#BE9D5B`, `#D8BE86`, `#F5F1E7`, `#CFCBC0`, `#A6A39B`, `#7A5F28`. The inspected website currently uses a navy/orange semantic system. Report this discrepancy; never recolor the live site incidentally while fixing layout or motion.
5. Cairo for Arabic; IBM Plex Sans for functional English; Redaction 100 only for selective artistic English display. Never invent offices, hours, phone numbers, staff, customer results, credentials or integration status.

## Workflow

- Inspect the reported viewport and actual component/CSS cascade before adding overrides. Check DOM children against grid tracks; remove obsolete columns rather than shrinking text to fit.
- Map the task's loading/ready/empty/error/pending/success/permission states and critical actions. Write a short file map and acceptance criteria under `docs/designs/` for cross-cutting work.
- Implement shared primitives before repeating local styles. Keep pages thin and component APIs typed. Use existing React state/reducers for small interactions; no new state library solely for a toggle or form.
- Verify affected flows in EN/AR, both themes, phone/tablet/desktop, keyboard and reduced motion. Visually inspect saved screenshots. Report actual commands and limitations, never fabricated performance or accessibility scores.

## Layout and text

- Use mobile-first intrinsic grids: `minmax(0,1fr)`, `min-width:0`, flexible text and fixed icon tracks. Navigation labels and FAQ questions get the remaining width; no word-by-word columns or unexplained truncation.
- Keep labels for navigation destinations, unfamiliar service categories, statuses and critical actions. Use concise readable text with meaningful icons. Do not replace all words with pictograms.
- Mirror directional arrows and drawer entry in RTL; never mirror logos, close/search/phone icons. Isolate email, phone, URLs and IDs with `dir="ltr"`/`bdi`. Let Arabic wrap naturally; avoid tracking that damages shaping.
- Typography and spacing may use `clamp()`. Body reading measure should normally be 45–75 characters, without forcing that width onto compact controls. Inputs stay readable at mobile zoom; never disable user zoom.
- Phone: safe-area padding, `100dvh`, no horizontal document overflow or hover-only controls. Tablet: explicit two-column composition where useful; verify portrait and landscape. Desktop: retain the same reading order and touch-safe fallback.
- Agenda: group actual loaded records by local business date, sort by appointment time, show time/client/service/status and clear pending requests. Do not present paginated results as complete availability. Retain semantic tables where comparison benefits; allow contained, named keyboard-scroll regions rather than shrinking every cell.
- Never let sticky controls cover form fields, content, keyboard focus or safe areas.

## Icon system and control spec

Use the existing Solar linear SVG set with `currentColor`, consistent 1.5 stroke design and 16/20/24/32 sizes. Do not install Lucide/Phosphor alongside it or use icon fonts/PNG controls. Original brand logos are artwork, not UI icons.

- Universally understood small actions (close, refresh, previous/next, phone/email/location links) may be icon-only. Every such control needs an action name (`aria-label` or hidden text), hover tooltip (`title` for simple controls), visible focus, and at least 44×44px target. Critical CTAs keep text plus icon. Give standalone icon links accessible names and tooltips too.
- Use `rounded-squircle` (`@supports (corner-shape: squircle)`) on buttons, cards, and icon controls, with compact inner padding (`44×44px` for icon-only buttons with `18px` icons so they fit cleanly without excessive margin).
- Decorative SVGs are `aria-hidden` and nonfocusable. Default/hover/focus/tap/disabled states must work in both themes. Gate hover effects with `(hover:hover) and (pointer:fine)`; tap scales the icon to .94. Disabled controls cannot submit again.
- `AnimatedIcon({name, alternate?, active?, size?:16|20|24|32, className?})`: decorative stable layers; crossfade/rotate within a fixed box. Parent supplies the accessible name. Use for password/search/modal state swaps. Password closed-eye means hidden, open-eye means visible; button label describes the next action, Show/Hide password, and `aria-pressed` reflects visibility. Do not rotate directional icons and state layers on the same element.
- `IconButton({label, name, alternate?, active?, size?, ...buttonProps})`: actual button with accessible action name, tooltip and target; pending requests also set `disabled` and `aria-busy`.
- `MenuToggle({open, label, controls, onClick, buttonRef?, className?})`: stable three-line SVG; top/bottom translate and rotate into X, middle fades. Update Open/Close menu name, tooltip, `aria-expanded`, `aria-controls`. Drawer uses the same duration/easing; trap focus, lock background scrolling, make background content inert, support Escape, restore focus and close after navigation.
- Accordion uses native details/summary or a proper button/region contract. Rotate chevron 180° or plus 45°. Keep `aria-expanded` consistent during rapid toggles, close and reduced-motion changes. Animate content opacity/transform, never per-frame height measurement.
- Optional service icon reveal is once on intersection; never loop decorative icons. Progress spinners may loop only while a request is pending; provide text/status and a static reduced-motion equivalent.

## Motion system

CSS/WAAPI are the default for these small state changes. This repo already has scoped GSAP/ScrollTrigger for complex storytelling and Three.js for isolated scenes; reuse them there. Motion/Framer Motion is not installed: add it only if a concrete feature warrants the dependency, not as part of this skill rewrite.

Source tokens: `apps/web/src/lib/motion.ts` and `styles/responsive-interactions.css`:

| Token | Value |
|---|---|
| micro | 160ms |
| disclosure | 260ms (panel and icon together) |
| entrance | 560ms; decorative maximum 800ms |
| stagger | 50ms, at most 6–8 siblings |
| distance | 12px, normally 8–24px |
| enter | cubic-bezier(.22,1,.36,1) |
| exit | cubic-bezier(.4,0,1,1) |
| move | cubic-bezier(.4,0,.2,1) |

- Animate transform/opacity only for shared interactions. Do not animate width/height/top/left/margin or use `transition:all`. Use an instant layout change with a fade, or FLIP when reordering warrants it. Optional physics spring for a future installed Motion feature: stiffness 280, damping 30, mass .8; do not import a library solely to use it.
- No blank-until-JS hero copy, LCP-blocking entrance, animation-induced CLS, forced scroll capture or stagger across long reading text. Keep meaningful content server rendered.
- Reveal once with IntersectionObserver; no unbounded scroll handlers. Scope GSAP cleanup and cancel WAAPI/timers/observers on unmount. Rapid toggles must settle to the latest state.
- Honor reduced motion dynamically: instant icon swaps, no animated rotation/travel/parallax/autoplay; static progress text. No fake completion delays.
- Pause ambient loops offscreen and when the tab is hidden. Reserve media space; responsive optimized images, below-fold lazy loading, video poster and pause controls. Keep WebGL decorative with original SVG/image fallback, lazy code and capped rendering work.
- Target 60fps and no animation-attributable main-thread tasks over 50ms; measure representative devices before claiming these budgets passed. Use `will-change` only while needed, then remove it. Protect LCP, CLS and INP; never infer field Web Vitals from local screenshots.

## State and operational truth

Show explicit idle/loading/success/error states. Use spinners/skeletons, `aria-busy`, useful status/error copy, duplicate-submit protection and retry without losing the last successful data. A refresh keeps existing records visible; stale responses cannot replace newer queries. Focus detail panels after selection and restore focus on close where possible.

HubSpot status reflects the returned job state: queued, processing, synced, failed, skipped, unconfigured or unavailable. Pair status with a related Solar icon and text; never show a success check merely because a refresh was clicked. Refresh checks state; it is not a retry/sync command. CRM and email delivery are independent. Do not invent HubSpot branding/artwork or connections.

Staff roles are ADMIN, MANAGER and RECEPTIONIST. Admin has all meeting CRUD, assignment, staff/settings and analytics; Manager reads/creates/edits assigned meetings; Receptionist handles shared agenda, inquiries and staff-reviewed changes without admin deletion/settings. Enforce ownership/permissions in API; UI visibility is supplementary. Retain the audit-preserving deletion policy and never invent legacy assignees.

Appointment confirmation links directly to Your appointment. Email/phone recovery sends a private link only to stored email, uses generic responses and rate limits. Do not expose details by identifier alone. Client reschedules/cancellations stay staff reviewed; existing appointment stays confirmed until approval. Receipt intent is not proof of inbox delivery. A contact acknowledgement does not quote the visitor message. Use the approved shared office address and original email logo in footers; do not invent a map pin.

## Pre-ship checklist

- [ ] EN/AR × light/dark: 320/360/390/430 phones, 768/834/1024 tablets plus landscape, and 1280/1440 desktop. No clipped words, overlaps or document overflow; verify long labels and 200% zoom.
- [ ] Keyboard/focus: menu trap/Escape/restore, FAQ Enter/Space, accessible control names/tooltips, 44px targets, AA contrast and actual axe checks. Portals receive correct direction.
- [ ] Normal and reduced motion: latest toggle wins, no height/width animations, matching panel/icon timing, no loops after pending work ends or tab hides.
- [ ] Slow/delayed/failed network: retained data, spinner/skeleton, errors/retry, no duplicate request, no false synced/delivered state; empty results, assigned-manager and receptionist states.
- [ ] Build, TypeScript, lint and affected browser regressions actually pass. Review screenshot evidence on phone, tablet and desktop. Measure Lighthouse/trace/Web Vitals when performance is changed; mark unmeasured budgets clearly.
- [ ] No new schema, credentials, deployments or external messages for a frontend task unless separately required and authorized.

## Reference routing

Read `references/rtl-accessibility.md` for RTL/focus; `references/booking-and-dashboard.md` for operational flows; `references/landing-motion.md` for the existing hero; `references/design-tokens.md` and `references/component-review.md` for historic brand/review context. This current contract supersedes conflicting older icon/motion/role passages, while approved current code still governs implementation facts.

## Example requests

- “Use almorad-amc-ui-ux-designer to refine the hero at 390/834/1440 in EN/AR and both themes. Preserve official artwork and visible server-rendered copy; measure animation cost and provide reduced-motion fallback.”
- “Use almorad-amc-ui-ux-designer for the services grid: readable titles, Solar category icons with labels, once-only reveals, phone/tablet composition and keyboard checks. Keep all 11 services linked.”
- “Use almorad-amc-ui-ux-designer for the contact form: clear labels, accessible validation and pending/success/error states, no message echoed in the acknowledgement, no real send during mocked browser QA.”

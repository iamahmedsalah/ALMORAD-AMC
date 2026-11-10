# Almorad AMC — Design System V3 (User-Supplied Palette and Fonts)

**Status: USER-SUPPLIED PALETTE AND TYPOGRAPHY — implemented in the specification; production QA still required.**  
**Sources:** user-supplied eight-color palette image (5 November 2026), font links, `Almorad AMC portfolio .pdf`, and original `design(1).md`.  
**Visual direction:** near-black / champagne gold / warm-ivory from portfolio; dark cinematic layout + light editorial layout. All other original layout, responsive, bilingual, booking, dashboard, and motion specifications remain in force.

## Exact brand palette — supplied by user

These **eight swatches are authoritative**; use the values below exactly. Additional semantic support colors (for errors, information, focus and disabled states) are implementation choices, **not extra brand colors**.

| Swatch | Exact HEX | Primary role |
|---|---|---|
| Black | `#0B0A08` | Dark canvas, light-theme high-contrast text and buttons |
| Charcoal | `#14120E` | Dark surface / cards |
| Gold | `#BE9D5B` | Signature gold, accents, 3D highlights |
| Soft gold | `#D8BE86` | Dark-theme emphasis and CTA |
| Ivory | `#F5F1E7` | Light canvas / dark-theme heading text |
| Warm grey | `#CFCBC0` | Secondary light surfaces and dark muted text |
| Muted grey | `#A6A39B` | Secondary details and text where contrast permits |
| Deep gold | `#7A5F28` | Light-theme decorative accent, borders and large text after contrast testing |

**Theme defaults:** Dark = black canvas, charcoal cards, ivory text, soft-gold CTA; light = ivory canvas, black text/CTA, warm-grey cards, deep-gold accents. Never use low-contrast gold on ivory for regular-size text. Preserve original logo artwork rather than recoloring it automatically.

## Executable Tailwind v4-compatible theme tokens (brand colors exact; support colors derived)

```css
:root {
  color-scheme: light;
  --brand-primary: #BE9D5B;
  --brand-secondary: #7A5F28;
  --brand-accent: #7A5F28;
  --background: #F5F1E7;
  --foreground: #0B0A08;
  --card: #F5F1E7;
  --card-foreground: #0B0A08;
  --surface-raised: #FFFFFF;
  --muted: #CFCBC0;
  --muted-foreground: #625D52;
  --border: #CFCBC0;
  --input: #A6A39B;
  --ring: #7A5F28;
  --primary: #0B0A08;
  --primary-foreground: #F5F1E7;
  --secondary: #CFCBC0;
  --secondary-foreground: #0B0A08;
  --destructive: #A33132;
  --success: #276744;
  --warning: #815100;
  --info: #245C85;
  --overlay: rgb(16 15 12 / 65%);
  --scene-ambient: #CFCBC0;
  --scene-key: #BE9D5B;
}
.dark {
  color-scheme: dark;
  --brand-primary: #BE9D5B;
  --brand-secondary: #7A5F28;
  --brand-accent: #D8BE86;
  --background: #0B0A08;
  --foreground: #F5F1E7;
  --card: #14120E;
  --card-foreground: #F5F1E7;
  --surface-raised: #201D17;
  --muted: #242119;
  --muted-foreground: #CFCBC0;
  --border: #675A40;
  --input: #A6A39B;
  --ring: #D8BE86;
  --primary: #D8BE86;
  --primary-foreground: #0B0A08;
  --secondary: #242119;
  --secondary-foreground: #F5F1E7;
  --destructive: #FA8582;
  --success: #7DD3A1;
  --warning: #F3C777;
  --info: #8AC7FA;
  --overlay: rgb(0 0 0 / 70%);
  --scene-ambient: #201D17;
  --scene-key: #BE9D5B;
}
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-ring: var(--ring);
}
```

## Theme and component application

- **Light:** warm-ivory body, soft-white cards, black headings, bronze accessible accents, black primary CTA with ivory label.
- **Dark:** near-black body, charcoal surfaces, ivory headings, bright-gold primary CTA with near-black label, champagne ornamental strokes.
- 3D logo lighting should use gold key light and theme-adjusted ambient light. Actual brand logo shape and colors must not change without approval.
- Booking wizard: contrast-first actionable slots, clear focus ring, selected-state icon/text as well as color, large touch targets. Calendar and validation strings localized.
- Service cards: 4 pillars / 11 offerings, readable descriptions and purposeful links; gold as signposting rather than paragraphs of gold text.
- Accessibility: test text contrast 4.5:1 regular / 3:1 large; focus boundaries and UI boundaries as applicable. Test every hover/focus/disabled state.
- **Implementation gate:** The palette and fonts come directly from the user; validate responsive UI contrast, actual logo assets, font loading, and screenshots before production release.

## Typography — user-selected font system

| Language / role | Font | Where used |
|---|---|---|
| Arabic all UI and editorial content | **Cairo** | Arabic headings, body, cards, booking, navigation, forms, dashboard |
| English primary | **IBM Plex Sans** | Body, navigation, buttons, booking, service descriptions, dashboards, accessibility-critical text |
| English creative display | **Redaction 100** | Select oversized hero words, campaign title accents, portfolio dividers, visually expressive English phrases |

- Source references: [Cairo](https://fonts.google.com/specimen/Cairo), [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans), [Redaction 100](https://fonts.google.com/specimen/Redaction+100).
- **Do not apply Redaction 100 to Arabic text.** Its glyph coverage is Latin-oriented. Arabic hero headings use Cairo, not unsupported fallback glyphs.
- Use Redaction 100 **sparingly** and ideally at >= 40px for display; never for labels, descriptions, accessibility text, booking slots, long paragraphs, or SEO snippets. Its intentionally degraded texture can reduce legibility.
- Prefer `next/font/google` for Cairo and IBM Plex Sans; use `next/font/google` for Redaction 100 only if supported by the installed Next release, otherwise self-host licensed Redaction 100 via `next/font/local`. Maintain OFL attribution in project notices. Never share font binaries as deliverables.
- Apply `font-display: swap` or an appropriate metric-matched fallback and preload only essential families; constrain Redaction weights to those actually used.
- Provide typography variables `--font-arabic`, `--font-english`, `--font-display-en`; apply based on `[lang=ar]`/`[lang=en]`, not by global fallback that forces English display typography onto Arabic.
- Cairo requires generous Arabic line-height, no forced letter-spacing, RTL shaping tests. English Redaction display does not replace semantic HTML headlines (the H1 remains server-rendered text).

Suggested CSS:

```css
:root { --font-arabic: "Cairo", sans-serif; --font-english: "IBM Plex Sans", sans-serif; --font-display-en: "Redaction 100", Georgia, serif; }
html[lang="ar"] { font-family: var(--font-arabic); }
html[lang="en"] { font-family: var(--font-english); }
html[lang="en"] .display-editorial { font-family: var(--font-display-en); }
```

## Service taxonomy component data

The services UI must include the four portfolio pillars, each with its actual offerings:

- **Marketing**: Social Media Management, Personal Branding, Market Research & Analysis, Branding
- **Advertising**: Media Buying, Billboards & Outdoor, Corporate Events
- **Consulting**: E-commerce Consulting, Management Consulting
- **Web Development**: E-commerce Websites, Company Websites & Landing Pages

## Original design spec (updated from TBD-only approach)

The reference specification below remains the functional source for spacing, component patterns, localization, booking UI, office, animation and dashboard requirements. Its former **TBD-only color-freeze instructions are superseded by the exact user-supplied swatches and completed semantic mappings above**. Do not copy its old `TBD` CSS scaffold into production.

---

# Almorad-AMC — UI Design System

**Version:** 0.3 — user-supplied palette and user-selected typography  
**Date:** 5 November 2026  
**Project:** Premium bilingual Arabic/English creative agency website, booking experience, office location and staff dashboard  
**Architecture reference:** `Almorad-AMC_Enhanced_Website_Architecture_Plan.md`  
**Design status:** Proposed portfolio-derived values are populated above for review; brand approval and official logo assets remain pending.

> **PALETTE STATUS:** Portfolio-derived proposed HEX values appear above. Do not treat them as final approved identity until sign-off.

## 1. North star and design principles

Create a premium, modern, conversion-oriented marketing agency website with a signature 3D hero and controlled GSAP storytelling. It must feel excellent in both dark and light mode and work equally well in Arabic RTL and English LTR. Clients should find services, evidence of work, the office, and booking within minimal interactions. Search engines and assistive technologies must read real HTML content independently of 3D.

1. **Identity first:** respect the authentic logo and user-supplied palette; no speculative rebranding.
2. **Editorial clarity:** strong hierarchy, spacious layouts, purposeful visual emphasis.
3. **Motion with restraint:** GSAP and Three.js add depth without obstructing reading or interaction.
4. **Bilingual by design:** independent Arabic/English content, RTL/LTR, locale-aware URLs and layouts.
5. **Accessible by default:** target WCAG 2.2 AA, keyboard/screen-reader support, visible focus, reduced motion.
6. **Performance-aware:** server-render SEO content, lazy-load 3D and maps, avoid layout shift.
7. **Conversion-oriented:** clear actions to view work, contact the agency, get directions and book a meeting.

## 2. Theme architecture

### Modes

- **Light:** clear, polished, editorial background and readable foreground colors (use the proposed table above).
- **Dark:** cinematic but legible high-contrast surfaces, suitable for hero 3D work (use the proposed table above).
- **System:** respect `prefers-color-scheme` until user explicitly selects a mode.
- Theme switch available in the shared header and mobile navigation; persist an explicit choice; apply theme before paint to prevent a flash of incorrect theme; maintain the chosen theme across `/ar` and `/en`.
- Both theme modes must be equally complete; dark mode is not simply a color inversion and light mode is not an afterthought.
- Support brand-specific material and lighting adjustments for 3D in each theme while keeping the logo faithful.

### Color token contract — exact user-provided brand values

Use **semantic CSS tokens**, never hard-coded hex colors inside React components. The semantic tokens map the user-supplied brand swatches to light and dark roles; derived UI support colors remain subject to WCAG checks.

| Role | CSS variable | Light value | Dark value |
|---|---|---|---|
| Primary brand | `--brand-primary` | `#BE9D5B` | `#BE9D5B` |
| Secondary brand | `--brand-secondary` | `#7A5F28` | `#7A5F28` |
| Accent | `--brand-accent` | `#7A5F28` | `#D8BE86` |
| Primary background | `--background` | `#F5F1E7` | `#0B0A08` |
| Primary foreground | `--foreground` | `#0B0A08` | `#F5F1E7` |
| Surface / card | `--card` | `#F5F1E7` | `#14120E` |
| Surface foreground | `--card-foreground` | `#0B0A08` | `#F5F1E7` |
| Raised surface | `--surface-raised` | `#F5F1E7` | `#201D17` |
| Muted surface | `--muted` | `#CFCBC0` | `#242119` |
| Muted text | `--muted-foreground` | `#625D52` | `#CFCBC0` |
| Border | `--border` | `#CFCBC0` | `#675A40` |
| Input border | `--input` | `#A6A39B` | `#A6A39B` |
| Focus ring | `--ring` | `#7A5F28` | `#D8BE86` |
| Primary CTA | `--primary` | `#0B0A08` | `#D8BE86` |
| Primary CTA foreground | `--primary-foreground` | `#F5F1E7` | `#0B0A08` |
| Secondary CTA | `--secondary` | `#CFCBC0` | `#242119` |
| Secondary CTA foreground | `--secondary-foreground` | `#0B0A08` | `#F5F1E7` |
| Destructive action | `--destructive` | `#A33132` | `#FA8582` |
| Success state | `--success` | `#276744` | `#7DD3A1` |
| Warning state | `--warning` | `#815100` | `#F3C777` |
| Info state | `--info` | `#245C85` | `#8AC7FA` |
| Overlay/scrim | `--overlay` | `rgb(16 15 12 / 65%)` | `rgb(0 0 0 / 70%)` |
| 3D ambient color | `--scene-ambient` | `#CFCBC0` | `#201D17` |
| 3D key light | `--scene-key` | `#BE9D5B` | `#BE9D5B` |

**Accessibility gates when applying colors:** normal-size text contrast ≥4.5:1; large text ≥3:1; meaningful UI component boundaries and focus indicators ≥3:1 where applicable. Check all foreground/background pairs in both modes, including hover, disabled, validation, 3D fallback and translucent surfaces. Prefer solid surfaces under essential text. Verify branded CTA contrast rather than assuming brand colors pass.

**Approval input:** review the portfolio-derived proposed colors above, approve or request changes, and supply original vector logo/brand guide if available.

### Token implementation

Use the proposed valid values at the top of this document; update upon brand approval.

## 3. Type system and localization

- Use `next/font` to host/load approved font families; typography is confirmed: Cairo for Arabic, IBM Plex Sans for English UI, Redaction 100 for selective English display.
- Define independent Arabic and Latin font families and metrics (font choice, weight ranges and variable axes). Avoid relying on identical line-height or letter spacing across scripts.
- Arabic: proper glyph shaping, comfortable line height, and **no exaggerated tracking**. Arabic headlines and numerals must render clearly; test mixed Arabic-English terms and phone numbers.
- English: deliberate typographic hierarchy with restrained tracking; avoid ultra-thin font weights for functional text.
- Use `html lang="ar" dir="rtl"` and `html lang="en" dir="ltr"` on locale routes. Use logical spacing/border properties; icons with direction semantics should flip, but logos, photos and social icons should not.
- Suggested fluid hierarchy (final QA with real fonts):

| Style | Desktop | Mobile | Purpose |
|---|---|---|---|
| Display | `clamp(3.5rem, 7vw, 7rem)` | fluid | Hero headline |
| H1 | `clamp(2.75rem, 5vw, 5rem)` | fluid | Page title |
| H2 | `clamp(2rem, 3.5vw, 3.75rem)` | fluid | Section headings |
| H3 | `clamp(1.375rem, 2vw, 2rem)` | fluid | Cards/subsections |
| Body large | `1.125rem`–`1.25rem` | `1.0625rem` | Introductory copy |
| Body | `1rem` | `1rem` | Standard text |
| Small | `0.875rem` | `0.875rem` | Supporting labels |

Arabic and English SEO copy is individually written/reviewed, not forced into identical line lengths. The language switch preserves page equivalence and maintains current theme.

## 4. Layout, spacing and responsiveness

- 4px base rhythm, with scale `4/8/12/16/24/32/48/64/96` px for spacing; use fluid gaps for page sections.
- Responsive max-width container: design baseline 1200–1440px, measured gutters 20–24px mobile, 32px tablet, 48–64px desktop, to be refined in real mockups.
- Breakpoint-driven layouts: mobile 320–767px; tablet 768–1023px; desktop ≥1024px (content-first testing, not device assumptions).
- Grid: 4 columns mobile (conceptual), 8 tablet, 12 desktop; use CSS Grid/Flex with logical directions and source order that makes sense to screen readers.
- Comfortable mobile interactive hit areas (target ≥44×44px where feasible), keyboard-safe forms, safe-area-aware bottom CTA.
- Shared fixed navigation must not obscure heading anchors or form errors; use `scroll-margin` and proper focus management.
- Radii, border widths, shadows, blur and elevation must be design tokens, not ad hoc values. Initial **shape direction**: restrained corner rounding and subtle elevation; final appearance after brand palette is supplied.

## 5. Component library

Build documented variants for each component using shadcn/ui/Radix foundations and design tokens. Every variant must be reviewed in light, dark, Arabic RTL and English LTR.

| Family | Components / required states |
|---|---|
| Navigation | header, desktop nav, mobile drawer, locale switch, theme toggle, breadcrumbs, footer |
| Actions | primary/secondary/tertiary/destructive buttons; icon buttons; external links; loading/disabled/focus |
| Content | service card, case-study tile, portfolio carousel, team card, quote/testimonial (only if verified), process step, stats (only if evidenced) |
| Input | input, textarea, select, phone field, date picker, time-slot selector, checkbox, radio, validation message |
| Feedback | alert, toast, dialog, skeleton, spinner, empty state, no-results state, error, confirmation |
| Discovery | tabs, accordion FAQ, filter/chips, pagination, search (only if justified) |
| Business | office card, address block, map preview, get-directions CTA, opening-hours display |
| Booking | meeting-type card, availability calendar, time-zone info, slot picker, contact step, review/confirmation, manage-booking actions |
| Staff | role-aware sidebar, agenda/calendar, booking details drawer, tables, status badges, date-range filters, permission/failure feedback |

**Interaction requirements:** hover never stands in for focus; all interactive elements have keyboard activation; disabled controls explain why where necessary; pending booking submissions cannot double-submit; loading states preserve layout; destructive actions require clear confirmation.

## 6. Public site page patterns

### Home (`/[locale]`)

1. **Header:** sticky navigation, services/work/about/contact, Book a Meeting CTA, theme and language switches; avoid hiding primary navigation behind excessive scroll effects.
2. **Hero:** real HTML H1, tagline, service proposition and two CTAs; optional Three.js 3D logo positioned decoratively with an SVG/poster fallback. Do not encode key messaging only in canvas.
3. **Trust:** real verified credentials, client logos and measurable outcomes only with permission/evidence.
4. **About:** editorial typography, agency value proposition and internal link.
5. **Services:** cards linking to crawlable, localized individual service pages.
6. **Selected work:** editorial case studies with valid descriptive text and links.
7. **Approach:** strategic process / methodology.
8. **Team:** professional photography and short bios; consent for publication.
9. **FAQ:** accessible accordion, helpful real answers, not fake FAQ rich-result promises.
10. **Office location:** verified bilingual address, opening hours, preview/map, Get Directions.
11. **Booking CTA:** Book at office / Online if enabled; availability and appointments live in dedicated booking flow.
12. **Footer:** official contact details, nav, locale links, legal/privacy, social links.

### Service detail

A single H1; localized service explanation and deliverables; proof/examples; relevant work; a contextual FAQ; prominent appointment CTA; service-specific metadata and structured data where eligible.

### Work/case-study detail

Hero media plus accessible summary, challenge, process, output, evidenced outcomes and related services; don't make the case study a pure animation canvas.

### Contact + office

Real verified business information, office photo/map preview, click-to-call, approved WhatsApp if applicable, contact form, opening hours, appointment and directions CTAs. Defer interactive Google Maps until necessary to reduce load; always offer a plain directions link.

## 7. Booking experience — bilingual client-first UX

**Main journey:** service → office/online → optional staff selection → date/time → client details → review → confirmation.

- Show the agency's office IANA timezone and client-friendly localized date/time labels. Only offer slots returned by the backend.
- Explain meeting duration, location, cancellation/reschedule rules and privacy before confirmation.
- Office selection displays verified address and directions; optional Google Map preview. Online mode only if enabled, with link shown once genuinely available.
- In Arabic, calendar and stepper align correctly in RTL; time values, dates, phone/email and mixed-direction strings remain readable.
- Error recovery must retain client inputs and selected valid choices; if a slot expires, suggest fresh available alternatives, not a silent failed submit.
- Confirmation screen shows booking reference, time/date, mode, office address/directions or online link, .ics calendar action, and secure management link.
- Booking management must not leak private data or tokens to analytics, query-parameter logging or third parties.
- Mobile: single-column steps, visible progress, clear CTA, large time targets, ergonomic scroll and keyboard behavior.

## 8. Office location pattern

An office component must display the canonical bilingual address and opening hours from the CMS/API office record, not copied static text in multiple places. Display an office photo, map preview, address copy action, a Google Maps directions link and in-person booking CTA. Add Google Business Profile consistency and LocalBusiness JSON-LD only when the address is verified. No fake pin, invented opening hours or unverified reviews.

## 9. Three.js and GSAP motion language

### Motion roles

- **Entrance:** restrained fade/translate on section arrival, clear before/after states, no content hidden permanently if animation fails.
- **Emphasis:** subtle button/card motion; avoid distracting hover loops.
- **Narrative:** controlled scroll-triggered 3D logo transform and portfolio reveals.
- **Feedback:** immediate and clear transitions for booking states, validation and confirmation.

### Recommended timing guidance (initial defaults, tunable)

| Role | Duration | Guidance |
|---|---|---|
| Microinteraction | 120–200ms | button/input changes |
| Component transition | 200–350ms | dialog/cards/drawers |
| Section entrance | 450–750ms | subtle scroll reveal |
| Major 3D hero movement | contextual | smooth but never block scroll or important content |

Use transforms and opacity for efficient animations; test animation lifecycle cleanup in React. Avoid animating layout dimensions at large scale. Do not apply Lenis smooth scrolling by default; consider it only after accessibility/performance QA. Respect `prefers-reduced-motion` with still scenes, instant content and reduced transitions. On low-end devices or failed WebGL, render the real SVG/poster fallback and keep layout dimensions constant.

### 3D theme behavior

The brand logo remains visually recognizable in both modes. Lighting intensity, surrounding fog/ambient and material reflections can adapt to the theme based on the supplied palette. Keep 3D scenes out of the accessibility tree where decorative, with meaningful accessible textual equivalent alongside. Avoid full-time expensive render loops for scenes that are not visible.

## 10. Light/dark and bilingual QA matrix

Test at least these combinations: `ar + light`, `ar + dark`, `en + light`, `en + dark`, each on mobile and desktop; repeat with reduced motion and keyboard-only interaction. Check theme switching while on booking step 3, language switching on a service detail page, typed mixed-direction addresses, API error messages, map fallback and scene unavailable. Theme must not alter business data or reset booking state.

## 11. SEO and content visual requirements

All essential headings and descriptions in semantic, server-rendered HTML. Design for one H1 per page, accessible heading sequence, descriptive images, reasonable text density and meaningful links. Visual 3D cannot replace actual copy. Preserve localized metadata, canonicals and reciprocal `hreflang` on all applicable routes. Avoid low-contrast text, giant animations ahead of the LCP text, and third-party scripts that block the UI.

## 12. Staff interface design

Use the **same brand tokens** with a denser, less animated operational design: high readability and efficient data navigation take priority over spectacle. Includes day/week agenda, booking table, status, service/office filters, receptionist vs manager authorization, audit trail, loading/empty/error states and accessible calendar controls. Staff pages are authenticated and `noindex`; visual hiding is not access control.

## 13. Implementation map

```text
apps/web/src/
  app/[locale]/               # SSR pages, layouts, localized metadata
  components/
    layout/                   # header, footer, locale switch, theme toggle
    ui/                       # shadcn/Radix-based primitives
    landing/                  # premium homepage sections
    three/                    # lazy 3D hero and fallback
    booking/                  # booking wizard + confirmation
    office/                   # map preview, address, directions
    staff/                    # operational dashboard
  styles/
    globals.css
    tokens.css                # only approved color values
    typography.css
  i18n/                      # Arabic and English routing/messages
  lib/{seo,accessibility,theme}/
packages/ui/                 # shared components and tokens where useful
docs/
  design.md                   # this spec
  brand-palette.md           # exact eight approved-as-input swatches
```

**Theme implementation:** `next-themes` or equivalent robust pre-paint theme handling; CSS custom properties and Tailwind v4 semantic mappings; one source of truth. Do not put arbitrary colors in page components. Theme selector = light/dark/system; language selector = Arabic/English, independent from theme state.

## 14. Brand assets and implementation validation checklist

**Still requiring company confirmation:**

- [ ] Approve or adjust proposed portfolio-derived HEX values (or provide brand guide)
- [x] Gold / soft gold roles defined
- [x] Black / charcoal / ivory / greys defined
- [x] Derived CTA pairing proposed from supplied swatches
- [ ] Logo in vector format and preferred light/dark variations
- [x] Cairo, IBM Plex Sans, Redaction 100 selected by user
- [ ] Reference visual sites / desired tone (optional)

**Before production:**

1. Validate extracted HEX values against the supplied palette (already matched).
2. Build light and dark color ramps and surface/typography token mappings; mark any derived support colors as proposals.
3. Run contrast checks and resolve failures without departing from brand intent.
4. Produce approved theme previews covering hero, service cards, booking, map and staff calendar.
5. Verify no TBD remains, map to Tailwind CSS v4/shadcn, and test color/font loading in each language and theme.

## 15. Design acceptance criteria

- Dark and light are both fully styled and tested; system preference respected.
- Arabic RTL and English LTR are equally polished, with readable mixed-script content.
- No fabricated office address, team testimonial or results.
- Booking, office contact and directions work clearly on mobile without 3D.
- Visual effects gracefully degrade and never hide SEO-critical copy.
- Contrast, focus, keyboard navigation, reduced-motion behavior and responsive tests pass.
- No production CSS contains TBD tokens or unapproved hard-coded color values.

**Next action:** Review and approve or amend proposed HEX values; then lock tokens and regenerate QA-verified component/theme previews.

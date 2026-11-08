# Brand design, motion and accessibility

## Exact official swatches

Black `#0B0A08`; Charcoal `#14120E`; Gold `#BE9D5B`; Soft gold `#D8BE86`; Ivory `#F5F1E7`; Warm grey `#CFCBC0`; Muted grey `#A6A39B`; Deep gold `#7A5F28`. These values are user-provided brand swatches, not guesses. Any accessible utility color derived for alerts/statuses is not an official swatch. Do not alter source logos automatically.

Dark design: black canvas, charcoal cards, ivory text, gold accents, soft gold emphasis. Light design: ivory canvas, dark text/CTA, warm-grey supporting surfaces, deep-gold highlights. Use semantic CSS variables and Tailwind v4 mapping, not scattered hex literals. Check AA contrast (4.5:1 normal text, 3:1 large text/nontext meaningful indicators) for every state.

## Fonts

- Cairo: all Arabic content and UI; no tracking that breaks Arabic shaping.
- IBM Plex Sans: English functional UI and body.
- Redaction 100: limited large Latin display words only, never Arabic/form buttons/body.
- Prefer `next/font` where supported; otherwise properly licensed self-hosting; avoid layout shifts and no text-as-image for SEO.

## Interaction stack

3D hero uses approved GLB/SVG original logo; React Three Fiber/Drei client island; GSAP ScrollTrigger scoped with cleanup, graceful WebGL fallback, `prefers-reduced-motion` and low-power option. Limit DPR and frame activity; no primary information rendered solely on canvas. Avoid pinning huge full-screen sections that interfere with navigation. Static HTML H1/CTAs must be present at initial render. Lazy maps.

## UI system

Shared shadcn/Radix components; `next-themes` system/light/dark with no wrong-theme flash; maintain choice across locale routes. Booking: service/mode/date/slot/details/confirmation stepper with full loading/empty/slot-vanished/error behavior. Location: verified address, hours, directions and lightweight map preview. Staff: information-dense calendar and tables, simple 3-dot row menu, semantic status states, keyboard/touch support.

## Screens to validate

EN/AR × dark/light × mobile/desktop × reduced motion; booking with lost network; focus and screen readers; small-screen Arabic menus; portals receiving `dir`; 3D loading and scene unavailability; disabled and skeleton states. Never fabricate team portraits or project results.

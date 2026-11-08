# Approved AMC palette and roles

| Token | Hex | Notes |
|---|---|---|
| black | `#0B0A08` | Dark background, readable light-theme ink |
| charcoal | `#14120E` | Dark raised surface |
| gold | `#BE9D5B` | Brand signature accent (contrast depends on context) |
| softGold | `#D8BE86` | Soft visual highlight |
| ivory | `#F5F1E7` | Light background and dark text |
| warmGrey | `#CFCBC0` | Secondary neutral |
| mutedGrey | `#A6A39B` | Muted text when contrast allows |
| deepGold | `#7A5F28` | Darker brand accent, especially on light |

Light: background ivory, foreground black, card ivory or carefully derived neutral, CTA black/ivory, accent deepGold. Dark: black background, charcoal cards, ivory text, controlled gold primary accent. Never assume gold/white combinations pass WCAG without checking contrast. CSS semantic variables (`--background`, `--foreground`, `--card`, `--primary`, `--ring`, etc.) and Tailwind mappings are canonical; do not hardcode per component. Status colors may require accessible supporting semantic tones: these are functional, not new brand colors.

Type: Cairo all Arabic; IBM Plex Sans English UI/content; Redaction 100 only selected large English headings (>~40px when legible), with a proper font fallback; `next/font` if available. Arabic H1 uses Cairo; glyph shaping and generous line-height. Font licenses reviewed separately before self-hosting; no binaries included.

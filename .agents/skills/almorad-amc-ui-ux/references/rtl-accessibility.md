# Arabic & accessibility patterns

Use `html lang="ar" dir="rtl"` and English LTR. Prefer logical spacing (`ms/me`, `ps/pe`, `start/end`). Portaled Radix Select/Dialog/Dropdown/Popover receive direction explicitly. Flip chevrons/arrows, not brand logo/photos/3D or media symbols. Email/phone/URL/time and booking IDs remain LTR; use `<bdi>` for inline technical tokens.

Cairo leading adequate for dots/diacritics; don't apply Redaction or aggressive letter spacing to Arabic. Validate translated UI strings and culturally natural layout. Use appropriate locale/timezone in `Intl` without hardcoded UTC offset (Egypt DST can change).

WCAG 2.2 AA target: body text >=4.5:1, large text/UI >=3:1 as applicable, visible focus, accessible form errors, 44px mobile hit targets where feasible, keyboard-only booking, dialog focus trap and Escape, reduced motion, high-contrast maps alternative with text directions link. Test keyboard across both themes and both locales.

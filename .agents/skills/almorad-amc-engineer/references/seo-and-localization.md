# SEO-first bilingual site and Google integration

## Public routes

`/en`, `/ar`; `/[locale]/services`, `/[locale]/services/{pillar}`, 11 dedicated service detail routes, `/[locale]/work/{slug}`, about/team/contact/book. Use stable locale-aware slugs, redirect mapping when changed; never expose private client management tokens in indexed URLs.

## Initial technical SEO gates

- Crawlable SSR/RSC HTML: unique localized titles, descriptions, one visible H1 and semantic H2/H3, internal links, navigable links independent of animations.
- Dedicated `/ar` and `/en` URLs, self canonical, reciprocal self-inclusive `hreflang`; `x-default` if a neutral selector/default exists. Test every published pair.
- Sitemap with only indexable published pages; robots is a crawl instruction not authorization; protect `/staff` and booking management with auth/noindex/cache-control.
- JSON-LD: verified `Organization`, appropriate `LocalBusiness` when eligible, `Service`, `BreadcrumbList`; don't imply Google rich results are guaranteed.
- Don't create low-value keyword pages or duplicate translated filler. Keyword research separately for Arabic (Egypt intent) and English; write natural titles and internal linking for all 11 services.
- Local SEO: canonical real address, office hours, phone, verified Place ID and directions, eligible GBP only. Never fabricate office location or reviews.
- Core Web Vitals at p75 targets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; 3D and third-party Maps/GA must not block critical content.

## Google sequence

1. Build technical SEO before any external connection; validate via rendered HTML, URL tests and Search Console-compatible sitemaps.
2. After owning live domain, verify Search Console domain and submit sitemap.
3. Configure privacy/consent-aware GA4 or GTM, measure `view_service`, `click_book_meeting`, `booking_started`, `booking_confirmed`, `contact_submitted`, `click_get_directions`, `change_language`, without PII.
4. Verify Business Profile if eligible; keep business data consistent across site, email footers and maps.
5. Google Calendar is separate from SEO and needs explicitly authorized OAuth; never infer it is connected from the presence of a Google account.

## Arabic/LTR technical rules

`html lang=ar dir=rtl` vs `lang=en dir=ltr`; Cairo Arabic and IBM Plex Sans functional English; Redaction 100 display-only. Use CSS logical properties, locale-aware navigation and dropdown portals, English emails/phones/URLs in `dir=ltr`, `<bdi>` for mixed text. Do not use literal translations as SEO research. Preserve equivalent routes on language switch; do not force redirect by bot geolocation.

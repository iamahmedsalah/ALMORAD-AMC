# Next.js international technical SEO

Recommended routes: `app/[locale]/(marketing)/...`; two locale pages for each equivalent indexable resource. `generateMetadata` or static metadata with `metadataBase`, title, description, `alternates.canonical` and `alternates.languages` mapping full absolute locale URLs. Include self-inclusive reciprocal alternates. For a missing translation, do not silently hreflang it as a valid equivalent.

Implement `app/sitemap.ts`, `app/robots.ts`, `not-found.tsx` and correct status/redirect behavior. Avoid auto-indexing unpublished case studies and preview URLs. Build broken-link and duplicate-canonical checks; ensure proper `lang`, `dir`, heading structure and stable locale switching.

Use accessible HTML service content independent of interactive components; Next.js server components by default. Images in AVIF/WebP where appropriate, responsive sizes, meaningful alt, correct caching. Defer external Maps and analytics where possible. Check mobile p75 LCP/INP/CLS and JavaScript payload of Three.js hero.

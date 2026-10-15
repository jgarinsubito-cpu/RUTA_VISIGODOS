---
name: heritage-content
description: Add or edit Ruta Visigoda heritage content — sites, claims, stories, routes, home page and assistant settings — through the content admin or in web/src/data. Use whenever catalog data, evidence levels, sources, opening hours, publication status or the publication rules change.
---

# Heritage content

Content has two homes:

- **The content admin (`/admin`, docs/ADMIN.md)** — where the editorial team curates what the web shows. Records (`public.content_records`) go draft → review → a validator publishes a checked version (`public.catalog_snapshots`). This is the normal way to change content once Supabase is configured.
- **The bundled demo catalog** — `web/src/data/catalog.ts` (`DEMO_CATALOG`: published only, shipped to the browser) and `web/src/data/editorial.ts` (draft/review/superseded, tests and tooling only). It is the fallback when no version has been published and the first import into the admin. Edit it for demo fixtures and tests.

Types are in `web/src/domain/types.ts` (`Catalog`, `Site`, `ValidatedClaim`, `Story`, `Route`, `Showcase`). App code reads content only through `web/src/data/content.ts` (`sites()`, `routes()`, `showcase()`, `getSite`…); a test fails if anything else imports `catalog.ts`. Per-site and per-route knowledge belongs in the data, never in assistant or UI code.

## Rules

- Never invent approved content. Until real FM-01…FM-10 records arrive, keep `demo: true` and cite `DEMO_SOURCE`. Real records need source title and page, evidence level and (for I) attribution from the supplied material.
- Evidence: `D` documented fact, `I` interpretation (requires `attribution`), `H` hypothesis, `T` tradition. Phrase `text` so it stays true at that level.
- Only published claims reach visitors or the assistant. In the demo catalog, drafts/reviews/superseded claims go in `editorial.ts`. A correction publishes a new version; if a claim's meaning changes, create a new claim and retire the old one.
- A story may only state what its `claimIds` support (published claims of its own place).
- Operational data: `hours.status` is `verified` only with `verifiedAt` and an official source; otherwise `example` or `unknown`. Unknown access stays `unknown`. Mark coordinates `approximate: true` until field-verified.
- Non-Visigothic sites get `visigothic: false`.
- `keywords`, `aliases`, `Route.keywords` and `Showcase.heritageKeywords` are lowercase and accent-free (router syntax: `corona*` = prefix).
- A place is named by its name, its slug as a phrase and its `aliases` only (single slug words do not count). An alias must name only that place and never a town; `validateCatalog` rejects clashes.
- `Showcase` holds the route's own vocabulary and entry points: `localities` (every site's `locality` is one of them, each with `gettingThere`), `regionName`, `themes` (chip order; site themes outside it are hidden), hero site and copy, place group copy, assistant intro, starter/general/family prompts, `assistantExamples`, `heritageKeywords`, area and transport hints.
- Routes have no stored duration: the planner computes it (`estimateRoute`/`routeMinutes`).
- Images: freely licensed with `author`, `license` and `sourceUrl`; add a `caption` when it does not show the place itself. Demo files go in `web/public/images/places/`; the admin uploads to the `place-images` bucket. `imageTone` is a tone token name (`ochre`, `moss`, `terracotta`, `umber`, `stone`, `slate`), never a colour.
- Practical card data (`category`, `address`, `phone`, `officialUrl`) and descriptions come from public sources listed in `sources`; they are not evidence claims.
- Publication rules live in `web/src/domain/editorial/validate.ts` and run in the admin, the publish route and when a version is installed. Add a rule there (with a test in `editorial.test.ts`) rather than in UI code.

## Checklist

1. Edit the data (admin, or `catalog.ts` for the demo); keep IDs stable (`site-…`, `claim-…`, `story-…`, `route-…`) — visitors' devices store them.
2. Demo catalog: `npm test` checks it passes `validateCatalog` and the schema, that app code never imports `editorial.ts`, and that only published claims are retrieved and cited. Admin: the *Reglas de publicación* panel and the publish page show the same checks.
3. In `web/`: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
4. Ask the assistant about the new content (`/admin/probar` with drafts, or `/asistente`) and confirm recognised places, citations and evidence labels.

---
name: heritage-content
description: Add or edit Ruta Visigoda heritage content — sites, claims, stories, routes — in web/src/data. Use whenever catalog data, evidence levels, sources, opening hours or publication status change.
---

# Heritage content

Content lives in `web/src/data/catalog.ts` (published, shipped to the browser) and `web/src/data/editorial.ts` (draft/review/superseded, tests and tooling only). Types are in `web/src/domain/types.ts`.

App code reads content only through `web/src/data/content.ts` (getters, published claims, `SHOWCASE`); a test fails if anything else imports `catalog.ts`. Per-site knowledge belongs in the data, never in assistant or UI code.

## Rules

- Never invent approved content. Until real FM-01…FM-10 records arrive, keep `demo: true` and cite `DEMO_SOURCE`. Real records need source title and page, evidence level and (for I) attribution from the supplied material.
- Evidence: `D` documented fact, `I` interpretation (requires `attribution`), `H` hypothesis, `T` tradition. Phrase `text` so it stays true at that level.
- Only `status: "published"` claims go in `catalog.ts`. Drafts, reviews and superseded versions go in `editorial.ts`. Corrections publish a new version; don't edit a published claim's meaning in place.
- A story may only state what its `claimIds` support.
- Operational data: `hours.status` is `verified` only with `verifiedAt` and an official source; otherwise `example` or `unknown`. Unknown access stays `unknown`. Mark coordinates `approximate: true` until field-verified.
- Non-Visigothic sites get `visigothic: false`.
- `keywords` are lowercase and accent-free, used by assistant retrieval.
- `Site.aliases`: extra names visitors use (lowercase, accent-free); the name and distinctive slug words match automatically. `Site.suggestedPrompts`: follow-up questions when the place is in focus.
- Routes have no stored duration: the planner computes it (`estimateRoute`/`routeMinutes`). `Route.keywords` point plan requests to the route (router syntax, `corona*` = prefix).
- `SHOWCASE` (catalog.ts): home hero site, starter prompts, general follow-ups and the examples the assistant offers when it cannot answer. Every ID must exist.
- Images: a site's `image` must be freely licensed (e.g. Wikimedia Commons) with `author`, `license` and `sourceUrl`; add a `caption` when it does not show the place itself. Files go in `web/public/images/places/`. `imageTone` is a tone token name (`ochre`, `moss`, `terracotta`, `umber`, `stone`, `slate` → `--tone-*` in globals.css), never a colour.
- Practical card data (`category`, `address`, `phone`, `officialUrl`) and descriptions come from public sources listed in `sources`; they are not evidence claims.

## Checklist

1. Edit the data; keep IDs stable (`site-…`, `claim-…`, `story-…`, `route-…`).
2. Check every `claimIds`/`storyIds`/`stopIds`/`SHOWCASE` reference resolves (the catalog reference tests check both directions).
3. In `web/`: `npm test` (catalog tests fail if app code imports `editorial.ts`; assistant safety tests check that only published claims are retrieved and cited), `npm run typecheck`, `npm run build`.
4. Ask the assistant a question about the new content in `/asistente` and confirm citations and evidence labels.

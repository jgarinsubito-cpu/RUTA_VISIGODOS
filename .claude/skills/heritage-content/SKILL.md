---
name: heritage-content
description: Add or edit Ruta Visigoda heritage content — sites, claims, stories, routes — in web/src/data. Use whenever catalog data, evidence levels, sources, opening hours or publication status change.
---

# Heritage content

Content lives in `web/src/data/catalog.ts` (published, shipped to the browser) and `web/src/data/editorial.ts` (draft/review/superseded, tests and tooling only). Types are in `web/src/domain/types.ts`.

## Rules

- Never invent approved content. Until real FM-01…FM-10 records arrive, keep `demo: true` and cite `DEMO_SOURCE`. Real records need source title and page, evidence level and (for I) attribution from the supplied material.
- Evidence: `D` documented fact, `I` interpretation (requires `attribution`), `H` hypothesis, `T` tradition. Phrase `text` so it stays true at that level.
- Only `status: "published"` claims go in `catalog.ts`. Drafts, reviews and superseded versions go in `editorial.ts`. Corrections publish a new version; don't edit a published claim's meaning in place.
- A story may only state what its `claimIds` support.
- Operational data: `hours.status` is `verified` only with `verifiedAt` and an official source; otherwise `example` or `unknown`. Unknown access stays `unknown`. Mark coordinates `approximate: true` until field-verified.
- Non-Visigothic sites get `visigothic: false`.
- `keywords` are lowercase and accent-free, used by assistant retrieval.
- Images: `imageTone` gradient placeholder until licensed photography with credits exists.

## Checklist

1. Edit the data; keep IDs stable (`site-…`, `claim-…`, `story-…`, `route-…`).
2. Check every `claimIds`/`storyIds`/`stopIds` reference resolves.
3. In `web/`: `npm test` (catalog tests fail if app code imports `editorial.ts`; assistant safety tests check that only published claims are retrieved and cited), `npm run typecheck`, `npm run build`.
4. Ask the assistant a question about the new content in `/asistente` and confirm citations and evidence labels.

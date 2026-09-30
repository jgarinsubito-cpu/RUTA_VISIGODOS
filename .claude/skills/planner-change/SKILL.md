---
name: planner-change
description: Change Ruta Visigoda itinerary feasibility — scheduling, opening windows, travel times, access rules, proposals — in web/src/domain/planner.ts and travel.ts. Use for any planner or trip-proposal change.
---

# Planner changes

The planner (`web/src/domain/planner.ts`) is deterministic and pure: no React, storage or network. The language model never decides feasibility.

## Invariants

- Every change is a proposal (`propose*` → `ItineraryProposal`, carrying the resulting `context` and optional `routeId`) and is applied only by `applyProposal`, which rejects stale revisions and invalid proposals.
- Stop warnings are structured (`StopWarning` in types.ts); `domain/warnings.ts` renders the Spanish text and groups trip-wide ones (`groupWarnings`). Proposal `warnings` hold trip-wide notes only. A new warning needs a code, a sentence in `describeWarning` and a case in `state/persisted.ts`'s schema.
- Route durations come from `estimateRoute` (same scheduler, no date); never store them in data.
- Hard failures (`ok: false`, with a Spanish reason naming the site, worded by `describeWarning`): closed day, visit not fitting an opening window, ending after `context.endTime`, a walking leg over `MAX_WALK_KM`, duplicate or unknown sites.
- Unverified data makes a stop `provisional` with a warning, never "verified": no date, `example`/`unknown` hours, unverified step-free access.
- Weekdays come from the `YYYY-MM-DD` calendar date (`isoWeekday`), independent of the device's time zone and DST.
- Travel times are estimates behind `TravelTimeProvider` (travel.ts) until a real routing provider is chosen.
- Adding a site already in the trip never duplicates it.

## Checklist

1. Write the failing case in `web/src/domain/planner.test.ts` first: closures, window edges, end time, DST dates (2026-03-29, 2026-10-25), step-free, stale apply, move/remove revalidation, route proposals.
2. Implement; keep exported signatures (store.ts and the UI depend on them).
3. `npm test`; also run with `TZ=America/Los_Angeles` and `TZ=Pacific/Kiritimati` to catch time-zone drift.
4. `npm run typecheck && npm run build`, then check the review dialog in the browser (`/mi-viaje`, add a place from `/lugares/...`).

/**
 * Editorial workflow (PLAN.md, "Core data and editorial workflow"), pure part.
 *
 * Editors work on records: one per place, claim, story, route, plus the home page and assistant
 * settings ("showcase"). A record's status says where its working copy stands:
 *   draft      being edited; not on the web (or the web shows an older version);
 *   review     sent to a validator;
 *   published  the working copy is what the web shows;
 *   retired    taken off the web.
 * Publishing turns a selection of records in review into a new catalog snapshot. Records not in
 * the selection keep what the web already shows, so a draft never leaks into a release.
 */
import type { Catalog, Showcase, Site, Stop, Story, ValidatedClaim } from "@/domain/types";
import { normalize } from "@/domain/assistant/text";
import type { ClaimData, RecordDataByKind, RecordKind, SiteData, StopData } from "./schema";

export type RecordStatus = "draft" | "review" | "published" | "retired";

export interface ContentRecord<K extends RecordKind = RecordKind> {
  kind: K;
  id: string;
  data: RecordDataByKind[K];
  status: RecordStatus;
  /** In review: the editor asks for the record to be taken off the web. */
  retire: boolean;
  /** Order on the web (places, routes) and in lists; changes take effect at the next publication. */
  position: number;
  /** Bumped by the database on every change; publishing checks it so nobody's edit is lost. */
  rev: number;
  /** Why a validator sent it back. */
  reviewNote: string | null;
  firstPublishedAt: string | null;
  updatedAt: string;
  /** Staff member who made the last change. */
  updatedBy?: string | null;
}

export type AnyRecord = { [K in RecordKind]: ContentRecord<K> }[RecordKind];

export const SHOWCASE_ID = "showcase";

export function recordKey(r: { kind: RecordKind; id: string }): string {
  return `${r.kind}:${r.id}`;
}

/* ---------- Entities <-> record data ---------- */

/** A place as an editor writes it: without the claim and story lists derived at publication. */
export function siteData(site: Site): SiteData {
  const data: Partial<Site> = { ...site };
  delete data.claimIds;
  delete data.storyIds;
  return data as SiteData;
}

/** A stop as an editor writes it: without the story list derived at publication. */
export function stopData(stop: Stop): StopData {
  const data: Partial<Stop> = { ...stop };
  delete data.storyIds;
  return data as StopData;
}

/** A claim as an editor writes it: without the status and version the workflow sets. */
export function claimData(claim: ValidatedClaim): ClaimData {
  const data: Partial<ValidatedClaim> = { ...claim };
  delete data.status;
  delete data.version;
  return data as ClaimData;
}

/** What the published catalog holds for a record, as record data (undefined when not on the web). */
export function liveData<K extends RecordKind>(catalog: Catalog | null, kind: K, id: string): RecordDataByKind[K] | undefined {
  if (!catalog) return undefined;
  const found = (() => {
    switch (kind) {
      case "site": {
        const site = catalog.sites.find((s) => s.id === id);
        return site && siteData(site);
      }
      case "stop": {
        const stop = (catalog.stops ?? []).find((s) => s.id === id);
        return stop && stopData(stop);
      }
      case "claim": {
        const claim = catalog.claims.find((c) => c.id === id);
        return claim && claimData(claim);
      }
      case "story":
        return catalog.stories.find((s) => s.id === id);
      case "route":
        return catalog.routes.find((r) => r.id === id);
      default:
        return id === SHOWCASE_ID ? catalog.showcase : undefined;
    }
  })();
  return found as RecordDataByKind[K] | undefined;
}

/** Key-order-independent JSON, to compare a working copy with what the web shows. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sameData(a: unknown, b: unknown): boolean {
  return stableJson(a) === stableJson(b);
}

/** Records for a whole catalog, all in review: the first import into an empty content store. */
export function recordsFromCatalog(catalog: Catalog): Pick<AnyRecord, "kind" | "id" | "data" | "position">[] {
  return [
    ...catalog.sites.map((s, i) => ({ kind: "site" as const, id: s.id, data: siteData(s), position: i })),
    ...(catalog.stops ?? []).map((s, i) => ({ kind: "stop" as const, id: s.id, data: stopData(s), position: i })),
    ...catalog.claims.map((c, i) => ({ kind: "claim" as const, id: c.id, data: claimData(c), position: i })),
    ...catalog.stories.map((s, i) => ({ kind: "story" as const, id: s.id, data: s, position: i })),
    ...catalog.routes.map((r, i) => ({ kind: "route" as const, id: r.id, data: r, position: i })),
    { kind: "showcase" as const, id: SHOWCASE_ID, data: catalog.showcase, position: 0 },
  ];
}

/* ---------- Building a catalog ---------- */

/**
 * Which version of each record goes into a catalog:
 *  - "publish": records in `selected` (in review) with their working copy, or left out when they
 *    ask for retirement; every other record keeps what `previous` shows (published records'
 *    working copy is what the web shows).
 *  - "preview": every working copy that is not retired or asking for retirement, to try drafts
 *    out in the admin before sending them to review.
 */
export type BuildMode = { mode: "publish"; selected: ReadonlySet<string> } | { mode: "preview" };

function versionFor<K extends RecordKind>(record: ContentRecord<K>, previous: Catalog | null, build: BuildMode): RecordDataByKind[K] | undefined {
  if (record.status === "retired") return undefined;
  if (build.mode === "preview") return record.retire && record.status === "review" ? undefined : record.data;
  if (build.selected.has(recordKey(record))) return record.retire ? undefined : record.data;
  if (record.status === "published") return record.data;
  return liveData(previous, record.kind, record.id);
}

function byPosition<T extends { position: number; id: string }>(a: T, b: T): number {
  return a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** Empty home page settings, so a catalog without them still builds and validation can say so. */
const NO_SHOWCASE: Showcase = {
  localities: [],
  regionName: "",
  themes: [],
  heroSiteId: "",
  heroTitle: "",
  heroIntro: "",
  placeGroups: { visigothic: { title: "", intro: "" }, other: { title: "", intro: "" } },
  assistantIntro: "",
  starterPrompts: [],
  generalPrompts: [],
  assistantExamples: [],
  heritageKeywords: [],
  gettingThere: {},
  areaHints: {},
  transportHints: { walk: "", car: "" },
  familyPrompt: "",
};

/**
 * The catalog a publication (or preview) would produce. Claim versions go up when a published
 * claim's content changes; places' claim and story lists are derived from the claims and stories
 * that point to them, so they can never disagree.
 */
export function buildCatalog(records: readonly AnyRecord[], previous: Catalog | null, build: BuildMode): Catalog {
  const sorted = [...records].sort(byPosition);
  const pick = <K extends RecordKind>(kind: K): RecordDataByKind[K][] =>
    sorted
      .filter((r): r is ContentRecord<K> & AnyRecord => r.kind === kind)
      .map((r) => versionFor(r as ContentRecord<K>, previous, build))
      .filter((d): d is RecordDataByKind[K] => d !== undefined);

  const claims: ValidatedClaim[] = pick("claim").map((data) => {
    const before = previous?.claims.find((c) => c.id === data.id);
    const version = !before ? 1 : sameData(claimData(before), data) ? before.version : before.version + 1;
    return { ...data, status: "published", version };
  });
  const stories: Story[] = pick("story");
  const sites: Site[] = pick("site").map((data) => ({
    ...data,
    claimIds: claims.filter((c) => c.siteId === data.id).map((c) => c.id),
    storyIds: stories.filter((s) => s.siteId === data.id).map((s) => s.id),
  }));
  const stops: Stop[] = pick("stop")
    .map((data) => ({ ...data, storyIds: stories.filter((s) => s.stopId === data.id).map((s) => s.id) }))
    .sort((a, b) => (a.siteId === b.siteId ? a.order - b.order : 0));
  const showcase = pick("showcase")[0] ?? previous?.showcase ?? NO_SHOWCASE;
  return { sites, stops, claims, stories, routes: pick("route"), showcase };
}

/** Status changes that make the records agree with a published catalog (after publishing or restoring). */
export interface StatusUpdate {
  kind: RecordKind;
  id: string;
  /** The rev the change was computed from; the database refuses it if the record changed since. */
  rev: number;
  status: RecordStatus;
}

/** After publishing `selected`: published, or retired when the editor asked for it. */
export function statusesAfterPublish(records: readonly AnyRecord[], selected: ReadonlySet<string>): StatusUpdate[] {
  return records
    .filter((r) => selected.has(recordKey(r)))
    .map((r) => ({ kind: r.kind, id: r.id, rev: r.rev, status: r.retire ? "retired" : "published" }));
}

/**
 * After restoring an older snapshot: records whose working copy is what the web now shows become
 * published; published ones that differ (or are no longer on the web) go back to draft so the next
 * publication does not silently re-release them. Drafts and reviews keep their state.
 */
export function statusesAfterRestore(records: readonly AnyRecord[], restored: Catalog): StatusUpdate[] {
  const updates: StatusUpdate[] = [];
  for (const r of records) {
    const live = liveData(restored, r.kind, r.id);
    let status: RecordStatus = r.status;
    if (live !== undefined && sameData(live, r.data)) status = "published";
    else if (r.status === "published" || (r.status === "retired" && live !== undefined)) status = "draft";
    if (status !== r.status) updates.push({ kind: r.kind, id: r.id, rev: r.rev, status });
  }
  return updates;
}

/* ---------- Identifiers ---------- */

const PREFIX: Record<Exclude<RecordKind, "showcase">, string> = { site: "site", stop: "stop", claim: "claim", story: "story", route: "route" };

/** "Museo de Santa Cruz" -> "museo-de-santa-cruz" (at most `words` words). */
export function slugify(text: string, words = 8): string {
  return normalize(text).split(" ").filter(Boolean).slice(0, words).join("-").slice(0, 60).replace(/-+$/, "");
}

/** A new, unused id such as "site-museo-de-santa-cruz" (or "…-2" when taken). */
export function newRecordId(kind: Exclude<RecordKind, "showcase">, label: string, taken: ReadonlySet<string>): string {
  const base = `${PREFIX[kind]}-${slugify(label, kind === "claim" ? 6 : 8) || "nuevo"}`;
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

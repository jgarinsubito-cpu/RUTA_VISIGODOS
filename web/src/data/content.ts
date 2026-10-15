/**
 * Content access: the only way app code reads places, routes, claims and stories.
 *
 * The current catalog is one published version: the latest snapshot published from the admin
 * (installed by ./published on the server and by CatalogProvider in the browser) or, when no
 * content store is configured, the bundled demo catalog (./catalog). Reads are synchronous and
 * always see one whole version. A test fails if any other app module imports ./catalog.
 *
 * Only published claims are exposed (PLAN.md, assistant step 2): drafts, review and superseded
 * records never reach visitors or the assistant.
 */
import type { Catalog, Route, RouteId, Showcase, Site, SiteId, Story, StoryId, TripArea, ValidatedClaim } from "@/domain/types";
import { DEMO_CATALOG } from "./catalog";

interface Installed {
  catalog: Catalog;
  /** Published snapshot number; null for the bundled demo catalog or a preview. */
  version: number | null;
  claims: readonly ValidatedClaim[];
  siteById: Map<SiteId, Site>;
  siteBySlug: Map<string, Site>;
  routeById: Map<RouteId, Route>;
  routeBySlug: Map<string, Route>;
  claimById: Map<string, ValidatedClaim>;
  storyById: Map<StoryId, Story>;
  tripAreas: readonly TripArea[];
}

function install(catalog: Catalog, version: number | null): Installed {
  // The catalog should already hold published claims only; the filter guards against one that does not.
  const claims = catalog.claims.filter((c) => c.status === "published");
  return {
    catalog,
    version,
    claims,
    siteById: new Map(catalog.sites.map((s) => [s.id, s])),
    siteBySlug: new Map(catalog.sites.map((s) => [s.slug, s])),
    routeById: new Map(catalog.routes.map((r) => [r.id, r])),
    routeBySlug: new Map(catalog.routes.map((r) => [r.slug, r])),
    claimById: new Map(claims.map((c) => [c.id, c])),
    storyById: new Map(catalog.stories.map((s) => [s.id, s])),
    tripAreas: [...catalog.showcase.localities, catalog.showcase.regionName],
  };
}

let current: Installed = install(DEMO_CATALOG, null);

/** The bundled demo catalog: used until a published version is installed, and as the fallback. */
export function demoCatalog(): Catalog {
  return DEMO_CATALOG;
}

export function currentCatalog(): Catalog {
  return current.catalog;
}

/** Published snapshot number of the current catalog; null for the bundled demo. */
export function catalogVersion(): number | null {
  return current.version;
}

/** Make `catalog` the current version. Installing the version that is already current does nothing. */
export function setCatalog(catalog: Catalog, version: number | null): void {
  if (catalog === current.catalog || (version !== null && version === current.version)) return;
  current = install(catalog, version);
}

/**
 * Run `fn` with `catalog` as the current version, then restore the previous one. For previews of
 * unpublished drafts in the admin; `fn` must be synchronous.
 */
export function withCatalog<T>(catalog: Catalog, fn: () => T): T {
  const previous = current;
  current = catalog === previous.catalog ? previous : install(catalog, null);
  try {
    return fn();
  } finally {
    current = previous;
  }
}

/** A value derived from the current catalog (an index, a keyword list), computed once per version. */
export function perCatalog<T>(compute: (catalog: Catalog) => T): () => T {
  const cache = new WeakMap<Catalog, { value: T }>();
  return () => {
    const catalog = current.catalog;
    let entry = cache.get(catalog);
    if (!entry) {
      entry = { value: compute(catalog) };
      cache.set(catalog, entry);
    }
    return entry.value;
  };
}

export function sites(): readonly Site[] {
  return current.catalog.sites;
}
export function routes(): readonly Route[] {
  return current.catalog.routes;
}
export function showcase(): Showcase {
  return current.catalog.showcase;
}
export function publishedClaims(): readonly ValidatedClaim[] {
  return current.claims;
}
/** Towns the route covers, in display order. */
export function localities(): readonly string[] {
  return current.catalog.showcase.localities;
}
/** Trip area choices: each locality, then the whole region. */
export function tripAreas(): readonly TripArea[] {
  return current.tripAreas;
}
/** `area` when it is a choice of the current catalog, otherwise the whole region. */
export function validArea(area: string): TripArea {
  return current.tripAreas.includes(area) ? area : current.catalog.showcase.regionName;
}

export function getSite(id: SiteId): Site | undefined {
  return current.siteById.get(id);
}
export function getSiteBySlug(slug: string): Site | undefined {
  return current.siteBySlug.get(slug);
}
export function getRoute(id: RouteId): Route | undefined {
  return current.routeById.get(id);
}
export function getRouteBySlug(slug: string): Route | undefined {
  return current.routeBySlug.get(slug);
}
export function getPublishedClaim(id: string): ValidatedClaim | undefined {
  return current.claimById.get(id);
}
export function getStory(id: StoryId): Story | undefined {
  return current.storyById.get(id);
}
export function claimsForSite(siteId: SiteId): ValidatedClaim[] {
  return current.claims.filter((c) => c.siteId === siteId);
}
export function storiesForSite(siteId: SiteId): Story[] {
  return current.catalog.stories.filter((s) => s.siteId === siteId);
}
/** Published claims a story is based on, in the story's order; withdrawn ones are left out. */
export function claimsForStory(story: Story): ValidatedClaim[] {
  return story.claimIds.map((id) => current.claimById.get(id)).filter((c): c is ValidatedClaim => c !== undefined);
}

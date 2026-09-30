/**
 * Content access: the only way app code reads places, routes, claims and stories.
 *
 * Today it serves the bundled demo catalog (./catalog). When the staged-import repository of
 * approved content exists, it replaces this module's source and nothing else changes; a test
 * fails if any other app module imports ./catalog directly.
 *
 * Only published claims are exposed (PLAN.md, assistant step 2): drafts, review and superseded
 * records never reach visitors or the assistant.
 */
import type { Route, RouteId, Showcase, Site, SiteId, Story, StoryId, ValidatedClaim } from "@/domain/types";
import { CLAIMS, ROUTES as ALL_ROUTES, SHOWCASE as CATALOG_SHOWCASE, SITES as ALL_SITES, STORIES } from "./catalog";

export const SITES: readonly Site[] = ALL_SITES;
export const ROUTES: readonly Route[] = ALL_ROUTES;
export const SHOWCASE: Showcase = CATALOG_SHOWCASE;

/** CLAIMS is already published-only; the filter guards against a non-published record added there. */
export const PUBLISHED_CLAIMS: readonly ValidatedClaim[] = CLAIMS.filter((c) => c.status === "published");

const siteById = new Map(SITES.map((s) => [s.id, s]));
const siteBySlug = new Map(SITES.map((s) => [s.slug, s]));
const routeById = new Map(ROUTES.map((r) => [r.id, r]));
const routeBySlug = new Map(ROUTES.map((r) => [r.slug, r]));
const claimById = new Map(PUBLISHED_CLAIMS.map((c) => [c.id, c]));
const storyById = new Map(STORIES.map((s) => [s.id, s]));

export function getSite(id: SiteId): Site | undefined {
  return siteById.get(id);
}
export function getSiteBySlug(slug: string): Site | undefined {
  return siteBySlug.get(slug);
}
export function getRoute(id: RouteId): Route | undefined {
  return routeById.get(id);
}
export function getRouteBySlug(slug: string): Route | undefined {
  return routeBySlug.get(slug);
}
export function getPublishedClaim(id: string): ValidatedClaim | undefined {
  return claimById.get(id);
}
export function getStory(id: StoryId): Story | undefined {
  return storyById.get(id);
}
export function claimsForSite(siteId: SiteId): ValidatedClaim[] {
  return PUBLISHED_CLAIMS.filter((c) => c.siteId === siteId);
}
export function storiesForSite(siteId: SiteId): Story[] {
  return STORIES.filter((s) => s.siteId === siteId);
}
/** Published claims a story is based on, in the story's order; withdrawn ones are left out. */
export function claimsForStory(story: Story): ValidatedClaim[] {
  return story.claimIds.map((id) => claimById.get(id)).filter((c): c is ValidatedClaim => c !== undefined);
}

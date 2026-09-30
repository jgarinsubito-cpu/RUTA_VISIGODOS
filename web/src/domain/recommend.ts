/**
 * Preference-based ranking (pure). Interests reorder places and routes; they never hide anything
 * and never change what is said about a place. Access needs do not rank: access data is mostly
 * unverified, so they only make the app state what is unknown for each need.
 */
import { STEP_FREE_NEEDS, type AccessNeed, type Route, type Site, type VisitorPreferences } from "./types";

/** Themes of `site` the visitor said they care about. */
export function matchingInterests(site: Pick<Site, "themes">, prefs: VisitorPreferences | undefined): string[] {
  if (!prefs || prefs.interests.length === 0) return [];
  return site.themes.filter((t) => prefs.interests.includes(t));
}

/** Stable sort: more matching interests first, catalog order otherwise. */
export function rankSites<T extends Pick<Site, "themes">>(sites: readonly T[], prefs: VisitorPreferences | undefined): T[] {
  if (!prefs || prefs.interests.length === 0) return [...sites];
  return sites
    .map((site, i) => ({ site, i, score: matchingInterests(site, prefs).length }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.site);
}

/** Interest matches across a route's stops. */
export function routeInterestScore(route: Route, getSite: (id: string) => Site | undefined, prefs: VisitorPreferences | undefined): number {
  return route.stopIds.reduce((n, id) => {
    const site = getSite(id);
    return n + (site ? matchingInterests(site, prefs).length : 0);
  }, 0);
}

export function needsStepFree(needs: readonly AccessNeed[]): boolean {
  return needs.some((n) => STEP_FREE_NEEDS.includes(n));
}

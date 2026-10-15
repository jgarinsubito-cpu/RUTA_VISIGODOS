/** Pure filtering for the Explorar home: locality, theme chip and accent-insensitive search. */
import type { Route, Site } from "@/domain/types";

/** "Todos" or one of the catalog's localities. */
export type LocalityFilter = string;

export const ALL_LOCALITIES = "Todos";

export function localityOptions(localities: readonly string[]): LocalityFilter[] {
  return [ALL_LOCALITIES, ...localities];
}

export interface ExploreFilters {
  query: string;
  locality: LocalityFilter;
  theme: string | null;
}

export const EMPTY_FILTERS: ExploreFilters = { query: "", locality: ALL_LOCALITIES, theme: null };

/** Lowercase, strip diacritics and collapse whitespace: "Arqueología" -> "arqueologia". */
export function fold(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function textMatches(haystack: string[], query: string): boolean {
  const terms = fold(query).split(" ").filter(Boolean);
  if (terms.length === 0) return true;
  const text = fold(haystack.join(" "));
  return terms.every((t) => text.includes(t));
}

export function siteMatches(site: Site, f: ExploreFilters): boolean {
  if (f.locality !== ALL_LOCALITIES && site.locality !== f.locality) return false;
  if (f.theme && !site.themes.some((t) => fold(t) === fold(f.theme!))) return false;
  return textMatches([site.name, site.tagline, site.locality, ...site.themes], f.query);
}

export function filterSites(sites: readonly Site[], f: ExploreFilters): Site[] {
  return sites.filter((s) => siteMatches(s, f));
}

/**
 * A route is shown when it passes through the chosen locality and either its own text or one of
 * its stops matches the theme/search.
 */
export function filterRoutes(routes: readonly Route[], sites: readonly Site[], f: ExploreFilters): Route[] {
  return routes.filter((route) => {
    const stops = route.stopIds.map((id) => sites.find((s) => s.id === id)).filter((s) => s !== undefined);
    if (f.locality !== ALL_LOCALITIES && !stops.some((s) => s.locality === f.locality)) return false;
    if (f.theme && !stops.some((s) => s.themes.some((t) => fold(t) === fold(f.theme!)))) return false;
    if (!f.query.trim()) return true;
    return (
      textMatches([route.name, route.theme, route.summary], f.query) ||
      stops.some((s) => siteMatches(s, { ...f, locality: ALL_LOCALITIES, theme: null }))
    );
  });
}

/** The catalog's themes (Showcase.themes, in chip order) that at least one place has. */
export function availableThemes(sites: readonly Site[], themes: readonly string[]): string[] {
  const present = new Set(sites.flatMap((s) => s.themes));
  return themes.filter((t) => present.has(t));
}

export function isFiltered(f: ExploreFilters): boolean {
  return f.query.trim() !== "" || f.locality !== ALL_LOCALITIES || f.theme !== null;
}

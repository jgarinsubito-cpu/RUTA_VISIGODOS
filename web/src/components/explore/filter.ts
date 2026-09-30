/** Pure filtering for the Explorar home: locality, theme chip and accent-insensitive search. */
import { LOCALITIES, type Route, type Site } from "@/domain/types";

export type LocalityFilter = "Todos" | Site["locality"];

export const LOCALITY_OPTIONS: LocalityFilter[] = ["Todos", ...LOCALITIES];

/** Curated chip order; only themes present in the catalog are shown. */
export const THEME_ORDER = ["capital", "tesoro", "arqueología", "paisaje", "museos", "arquitectura", "arte", "territorio"];

export interface ExploreFilters {
  query: string;
  locality: LocalityFilter;
  theme: string | null;
}

export const EMPTY_FILTERS: ExploreFilters = { query: "", locality: "Todos", theme: null };

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
  if (f.locality !== "Todos" && site.locality !== f.locality) return false;
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
    if (f.locality !== "Todos" && !stops.some((s) => s.locality === f.locality)) return false;
    if (f.theme && !stops.some((s) => s.themes.some((t) => fold(t) === fold(f.theme!)))) return false;
    if (!f.query.trim()) return true;
    return (
      textMatches([route.name, route.theme, route.summary], f.query) ||
      stops.some((s) => siteMatches(s, { ...f, locality: "Todos", theme: null }))
    );
  });
}

/** Curated themes that at least one catalog site actually has, in chip order. */
export function availableThemes(sites: readonly Site[]): string[] {
  const present = new Set(sites.flatMap((s) => s.themes));
  return THEME_ORDER.filter((t) => present.has(t));
}

export function isFiltered(f: ExploreFilters): boolean {
  return f.query.trim() !== "" || f.locality !== "Todos" || f.theme !== null;
}

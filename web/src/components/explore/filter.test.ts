import { describe, expect, it } from "vitest";
import { ROUTES, SITES } from "@/data/content";
import { availableThemes, EMPTY_FILTERS, filterRoutes, filterSites, fold, isFiltered } from "./filter";

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("explore filters", () => {
  it("folds accents and case", () => {
    expect(fold("  Arqueología  ROMÁN ")).toBe("arqueologia roman");
  });

  it("returns everything with empty filters", () => {
    expect(filterSites(SITES, EMPTY_FILTERS)).toHaveLength(SITES.length);
    expect(filterRoutes(ROUTES, SITES, EMPTY_FILTERS)).toHaveLength(ROUTES.length);
    expect(isFiltered(EMPTY_FILTERS)).toBe(false);
  });

  it("searches name, tagline and themes without accents", () => {
    expect(ids(filterSites(SITES, { ...EMPTY_FILTERS, query: "roman" }))).toEqual(["site-san-roman"]);
    expect(ids(filterSites(SITES, { ...EMPTY_FILTERS, query: "arqueologia" }))).toEqual(["site-vega-baja"]);
    expect(ids(filterSites(SITES, { ...EMPTY_FILTERS, query: "CORONAS votivas" }))).toEqual(["site-guarrazar"]);
    expect(filterSites(SITES, { ...EMPTY_FILTERS, query: "zzz" })).toEqual([]);
  });

  it("filters by locality and theme", () => {
    const guadamur = filterSites(SITES, { ...EMPTY_FILTERS, locality: "Guadamur" });
    expect(guadamur.every((s) => s.locality === "Guadamur")).toBe(true);
    expect(ids(filterSites(SITES, { ...EMPTY_FILTERS, theme: "tesoro" }))).toEqual(["site-guarrazar"]);
    expect(filterSites(SITES, { ...EMPTY_FILTERS, locality: "Toledo", theme: "tesoro" })).toEqual([]);
  });

  it("keeps routes that pass through the locality or match via a stop", () => {
    expect(ids(filterRoutes(ROUTES, SITES, { ...EMPTY_FILTERS, locality: "Guadamur" }))).toEqual(["route-tesoro"]);
    expect(ids(filterRoutes(ROUTES, SITES, { ...EMPTY_FILTERS, query: "vega" }))).toEqual(["route-capital"]);
    expect(ids(filterRoutes(ROUTES, SITES, { ...EMPTY_FILTERS, theme: "tesoro" }))).toEqual(["route-tesoro"]);
  });

  it("lists only themes present in the catalog, in curated order", () => {
    const themes = availableThemes(SITES);
    expect(themes[0]).toBe("capital");
    expect(themes).toContain("arqueología");
    expect(themes.every((t) => SITES.some((s) => s.themes.includes(t)))).toBe(true);
  });
});

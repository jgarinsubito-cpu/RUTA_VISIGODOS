import { describe, expect, it } from "vitest";
import { demoCatalog } from "@/data/content";
import type { Route, Site, Stop } from "./types";
import { tourStopsOf, type TourLookups } from "./tour";
import { validateCatalog } from "./editorial/validate";

const DEMO = demoCatalog();
const SAN_ROMAN = DEMO.sites.find((s) => s.id === "site-san-roman")!;
const GUARRAZAR = DEMO.sites.find((s) => s.id === "site-guarrazar")!;
const CASTILLO = DEMO.sites.find((s) => s.id === "site-castillo-guadamur")!;

function stop(id: string, site: Site, order: number, extra: Partial<Stop> = {}): Stop {
  return { id, siteId: site.id, order, name: `Parada ${order}`, gallery: [], storyIds: [], ...extra };
}

const STOPS: Stop[] = [
  stop("stop-basilica", GUARRAZAR, 1, { coordinates: { lat: 39.8157, lng: -4.1192, approximate: false }, radiusMeters: 20 }),
  stop("stop-hospital", GUARRAZAR, 2),
  stop("stop-agua", GUARRAZAR, 3, { routeOnly: true }),
  stop("stop-nave", SAN_ROMAN, 1, { indoor: true }),
];

function lookups(stops: Stop[]): TourLookups {
  return {
    getSite: (id) => DEMO.sites.find((s) => s.id === id),
    getStop: (id) => stops.find((s) => s.id === id),
    stopsForSite: (siteId) => stops.filter((s) => s.siteId === siteId).sort((a, b) => a.order - b.order),
  };
}

const ROUTE: Route = DEMO.routes.find((r) => r.id === "route-tesoro")!;

describe("tour stops", () => {
  it("visits a place's own stops in order, leaving out stops told only on routes", () => {
    const t = tourStopsOf({ kind: "site", site: GUARRAZAR }, lookups(STOPS));
    expect(t.map((x) => x.id)).toEqual(["stop-basilica", "stop-hospital"]);
    expect(t[0].radius).toBe(20);
    // Without its own point, the second stop shares the place's and is advanced by hand.
    expect(t[1].manualOnly).toBe(true);
    expect(t[1].coordinates).toEqual(GUARRAZAR.coordinates);
  });

  it("treats a place without stops as one stop, as before stops existed", () => {
    const t = tourStopsOf({ kind: "route", route: ROUTE }, lookups([]));
    expect(t.map((x) => x.id)).toEqual(ROUTE.stopIds);
    expect(t.every((x) => x.stop === null && !x.manualOnly)).toBe(true);
  });

  it("expands each place of a route into its stops, and indoor stops are chosen by hand", () => {
    const t = tourStopsOf({ kind: "route", route: ROUTE }, lookups(STOPS));
    expect(t.map((x) => x.id)).toEqual(["stop-nave", "stop-basilica", "stop-hospital", "stop-agua", CASTILLO.id]);
    expect(t[0].manualOnly).toBe(true);
  });

  it("follows the route's own stop list when it has one", () => {
    const t = tourStopsOf({ kind: "route", route: { ...ROUTE, tourStopIds: ["stop-agua", "stop-nave"] } }, lookups(STOPS));
    expect(t.map((x) => x.id)).toEqual(["stop-agua", "stop-nave"]);
  });
});

describe("stop publication rules", () => {
  const errors = (stops: Stop[], routes = DEMO.routes) =>
    validateCatalog({ ...DEMO, stops, routes })
      .filter((i) => i.severity === "error")
      .map((i) => `${i.id}: ${i.message}`);

  it("accepts stops of published places", () => {
    expect(errors(STOPS)).toEqual([]);
  });

  it("refuses a stop of a missing place, a repeated order and an incomplete transcript", () => {
    const bad = [
      stop("stop-x", { ...GUARRAZAR, id: "site-nada" }, 1),
      { ...STOPS[1], order: 1 },
      { ...STOPS[0], audio: { src: "/media/audio/a.mp3", durationSeconds: 60, label: "Locución", transcript: "Hola." } },
    ];
    const e = errors(bad);
    expect(e.some((m) => m.startsWith("stop-x") && m.includes("no existe"))).toBe(true);
    expect(e.some((m) => m.includes("mismo orden"))).toBe(true);
    expect(e.some((m) => m.includes("transcripción"))).toBe(true);
  });

  it("refuses a route tour through a stop whose place is not on the route", () => {
    const route = { ...ROUTE, stopIds: [SAN_ROMAN.id, CASTILLO.id], tourStopIds: ["stop-basilica"] };
    expect(errors(STOPS, [route]).some((m) => m.includes("lugar que no está en la ruta"))).toBe(true);
  });
});

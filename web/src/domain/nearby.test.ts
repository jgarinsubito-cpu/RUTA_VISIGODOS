import { describe, expect, it } from "vitest";
import { getSite } from "@/data/content";
import type { Site } from "./types";
import {
  DEFAULT_NEARBY,
  MIN_GAP_MS,
  REPEAT_MS,
  RURAL_RADIUS_M,
  URBAN_RADIUS_M,
  announceable,
  nearbyRadius,
  nextNearbyAlert,
  pruneNotified,
  stillNear,
  type NearbySettings,
} from "./nearby";

const BASE = getSite("site-san-roman")!;

function place(id: string, over: Partial<Site> = {}): Site {
  return { ...BASE, id, slug: id, name: id, visigothic: true, kind: "monument", coordinates: { lat: 39.86, lng: -4.02, approximate: false }, ...over };
}

/** A point `meters` north of a place. */
function north(site: Site, meters: number, accuracy = 15) {
  return { lat: site.coordinates.lat + meters / 111_195, lng: site.coordinates.lng, accuracy };
}

const ON: NearbySettings = { ...DEFAULT_NEARBY, enabled: true };
const NOW = Date.parse("2026-11-12T12:00:00Z");

describe("zones", () => {
  it("is tight in town and wide in the countryside, wider still when the point is approximate", () => {
    expect(nearbyRadius(place("a"))).toBe(URBAN_RADIUS_M);
    expect(nearbyRadius(place("b", { kind: "archaeological" }))).toBe(RURAL_RADIUS_M);
    expect(nearbyRadius(place("c", { kind: "landscape", coordinates: { lat: 0, lng: 0, approximate: true } }))).toBeGreaterThan(RURAL_RADIUS_M);
  });

  it("never announces services, and follows the visitor's choice of Visigothic or other heritage", () => {
    expect(announceable(place("s", { kind: "service" }), ON)).toBe(false);
    expect(announceable(place("v"), { ...ON, visigothic: false })).toBe(false);
    expect(announceable(place("o", { visigothic: false }), { ...ON, other: false })).toBe(false);
    expect(announceable(place("o", { visigothic: false }), ON)).toBe(true);
    expect(announceable(place("m"), { ...ON, muted: ["m"] })).toBe(false);
  });
});

describe("nextNearbyAlert", () => {
  const a = place("a");
  const b = place("b", { coordinates: { lat: 39.8605, lng: -4.02, approximate: false } });

  it("says nothing while the alerts are off", () => {
    expect(nextNearbyAlert([a], north(a, 50), DEFAULT_NEARBY, NOW, null)).toBeNull();
  });

  it("announces the nearest place in range and counts the others", () => {
    const alert = nextNearbyAlert([a, b], north(a, 20), ON, NOW, null);
    expect(alert?.siteId).toBe("a");
    expect(alert?.others).toBe(1);
    expect(alert?.distance).toBeCloseTo(20, 0);
    expect(alert?.coveredIds).toEqual(["a", "b"]);
  });

  it("counts the places it mentions as announced, so a dense old town gives one alert, not a stream", () => {
    const first = nextNearbyAlert([a, b], north(a, 20), ON, NOW, null)!;
    const notified = Object.fromEntries(first.coveredIds.map((id) => [id, new Date(NOW).toISOString()]));
    expect(nextNearbyAlert([a, b], north(a, 20), { ...ON, notified }, NOW + MIN_GAP_MS, NOW)).toBeNull();
  });

  it("ignores places out of range and fixes less precise than the zone", () => {
    expect(nextNearbyAlert([a], north(a, URBAN_RADIUS_M + 30), ON, NOW, null)).toBeNull();
    expect(nextNearbyAlert([a], north(a, 50, URBAN_RADIUS_M + 1), ON, NOW, null)).toBeNull();
  });

  it("waits between alerts and does not repeat a place too soon", () => {
    expect(nextNearbyAlert([a], north(a, 20), ON, NOW, NOW - MIN_GAP_MS + 1000)).toBeNull();
    const told = { ...ON, notified: { a: new Date(NOW - 60_000).toISOString() } };
    // a was announced a minute ago: the next nearest fresh place is announced instead.
    expect(nextNearbyAlert([a, b], north(a, 20), told, NOW, null)?.siteId).toBe("b");
    expect(nextNearbyAlert([a], north(a, 20), told, NOW, null)).toBeNull();
    expect(nextNearbyAlert([a], north(a, 20), told, NOW + REPEAT_MS, null)?.siteId).toBe("a");
  });

  it("leaves out places the visitor is already looking at", () => {
    expect(nextNearbyAlert([a], north(a, 20), ON, NOW, null, new Set(["a"]))).toBeNull();
  });
});

describe("keeping and clearing", () => {
  const a = place("a");

  it("keeps the alert near the edge and drops it once the visitor has clearly left", () => {
    expect(stillNear(a, north(a, URBAN_RADIUS_M + 50))).toBe(true);
    expect(stillNear(a, north(a, URBAN_RADIUS_M * 2))).toBe(false);
    // A poor fix cannot tell that they left.
    expect(stillNear(a, north(a, URBAN_RADIUS_M * 2, 999))).toBe(true);
  });

  it("forgets announcements once they no longer hold anything back", () => {
    const notified = { old: new Date(NOW - REPEAT_MS - 1).toISOString(), recent: new Date(NOW - 1000).toISOString(), bad: "x" };
    expect(pruneNotified(notified, NOW)).toEqual({ recent: notified.recent });
  });
});

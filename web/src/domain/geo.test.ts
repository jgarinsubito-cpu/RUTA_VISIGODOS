import { describe, expect, it } from "vitest";
import { getSite } from "@/data/content";
import type { Site } from "./types";
import { EXIT_FACTOR, distanceMeters, formatDistance, geofenceRadius, MAX_ACCURACY_M, updateGeofence } from "./geo";

const SAN_ROMAN = getSite("site-san-roman")!;
const CRISTO = getSite("site-cristo-luz")!;
const GUARRAZAR = getSite("site-guarrazar")!;
const STOPS: Site[] = [SAN_ROMAN, CRISTO];

/** A point `meters` north of a site. */
function north(site: Site, meters: number, accuracy = 10) {
  return { lat: site.coordinates.lat + meters / 111_195, lng: site.coordinates.lng, accuracy };
}

describe("distance and formatting", () => {
  it("measures the walk between San Román and the Cristo de la Luz as a few hundred metres", () => {
    const d = distanceMeters(SAN_ROMAN.coordinates, CRISTO.coordinates);
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(380);
  });

  it("formats distances for display", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(44)).toBe("40 m");
    expect(formatDistance(1234)).toBe("1,2 km");
    expect(formatDistance(15_400)).toBe("15 km");
  });

  it("gives open landscapes a wider zone than buildings", () => {
    expect(geofenceRadius(GUARRAZAR)).toBeGreaterThan(geofenceRadius(SAN_ROMAN));
  });
});

describe("updateGeofence", () => {
  it("enters the zone of the stop the visitor is at", () => {
    const u = updateGeofence(STOPS, north(SAN_ROMAN, 5), null);
    expect(u).toEqual({ insideSiteId: SAN_ROMAN.id, entered: SAN_ROMAN.id, exited: null });
  });

  it("stays inside near the edge instead of flickering out", () => {
    const r = geofenceRadius(SAN_ROMAN);
    const u = updateGeofence(STOPS, north(SAN_ROMAN, r * (EXIT_FACTOR - 0.1)), SAN_ROMAN.id);
    expect(u).toEqual({ insideSiteId: SAN_ROMAN.id, entered: null, exited: null });
  });

  it("exits once clearly outside, and does not re-enter on the way out", () => {
    const r = geofenceRadius(SAN_ROMAN);
    const u = updateGeofence(STOPS, north(SAN_ROMAN, r * EXIT_FACTOR + 50), SAN_ROMAN.id);
    expect(u.exited).toBe(SAN_ROMAN.id);
    expect(u.entered).toBeNull();
  });

  it("moves from one stop's zone to the next", () => {
    const u = updateGeofence(STOPS, north(CRISTO, 0), SAN_ROMAN.id);
    expect(u).toEqual({ insideSiteId: CRISTO.id, entered: CRISTO.id, exited: SAN_ROMAN.id });
  });

  it("ignores imprecise fixes", () => {
    const u = updateGeofence(STOPS, north(SAN_ROMAN, 0, MAX_ACCURACY_M + 1), null);
    expect(u).toEqual({ insideSiteId: null, entered: null, exited: null });
  });
});

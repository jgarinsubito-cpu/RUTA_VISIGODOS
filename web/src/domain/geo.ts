/**
 * Geofencing for guided tours: distance to a stop, arrival zones and entry/exit with hysteresis.
 * Pure functions; the browser position comes from lib/useGeolocation and never leaves the device.
 *
 * Catalog coordinates are approximate (demo), so zones are generous and approximate stops get a
 * wider one. Fixes worse than MAX_ACCURACY_M are ignored rather than guessed from.
 */
import type { Coordinates, Site, SiteId } from "./types";
import { haversineKm } from "./travel";

export interface GeoFix {
  lat: number;
  lng: number;
  /** Radius of the 68 % confidence circle, in metres (Geolocation API `accuracy`). */
  accuracy: number;
}

/** Fixes less precise than this cannot place the visitor inside or outside a zone. */
export const MAX_ACCURACY_M = 120;
/** A visitor already inside stays inside until this far out, so the zone edge does not flicker. */
export const EXIT_FACTOR = 1.5;

export function distanceMeters(a: Pick<Coordinates, "lat" | "lng">, b: Pick<Coordinates, "lat" | "lng">): number {
  return haversineKm({ ...a, approximate: false }, { ...b, approximate: false }) * 1000;
}

/** Arrival zone radius: wide for open landscapes and digs, tighter for buildings in town. */
export function geofenceRadius(site: Pick<Site, "kind" | "coordinates">): number {
  const base = site.kind === "landscape" || site.kind === "archaeological" ? 150 : 60;
  return site.coordinates.approximate ? base + 40 : base;
}

export interface FenceUpdate {
  /** Stop whose zone the visitor is in after this fix (null: none). */
  insideSiteId: SiteId | null;
  /** Set only on the fix that enters a zone. */
  entered: SiteId | null;
  /** Set only on the fix that leaves a zone. */
  exited: SiteId | null;
}

/**
 * Evaluate one position against the tour stops. Keeps the previous zone while within
 * EXIT_FACTOR × radius; otherwise the closest stop whose zone contains the fix wins.
 */
export function updateGeofence(stops: Site[], fix: GeoFix, previous: SiteId | null): FenceUpdate {
  const unchanged = { insideSiteId: previous, entered: null, exited: null };
  if (!(fix.accuracy <= MAX_ACCURACY_M)) return unchanged;

  if (previous) {
    const current = stops.find((s) => s.id === previous);
    if (current && distanceMeters(fix, current.coordinates) <= geofenceRadius(current) * EXIT_FACTOR) return unchanged;
  }

  let inside: Site | null = null;
  let best = Infinity;
  for (const stop of stops) {
    const d = distanceMeters(fix, stop.coordinates);
    if (d <= geofenceRadius(stop) && d < best) {
      inside = stop;
      best = d;
    }
  }
  const insideSiteId = inside?.id ?? null;
  return {
    insideSiteId,
    entered: insideSiteId && insideSiteId !== previous ? insideSiteId : null,
    exited: previous && previous !== insideSiteId ? previous : null,
  };
}

/** "0 m", "40 m", "850 m", "1,2 km", "15 km" (Spanish decimal comma). */
export function formatDistance(meters: number): string {
  const m = Math.max(0, meters);
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  const km = m / 1000;
  return km < 10 ? `${km.toFixed(1).replace(".", ",")} km` : `${Math.round(km)} km`;
}

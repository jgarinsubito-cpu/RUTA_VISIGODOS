/**
 * Geofencing for guided tours: distance to a stop, arrival zones and entry/exit with hysteresis.
 * Pure functions; the browser position comes from lib/useGeolocation and never leaves the device.
 *
 * Catalog coordinates are approximate (demo), so zones are generous and approximate stops get a
 * wider one. Fixes worse than MAX_ACCURACY_M are ignored rather than guessed from.
 */
import type { Coordinates, Site } from "./types";
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

/** A tour stop as geofencing sees it: where it is and how wide its arrival zone is. */
export interface FenceZone {
  id: string;
  coordinates: Pick<Coordinates, "lat" | "lng">;
  radius: number;
  /** Not detected automatically (indoors, or no point of its own). */
  manualOnly?: boolean;
}

export interface FenceUpdate {
  /** Stop whose zone the visitor is in after this fix (null: none). */
  insideId: string | null;
  /** Set only on the fix that enters a zone. */
  entered: string | null;
  /** Set only on the fix that leaves a zone. */
  exited: string | null;
}

/**
 * Evaluate one position against the tour stops. Keeps the previous zone while within
 * EXIT_FACTOR × radius; otherwise the closest stop whose zone contains the fix wins.
 */
export function updateGeofence(zones: readonly FenceZone[], fix: GeoFix, previous: string | null): FenceUpdate {
  const unchanged = { insideId: previous, entered: null, exited: null };
  if (!(fix.accuracy <= MAX_ACCURACY_M)) return unchanged;
  const active = zones.filter((z) => !z.manualOnly);

  if (previous) {
    const current = active.find((z) => z.id === previous);
    if (current && distanceMeters(fix, current.coordinates) <= current.radius * EXIT_FACTOR) return unchanged;
  }

  let inside: FenceZone | null = null;
  let best = Infinity;
  for (const zone of active) {
    const d = distanceMeters(fix, zone.coordinates);
    if (d <= zone.radius && d < best) {
      inside = zone;
      best = d;
    }
  }
  const insideId = inside?.id ?? null;
  return {
    insideId,
    entered: insideId && insideId !== previous ? insideId : null,
    exited: previous && previous !== insideId ? previous : null,
  };
}

/** A place as a fence zone (tours of places without stops). */
export function siteZone(site: Site): FenceZone {
  return { id: site.id, coordinates: site.coordinates, radius: geofenceRadius(site) };
}

/** "0 m", "40 m", "850 m", "1,2 km", "15 km" (Spanish decimal comma). */
export function formatDistance(meters: number): string {
  const m = Math.max(0, meters);
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  const km = m / 1000;
  return km < 10 ? `${km.toFixed(1).replace(".", ",")} km` : `${Math.round(km)} km`;
}

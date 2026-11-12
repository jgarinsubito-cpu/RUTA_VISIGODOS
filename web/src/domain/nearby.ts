/**
 * Proximity alerts: tell the visitor, while the app is open, that a place of the route is close.
 * Pure rules over a position and the published places; the position comes from lib/useGeolocation
 * and never leaves the device (the watcher is components/nearby/NearbyWatcher).
 *
 * Different from the guided tour's geofence (geo.ts), which detects *arrival* at a stop: here the
 * zone is wider, so the visitor hears of a place in time to decide whether to go.
 *
 * Restraint rules, so the alerts help rather than nag:
 * - only places of the route (never services: an alert is not an advert);
 * - the visitor chooses which: Visigothic places, other heritage, or both; and can mute a place;
 * - one alert at a time, at least MIN_GAP_MS apart, and the same place not again for REPEAT_MS;
 * - a fix less precise than the zone itself cannot say the visitor is in it, so it is ignored.
 */
import type { Site, SiteId } from "./types";
import { distanceMeters, type GeoFix } from "./geo";

/** In town (museums, monuments): about two or three blocks. */
export const URBAN_RADIUS_M = 250;
/** In the countryside (sites, landscapes): far enough to decide on the turning. */
export const RURAL_RADIUS_M = 1500;
/** Approximate coordinates get a wider zone, as the guided tour does. */
export const APPROXIMATE_EXTRA_M = 100;
/** The alert goes away once the visitor is this many times the radius away. */
export const LEAVE_FACTOR = 1.5;
/** Minimum time between two alerts, so walking through a dense old town is not a stream of them. */
export const MIN_GAP_MS = 90_000;
/** The same place is not announced again within this time. */
export const REPEAT_MS = 6 * 60 * 60 * 1000;

export interface NearbySettings {
  /** The visitor turned the alerts on (they still need the browser's location permission). */
  enabled: boolean;
  /** Announce Visigothic places. */
  visigothic: boolean;
  /** Announce other heritage on the route («Patrimonio no visigodo»). */
  other: boolean;
  /** Places the visitor asked not to hear about again. */
  muted: SiteId[];
  /** When each place was last announced (ISO), to keep REPEAT_MS. */
  notified: Record<SiteId, string>;
}

export const DEFAULT_NEARBY: NearbySettings = { enabled: false, visigothic: true, other: true, muted: [], notified: {} };

export interface NearbyAlert {
  siteId: SiteId;
  /** Metres from the fix that raised it. */
  distance: number;
  /** Other announceable places inside their zones at the same time. */
  others: number;
  /**
   * Places this alert covers: the one announced and the fresh ones it mentions as also close.
   * They count as announced, so standing in a dense old town gives one alert, not one every
   * MIN_GAP_MS for each place around; the next alert is for a place the visitor walks up to.
   */
  coveredIds: SiteId[];
}

/** Zone of a place for proximity alerts: wide in the countryside, tight in town. */
export function nearbyRadius(site: Pick<Site, "kind" | "coordinates">): number {
  const base = site.kind === "archaeological" || site.kind === "landscape" ? RURAL_RADIUS_M : URBAN_RADIUS_M;
  return site.coordinates.approximate ? base + APPROXIMATE_EXTRA_M : base;
}

/** Places this visitor wants to hear about (services never). */
export function announceable(site: Site, settings: Pick<NearbySettings, "visigothic" | "other" | "muted">): boolean {
  if (site.kind === "service") return false;
  if (settings.muted.includes(site.id)) return false;
  return site.visigothic ? settings.visigothic : settings.other;
}

/** Announceable places whose zone contains the fix (with an accurate enough fix), nearest first. */
export function placesInRange(
  sites: readonly Site[],
  fix: GeoFix,
  settings: Pick<NearbySettings, "visigothic" | "other" | "muted">,
): { site: Site; distance: number }[] {
  return sites
    .filter((s) => announceable(s, settings))
    .map((site) => ({ site, distance: distanceMeters(fix, site.coordinates), radius: nearbyRadius(site) }))
    .filter(({ distance, radius }) => fix.accuracy <= radius && distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .map(({ site, distance }) => ({ site, distance }));
}

/**
 * The alert to show for this fix, or null. `lastAlertAt` is when the previous alert was shown
 * (ms); `exclude` holds places the visitor is already looking at (e.g. a tour of it is open).
 */
export function nextNearbyAlert(
  sites: readonly Site[],
  fix: GeoFix,
  settings: NearbySettings,
  now: number,
  lastAlertAt: number | null,
  exclude: ReadonlySet<SiteId> = new Set(),
): NearbyAlert | null {
  if (!settings.enabled || !Number.isFinite(fix.accuracy)) return null;
  if (lastAlertAt !== null && now - lastAlertAt < MIN_GAP_MS) return null;
  const inRange = placesInRange(sites, fix, settings).filter(({ site }) => !exclude.has(site.id));
  const isFresh = ({ site }: { site: Site }) => {
    const last = settings.notified[site.id];
    return !last || now - Date.parse(last) >= REPEAT_MS;
  };
  const fresh = inRange.filter(isFresh);
  const first = fresh[0];
  if (!first) return null;
  return { siteId: first.site.id, distance: first.distance, others: inRange.length - 1, coveredIds: fresh.map(({ site }) => site.id) };
}

/** Whether a shown alert still applies: false once the visitor has clearly moved away. */
export function stillNear(site: Pick<Site, "kind" | "coordinates">, fix: GeoFix): boolean {
  if (fix.accuracy > nearbyRadius(site)) return true; // A poor fix cannot say they left.
  return distanceMeters(fix, site.coordinates) <= nearbyRadius(site) * LEAVE_FACTOR;
}

/** Drop announcement records older than REPEAT_MS (they no longer hold anything back). */
export function pruneNotified(notified: Record<SiteId, string>, now: number): Record<SiteId, string> {
  const out: Record<SiteId, string> = {};
  for (const [id, at] of Object.entries(notified)) {
    const t = Date.parse(at);
    if (Number.isFinite(t) && now - t < REPEAT_MS) out[id] = at;
  }
  return out;
}

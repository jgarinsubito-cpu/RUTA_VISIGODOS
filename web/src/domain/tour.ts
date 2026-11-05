/**
 * What a guided tour goes through: a route (its places, stop by stop) or the stops of one place.
 * A place without stops counts as one stop, so tours of catalogs published before stops existed
 * behave as before. Pure: content lookups are passed in.
 */
import { geofenceRadius } from "./geo";
import type { Coordinates, Route, Site, SiteId, Stop, StopId } from "./types";

export interface TourStop {
  /** Stop id, or the place id for a place without stops. */
  id: string;
  site: Site;
  /** null when the place has no stops. */
  stop: Stop | null;
  name: string;
  coordinates: Coordinates;
  /** Arrival zone radius in metres. */
  radius: number;
  /** No automatic arrival: indoors, or a stop without its own coordinates in a place with several. */
  manualOnly: boolean;
}

export interface TourLookups {
  getSite(id: SiteId): Site | undefined;
  getStop(id: StopId): Stop | undefined;
  stopsForSite(siteId: SiteId): readonly Stop[];
}

export type TourSource = { kind: "route"; route: Route } | { kind: "site"; site: Site };

export function toTourStop(site: Site, stop: Stop | null, siblings: number): TourStop {
  if (!stop) {
    return { id: site.id, site, stop: null, name: site.name, coordinates: site.coordinates, radius: geofenceRadius(site), manualOnly: false };
  }
  const coordinates = stop.coordinates ?? site.coordinates;
  return {
    id: stop.id,
    site,
    stop,
    name: stop.name,
    coordinates,
    radius: stop.radiusMeters ?? geofenceRadius({ kind: site.kind, coordinates }),
    // Without its own point, a stop shares the place's: only usable when it is the place's only stop.
    manualOnly: Boolean(stop.indoor) || (!stop.coordinates && siblings > 1),
  };
}

export function tourStopsOf(source: TourSource, lookups: TourLookups): TourStop[] {
  if (source.kind === "site") {
    const stops = lookups.stopsForSite(source.site.id).filter((s) => !s.routeOnly);
    return stops.length === 0 ? [toTourStop(source.site, null, 0)] : stops.map((s) => toTourStop(source.site, s, stops.length));
  }
  const { route } = source;
  if (route.tourStopIds?.length) {
    return route.tourStopIds.flatMap((id) => {
      const stop = lookups.getStop(id);
      const site = stop && lookups.getSite(stop.siteId);
      return stop && site ? [toTourStop(site, stop, visitStops(lookups, site.id))] : [];
    });
  }
  return route.stopIds.flatMap((siteId) => {
    const site = lookups.getSite(siteId);
    if (!site) return [];
    const stops = lookups.stopsForSite(siteId);
    return stops.length === 0 ? [toTourStop(site, null, 0)] : stops.map((s) => toTourStop(site, s, visitStops(lookups, site.id)));
  });
}

/** How many stops a place's own visit has (stops told only on routes do not count). */
function visitStops(lookups: TourLookups, siteId: SiteId): number {
  return lookups.stopsForSite(siteId).filter((s) => !s.routeOnly).length;
}

import type { Coordinates, Site } from "@/domain/types";

/**
 * Google Maps directions to a place: to its exact point when the coordinates are field-verified
 * (a stop in a dig, a ruin in the fields), else by name and address, since approximate
 * coordinates could lead to the wrong spot.
 */
export function directionsUrl(site: Pick<Site, "name" | "address" | "locality"> & { coordinates?: Coordinates }): string {
  const c = site.coordinates;
  const destination = c && !c.approximate ? `${c.lat},${c.lng}` : [site.name, site.address ?? site.locality].join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

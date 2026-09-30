import type { Site } from "@/domain/types";

/** Google Maps directions to a place, by name and address (catalog coordinates are only approximate). */
export function directionsUrl(site: Pick<Site, "name" | "address" | "locality">): string {
  const destination = [site.name, site.address ?? site.locality].join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

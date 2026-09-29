import type { SiteId } from "@/domain/types";

export interface MapViewProps {
  /** Sites to show as markers. */
  siteIds: SiteId[];
  /** Ordered trip stops: numbered markers joined by a polyline. */
  tripSiteIds?: SiteId[];
  selectedSiteId?: SiteId | null;
  onSelect?(siteId: SiteId): void;
  className?: string;
}

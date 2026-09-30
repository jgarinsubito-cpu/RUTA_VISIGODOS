/**
 * Marker grouping for the map: at low zoom, places a few pixels apart become one "N lugares"
 * marker that zooms in when chosen. Pure, in screen pixels, so it is independent of Leaflet.
 */
export interface ScreenPoint {
  id: string;
  x: number;
  y: number;
}

/** Closer than this (in px) and two markers overlap enough to hide each other. */
export const CLUSTER_RADIUS_PX = 36;

/**
 * Greedy grouping in input order: each point joins the first group whose first point is within
 * `radius`; otherwise it starts a new group. Stable for the same input, O(n²) for small n.
 */
export function groupPoints(points: ScreenPoint[], radius = CLUSTER_RADIUS_PX): ScreenPoint[][] {
  const groups: ScreenPoint[][] = [];
  const r2 = radius * radius;
  for (const p of points) {
    const group = groups.find(([seed]) => (seed.x - p.x) ** 2 + (seed.y - p.y) ** 2 <= r2);
    if (group) group.push(p);
    else groups.push([p]);
  }
  return groups;
}

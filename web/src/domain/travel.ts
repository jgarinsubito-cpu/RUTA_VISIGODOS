/**
 * Travel-time estimates for the planner.
 *
 * PLACEHOLDER: straight-line (haversine) distance multiplied by a detour factor and divided by a
 * nominal speed. It is NOT a routing result and every value is flagged `approximate: true`.
 * PLAN.md ("Planner design") requires real route travel times; replace `estimateTravelProvider`
 * with a routing-provider implementation of `TravelTimeProvider` when one is integrated.
 */
import type { Coordinates, TransportMode } from "./types";

export interface TravelEstimate {
  minutes: number;
  approximate: true;
}

/** Seam for a real routing provider (walking network, road network, parking). */
export interface TravelTimeProvider {
  /** Estimated distance along the network, in km. */
  distanceKm(from: Coordinates, to: Coordinates, mode: TransportMode): number;
  minutes(from: Coordinates, to: Coordinates, mode: TransportMode): TravelEstimate;
}

const EARTH_RADIUS_KM = 6371;
const DETOUR: Record<TransportMode, number> = { walk: 1.3, car: 1.4 };
const SPEED_KMH: Record<TransportMode, number> = { walk: 4.5, car: 40 };
/** Parking / getting in and out of the car. */
const CAR_TRANSITION_MIN = 10;
/** Floor between two distinct sites, however close. */
const MIN_LEG_MIN = 5;

/** Great-circle distance in km. */
export function haversineKm(from: Coordinates, to: Coordinates): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(to.lat - from.lat);
  const dLng = rad(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Estimated network distance: straight line times a mode-specific detour factor. */
export function estimateDistanceKm(from: Coordinates, to: Coordinates, mode: TransportMode): number {
  return haversineKm(from, to) * DETOUR[mode];
}

/** Minutes between two distinct sites (never below MIN_LEG_MIN). */
export function estimateTravelMinutes(from: Coordinates, to: Coordinates, mode: TransportMode): TravelEstimate {
  const km = estimateDistanceKm(from, to, mode);
  let minutes = (km / SPEED_KMH[mode]) * 60;
  if (mode === "car") minutes += CAR_TRANSITION_MIN;
  return { minutes: Math.max(MIN_LEG_MIN, Math.ceil(minutes)), approximate: true };
}

/** Default provider used by the planner until a routing provider exists. */
export const estimateTravelProvider: TravelTimeProvider = {
  distanceKm: estimateDistanceKm,
  minutes: estimateTravelMinutes,
};

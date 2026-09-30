/**
 * Deterministic itinerary planner (PLAN.md, "Planner design").
 * Pure functions only: no React, no storage, no network. The language model never decides
 * feasibility; these functions do. Every mutation is returned as a proposal that the visitor accepts.
 *
 * CONTRACT — signatures are consumed by src/state/store.ts. Every propose* returns an
 * ItineraryProposal carrying the resulting context and route, and functions accept an optional
 * PlannerOptions last argument so tests and future repositories can inject sites and travel.
 * Stop warnings are structured (StopWarning); domain/warnings.ts renders them.
 */
import { getSite as contentGetSite } from "@/data/content";
import { estimateTravelProvider, type TravelTimeProvider } from "./travel";
import { isoWeekday, parseClock } from "./time";
import { describeWarning, WARN_TRAVEL_ESTIMATE } from "./warnings";
import type { ItineraryProposal, Route, Site, SiteId, StopWarning, TimeWindow, Trip, TripContext, TripStop } from "./types";

export { formatClock, isoWeekday, parseClock } from "./time";
export {
  WARN_ACCESS,
  WARN_EXAMPLE_HOURS,
  WARN_NO_DATE,
  WARN_TRAVEL_ESTIMATE,
  WARN_UNKNOWN_HOURS,
} from "./warnings";

/** Kept for callers written before proposals carried context and route. */
export type PlannerProposal = ItineraryProposal;

export interface PlannerOptions {
  getSite?: (id: SiteId) => Site | undefined;
  travel?: TravelTimeProvider;
}

export interface ScheduleResult {
  stops: TripStop[];
  /** Trip-wide notes; each stop carries its own structured warnings. */
  warnings: string[];
  ok: boolean;
  reason?: string;
}

/** Buffer between the end of one visit and leaving for the next stop. */
export const BUFFER_MINUTES = 10;
/** Longest walking leg accepted before suggesting the car. */
export const MAX_WALK_KM = 6;

export function emptyTrip(context: TripContext): Trip {
  return { id: "trip-local", revision: 0, context, stops: [], updatedAt: new Date(0).toISOString() };
}

function addUnique(list: string[], item: string) {
  if (!list.includes(item)) list.push(item);
}

function addWarning(list: StopWarning[], w: StopWarning) {
  if (!list.some((x) => x.code === w.code)) list.push(w);
}

/**
 * Earliest start inside the day's windows such that the whole visit fits, or the warning that
 * explains why it does not (worded conditionally when the hours are not verified).
 */
function fitInWindows(site: Site, windows: TimeWindow[], arrival: number, weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7): number | StopWarning {
  const verified = site.hours.status === "verified";
  if (windows.length === 0) return { code: "closed-day", weekday, verified };
  const parsed = windows.map((w) => ({ open: parseClock(w.open), close: parseClock(w.close) })).sort((a, b) => a.open - b.open);
  for (const w of parsed) {
    const start = Math.max(arrival, w.open);
    if (start + site.visitMinutes <= w.close) return start;
  }
  const pending = parsed.filter((w) => w.close > arrival);
  if (pending.length === 0) return { code: "closed-on-arrival", close: parsed[parsed.length - 1].close, arrival, verified };
  return { code: "no-time", close: pending[pending.length - 1].close, verified };
}

/** Warning for a stop where the visitor arrives before the site opens. */
export function waitWarning(start: number, verified: boolean): string {
  return describeWarning({ code: "wait", until: start, verified }, "");
}

/** Recompute arrivals/departures/warnings for an ordered list of site IDs under a context. */
export function schedule(siteIds: SiteId[], context: TripContext, options: PlannerOptions = {}): ScheduleResult {
  const lookup = options.getSite ?? contentGetSite;
  const travel = options.travel ?? estimateTravelProvider;
  const stops: TripStop[] = [];
  const warnings: string[] = [];
  let reason: string | undefined;
  const fail = (r: string) => {
    if (!reason) reason = r;
  };

  const seen = new Set<SiteId>();
  for (const id of siteIds) {
    if (seen.has(id)) {
      const name = lookup(id)?.name ?? id;
      return { stops: [], warnings: [], ok: false, reason: `${name} aparece repetido en el viaje` };
    }
    seen.add(id);
  }
  const sites: Site[] = [];
  for (const id of siteIds) {
    const site = lookup(id);
    if (!site) return { stops: [], warnings: [], ok: false, reason: `Lugar desconocido: ${id}` };
    sites.push(site);
  }

  const weekday = context.date ? isoWeekday(context.date) : null;
  if (context.date && weekday === null) fail(`Fecha no válida: ${context.date}`);
  const endTime = parseClock(context.endTime);
  let clock = parseClock(context.startTime);
  let prev: Site | null = null;

  for (const site of sites) {
    const stopWarnings: StopWarning[] = [];
    let travelMinutes = 0;
    let arrival = clock;
    if (prev) {
      const km = travel.distanceKm(prev.coordinates, site.coordinates, context.transport);
      if (context.transport === "walk" && km > MAX_WALK_KM) {
        fail(`De ${prev.name} a ${site.name} hay unos ${Math.round(km)} km: demasiado para ir a pie. Prueba en coche.`);
        addWarning(stopWarnings, { code: "too-far-walk", km: Math.round(km * 10) / 10 });
      }
      travelMinutes = travel.minutes(prev.coordinates, site.coordinates, context.transport).minutes;
      arrival = clock + BUFFER_MINUTES + travelMinutes;
      addUnique(warnings, WARN_TRAVEL_ESTIMATE);
    }

    let start = arrival;
    let provisional = false;
    const { hours } = site;
    if (hours.status === "example") {
      provisional = true;
      addWarning(stopWarnings, { code: "example-hours" });
    } else if (hours.status === "unknown") {
      provisional = true;
      addWarning(stopWarnings, { code: "unknown-hours" });
    }
    if (!hours.alwaysOpen && hours.weekly) {
      if (weekday === null) {
        provisional = true;
        addWarning(stopWarnings, { code: "no-date" });
      } else {
        const fit = fitInWindows(site, hours.weekly[weekday] ?? [], arrival, weekday);
        if (typeof fit === "number") {
          start = fit;
          if (start > arrival) {
            provisional = true;
            addWarning(stopWarnings, { code: "wait", until: start, verified: hours.status === "verified" });
          }
        } else {
          fail(describeWarning(fit, site.name));
          addWarning(stopWarnings, fit);
        }
      }
    }
    if (context.stepFreeRequired && (site.access.status !== "verified" || !site.access.stepFree)) {
      provisional = true;
      addWarning(stopWarnings, { code: "access-unverified" });
    }

    const departure = start + site.visitMinutes;
    if (departure > endTime) {
      const w: StopWarning = { code: "past-end", departure, endTime: context.endTime };
      fail(describeWarning(w, site.name));
      addWarning(stopWarnings, w);
    }

    stops.push({
      siteId: site.id,
      arrival,
      visitStart: start,
      departure,
      travelMinutesFromPrevious: travelMinutes,
      status: provisional ? "provisional" : "scheduled",
      warnings: stopWarnings,
    });
    clock = departure;
    prev = site;
  }

  return reason ? { stops, warnings, ok: false, reason } : { stops, warnings, ok: true };
}

function totalTravel(stops: TripStop[]): number {
  return stops.reduce((sum, s) => sum + s.travelMinutesFromPrevious, 0);
}

function proposal(
  trip: Trip,
  context: TripContext,
  result: ScheduleResult,
  extraWarnings: string[] = [],
  routeId?: Route["id"],
): ItineraryProposal {
  const beforeIds = new Set(trip.stops.map((s) => s.siteId));
  const afterIds = new Set(result.stops.map((s) => s.siteId));
  const p: ItineraryProposal = {
    ok: result.ok,
    baseRevision: trip.revision,
    before: trip.stops,
    after: result.stops,
    added: result.stops.filter((s) => !beforeIds.has(s.siteId)).map((s) => s.siteId),
    removed: trip.stops.filter((s) => !afterIds.has(s.siteId)).map((s) => s.siteId),
    warnings: [...extraWarnings, ...result.warnings],
    context,
  };
  if (result.reason) p.reason = result.reason;
  if (routeId) p.routeId = routeId;
  return p;
}

function rejected(trip: Trip, reason: string): ItineraryProposal {
  return {
    ok: false,
    reason,
    baseRevision: trip.revision,
    before: trip.stops,
    after: trip.stops,
    added: [],
    removed: [],
    warnings: [],
    context: trip.context,
  };
}

/** Insert a site at the feasible position with least total travel (ties go to the end). */
export function proposeAdd(trip: Trip, siteId: SiteId, options: PlannerOptions = {}): ItineraryProposal {
  const ids = trip.stops.map((s) => s.siteId);
  if (ids.includes(siteId)) return rejected(trip, "Ya está en tu viaje");
  if (!(options.getSite ?? contentGetSite)(siteId)) return rejected(trip, `Lugar desconocido: ${siteId}`);

  const append = schedule([...ids, siteId], trip.context, options);
  let best: ScheduleResult | null = append.ok ? append : null;
  for (let i = ids.length - 1; i >= 0; i--) {
    const candidate = schedule([...ids.slice(0, i), siteId, ...ids.slice(i)], trip.context, options);
    if (!candidate.ok) continue;
    if (!best || totalTravel(candidate.stops) < totalTravel(best.stops)) best = candidate;
  }
  return proposal(trip, trip.context, best ?? append);
}

export function proposeRemove(trip: Trip, siteId: SiteId, options: PlannerOptions = {}): ItineraryProposal {
  const ids = trip.stops.map((s) => s.siteId);
  if (!ids.includes(siteId)) return rejected(trip, "No está en tu viaje");
  return proposal(trip, trip.context, schedule(ids.filter((id) => id !== siteId), trip.context, options));
}

/** Move a stop to `toIndex` (clamped) and revalidate the whole remainder. */
export function proposeMove(trip: Trip, siteId: SiteId, toIndex: number, options: PlannerOptions = {}): ItineraryProposal {
  const ids = trip.stops.map((s) => s.siteId);
  const from = ids.indexOf(siteId);
  if (from < 0) return rejected(trip, "No está en tu viaje");
  const rest = ids.filter((id) => id !== siteId);
  const target = Math.max(0, Math.min(rest.length, Math.trunc(toIndex)));
  rest.splice(target, 0, siteId);
  return proposal(trip, trip.context, schedule(rest, trip.context, options));
}

/** Replace the trip with a curated route; the route's transport mode becomes the trip's. */
export function proposeFromRoute(trip: Trip, route: Route, options: PlannerOptions = {}): ItineraryProposal {
  const context: TripContext = { ...trip.context, transport: route.transport };
  const extra: string[] = [];
  if (route.transport !== trip.context.transport) {
    extra.push(`Transporte cambiado a ${route.transport === "car" ? "coche" : "a pie"} para seguir la ruta «${route.name}»`);
  }
  if (trip.stops.length > 0) extra.push("La ruta sustituye las paradas actuales de tu viaje");
  return proposal(trip, context, schedule(route.stopIds, context, options), extra, route.id);
}

/** Re-run scheduling after the context (date, times, transport) changes. */
export function reschedule(trip: Trip, context: TripContext, options: PlannerOptions = {}): ItineraryProposal {
  return proposal(trip, context, schedule(trip.stops.map((s) => s.siteId), context, options));
}

/** Apply an accepted proposal. Rejects stale proposals (baseRevision !== trip.revision). */
export function applyProposal(trip: Trip, proposal: ItineraryProposal, nowIso: string): Trip | { error: "stale" | "invalid" } {
  if (proposal.baseRevision !== trip.revision) return { error: "stale" };
  if (!proposal.ok) return { error: "invalid" };
  return {
    ...trip,
    revision: trip.revision + 1,
    updatedAt: nowIso,
    stops: proposal.after,
    context: proposal.context,
    sourceRouteId: proposal.routeId ?? trip.sourceRouteId,
  };
}

/** Neutral day for route estimates: no date (so no waiting for opening) and no time limit. */
const ESTIMATE_CONTEXT: Omit<TripContext, "transport"> = {
  area: "Toledo y Guadamur",
  date: null,
  startTime: "00:00",
  endTime: "23:59",
  profile: "general",
  stepFreeRequired: false,
};

export interface RouteEstimate {
  /** From the start of the first visit to the end of the last one, travel and buffers included. */
  minutes: number;
  /** Stops as scheduled on the neutral day (travel legs are estimates). */
  stops: TripStop[];
}

/**
 * Route duration from the same scheduler as the trip, so the route page, the tour, the assistant
 * and Mi viaje agree. Opening hours are not applied (no date): the route is not on a day yet.
 */
export function estimateRoute(route: Route, options: PlannerOptions = {}): RouteEstimate {
  const { stops } = schedule(route.stopIds, { ...ESTIMATE_CONTEXT, transport: route.transport }, options);
  const minutes = stops.length > 0 ? stops[stops.length - 1].departure - stops[0].arrival : 0;
  return { minutes, stops };
}

export function routeMinutes(route: Route, options: PlannerOptions = {}): number {
  return estimateRoute(route, options).minutes;
}

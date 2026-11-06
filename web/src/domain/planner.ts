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
import { getService as contentGetService, getSite as contentGetSite } from "@/data/content";
import { estimateTravelProvider, type TravelTimeProvider } from "./travel";
import { isoWeekday, parseClock } from "./time";
import { describeWarning, WARN_TRAVEL_ESTIMATE } from "./warnings";
import type {
  Coordinates,
  ItineraryProposal,
  Route,
  Service,
  ServiceId,
  Site,
  SiteId,
  StopWarning,
  TimeWindow,
  Trip,
  TripBreak,
  TripContext,
  TripService,
  TripStop,
} from "./types";

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
  getService?: (id: ServiceId) => Service | undefined;
  travel?: TravelTimeProvider;
}

/** A stop of a multi-day plan: which place, on which day (from 0). */
export interface PlanEntry {
  siteId: SiteId;
  day: number;
}

export interface ScheduleResult {
  stops: TripStop[];
  /** Lunch breaks kept in the days (only with context.lunchBreak or a chosen restaurant). */
  breaks: TripBreak[];
  /** Trip-wide notes; each stop carries its own structured warnings. */
  warnings: string[];
  ok: boolean;
  reason?: string;
}

/** Buffer between the end of one visit and leaving for the next stop. */
export const BUFFER_MINUTES = 10;
/** Longest walking leg accepted before suggesting the car. */
export const MAX_WALK_KM = 6;
/** Lunch: not before 13:00, starting at 15:00 at the latest (Spanish lunch hours). */
export const LUNCH_FROM = 13 * 60;
export const LUNCH_LATEST_START = 15 * 60;
/** A lunch break without a chosen restaurant, and one at a sit-down restaurant. */
export const LUNCH_MINUTES = 60;
export const RESTAURANT_LUNCH_MINUTES = 75;
/** Longest trip the planner organises. */
export const MAX_DAYS = 4;

/** Days of the trip (1 when unset). */
export function tripDays(context: TripContext): number {
  return Math.max(1, Math.min(MAX_DAYS, Math.trunc(context.days ?? 1)));
}

/** "2026-12-15" + 1 → "2026-12-16" (calendar arithmetic in UTC, safe across DST). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function emptyTrip(context: TripContext): Trip {
  return { id: "trip-local", revision: 0, context, stops: [], updatedAt: new Date(0).toISOString() };
}

/** The trip's stops as plan entries, in order. */
export function planOf(trip: Trip): PlanEntry[] {
  return trip.stops.map((s) => ({ siteId: s.siteId, day: s.day ?? 0 }));
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

/** Recompute arrivals/departures/warnings for an ordered list of site IDs under a context (one day). */
export function schedule(siteIds: SiteId[], context: TripContext, options: PlannerOptions = {}): ScheduleResult {
  return schedulePlan(
    siteIds.map((siteId) => ({ siteId, day: 0 })),
    context,
    [],
    options,
  );
}

/**
 * Schedule a plan over its days. Every day runs from context.startTime to context.endTime; it
 * starts from the lodging chosen for the night before, when there is one. With a lunch break
 * (context.lunchBreak, or a restaurant chosen for that day) the day keeps a pause between 13:00
 * and 15:00 at the restaurant, or wherever the visitor is.
 */
export function schedulePlan(entries: PlanEntry[], context: TripContext, services: readonly TripService[] = [], options: PlannerOptions = {}): ScheduleResult {
  const lookup = options.getSite ?? contentGetSite;
  const findService = options.getService ?? contentGetService;
  const travel = options.travel ?? estimateTravelProvider;
  const stops: TripStop[] = [];
  const breaks: TripBreak[] = [];
  const warnings: string[] = [];
  let reason: string | undefined;
  const fail = (r: string) => {
    if (!reason) reason = r;
  };

  const seen = new Set<SiteId>();
  for (const { siteId } of entries) {
    if (seen.has(siteId)) {
      const name = lookup(siteId)?.name ?? siteId;
      return { stops: [], breaks: [], warnings: [], ok: false, reason: `${name} aparece repetido en el viaje` };
    }
    seen.add(siteId);
  }
  const days = tripDays(context);
  const byDay: Site[][] = Array.from({ length: days }, () => []);
  for (const { siteId, day } of entries) {
    const site = lookup(siteId);
    if (!site) return { stops: [], breaks: [], warnings: [], ok: false, reason: `Lugar desconocido: ${siteId}` };
    byDay[Math.max(0, Math.min(days - 1, Math.trunc(day)))].push(site);
  }
  if (context.date && isoWeekday(context.date) === null) fail(`Fecha no válida: ${context.date}`);
  const endTime = parseClock(context.endTime);
  const chosen = (day: number, slot: TripService["slot"]) => {
    const pick = services.find((s) => s.day === day && s.slot === slot);
    return pick ? findService(pick.serviceId) : undefined;
  };

  for (let day = 0; day < days; day++) {
    const weekday = context.date ? isoWeekday(addDays(context.date, day)) : null;
    let clock = parseClock(context.startTime);
    // Where the day starts: the lodging of the night before, if one was chosen.
    const lodging = day > 0 ? chosen(day - 1, "overnight") : undefined;
    let prev: { name: string; coordinates: Coordinates } | null = lodging ? { name: lodging.name, coordinates: lodging.coordinates } : null;
    let travelledYet = false;
    const restaurant = chosen(day, "lunch");
    let lunchPending = Boolean(context.lunchBreak || restaurant) && byDay[day].length > 0;

    const placeLunch = () => {
      lunchPending = false;
      let travelMinutes = 0;
      let start = clock;
      if (restaurant && prev) {
        travelMinutes = travel.minutes(prev.coordinates, restaurant.coordinates, context.transport).minutes;
        start = clock + BUFFER_MINUTES + travelMinutes;
        addUnique(warnings, WARN_TRAVEL_ESTIMATE);
      }
      start = Math.max(start, LUNCH_FROM);
      const end = start + (restaurant ? RESTAURANT_LUNCH_MINUTES : LUNCH_MINUTES);
      breaks.push({ day, kind: "lunch", start, end, travelMinutesFromPrevious: travelMinutes, ...(restaurant ? { serviceId: restaurant.id } : {}) });
      clock = end;
      if (restaurant) prev = { name: restaurant.name, coordinates: restaurant.coordinates };
    };

    for (const site of byDay[day]) {
      if (lunchPending && clock >= LUNCH_FROM && clock <= LUNCH_LATEST_START) placeLunch();
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
        // Leaving a visit or a restaurant takes a moment; leaving the hotel in the morning does not.
        arrival = clock + (travelledYet || breaks.some((b) => b.day === day) ? BUFFER_MINUTES : 0) + travelMinutes;
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
        ...(day > 0 ? { day } : {}),
      });
      clock = departure;
      prev = { name: site.name, coordinates: site.coordinates };
      travelledYet = true;
    }
    // The visits ended before lunch: keep the pause after them if the day is still long enough.
    if (lunchPending && clock <= LUNCH_LATEST_START && Math.max(clock, LUNCH_FROM) + LUNCH_MINUTES <= endTime) placeLunch();
  }

  return reason ? { stops, breaks, warnings, ok: false, reason } : { stops, breaks, warnings, ok: true };
}

function totalTravel(result: ScheduleResult): number {
  return result.stops.reduce((sum, s) => sum + s.travelMinutesFromPrevious, 0) + result.breaks.reduce((sum, b) => sum + b.travelMinutesFromPrevious, 0);
}

/** Services that still fit the trip: their day exists and, for the night, a next day exists. */
function servicesFor(services: readonly TripService[], context: TripContext): TripService[] {
  const days = tripDays(context);
  return services.filter((s) => s.day < days && (s.slot !== "overnight" || s.day < days - 1));
}

function proposal(
  trip: Trip,
  context: TripContext,
  result: ScheduleResult,
  extraWarnings: string[] = [],
  routeId?: Route["id"],
  services?: TripService[],
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
  if (result.breaks.length || trip.breaks?.length) p.breaks = result.breaks;
  if (services) p.services = services;
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

/** Schedule `entries` with the trip's chosen services (dropping those whose day is gone). */
function replan(trip: Trip, entries: PlanEntry[], context: TripContext, options: PlannerOptions, extra: string[] = [], routeId?: Route["id"]): ItineraryProposal {
  const kept = servicesFor(trip.services ?? [], context);
  const result = schedulePlan(entries, context, kept, options);
  const changed = kept.length !== (trip.services ?? []).length;
  return proposal(trip, context, result, extra, routeId, changed ? kept : undefined);
}

/** Insert a site at the feasible position with least total travel (ties go to the end). */
export function proposeAdd(trip: Trip, siteId: SiteId, options: PlannerOptions = {}): ItineraryProposal {
  const plan = planOf(trip);
  if (plan.some((e) => e.siteId === siteId)) return rejected(trip, "Ya está en tu viaje");
  if (!(options.getSite ?? contentGetSite)(siteId)) return rejected(trip, `Lugar desconocido: ${siteId}`);
  const services = servicesFor(trip.services ?? [], trip.context);
  // A new stop joins the day of the stop before it (the first day when it goes first).
  const at = (i: number): PlanEntry[] => [...plan.slice(0, i), { siteId, day: plan[i - 1]?.day ?? plan[0]?.day ?? 0 }, ...plan.slice(i)];

  const append = schedulePlan(at(plan.length), trip.context, services, options);
  let best: ScheduleResult | null = append.ok ? append : null;
  for (let i = plan.length - 1; i >= 0; i--) {
    const candidate = schedulePlan(at(i), trip.context, services, options);
    if (!candidate.ok) continue;
    if (!best || totalTravel(candidate) < totalTravel(best)) best = candidate;
  }
  return proposal(trip, trip.context, best ?? append);
}

export function proposeRemove(trip: Trip, siteId: SiteId, options: PlannerOptions = {}): ItineraryProposal {
  const plan = planOf(trip);
  if (!plan.some((e) => e.siteId === siteId)) return rejected(trip, "No está en tu viaje");
  return replan(
    trip,
    plan.filter((e) => e.siteId !== siteId),
    trip.context,
    options,
  );
}

/** Move a stop to `toIndex` (clamped) and revalidate the whole remainder; it joins the day of the stop before it. */
export function proposeMove(trip: Trip, siteId: SiteId, toIndex: number, options: PlannerOptions = {}): ItineraryProposal {
  const plan = planOf(trip);
  const from = plan.findIndex((e) => e.siteId === siteId);
  if (from < 0) return rejected(trip, "No está en tu viaje");
  const rest = plan.filter((e) => e.siteId !== siteId);
  const target = Math.max(0, Math.min(rest.length, Math.trunc(toIndex)));
  const day = target > 0 ? rest[target - 1].day : (rest[0]?.day ?? plan[from].day);
  // Moving within the same day keeps the day; crossing into another day adopts it.
  const sameDayNeighbour = rest[target]?.day === plan[from].day || rest[target - 1]?.day === plan[from].day;
  rest.splice(target, 0, { siteId, day: sameDayNeighbour ? plan[from].day : day });
  rest.sort((a, b) => a.day - b.day);
  return replan(trip, rest, trip.context, options);
}

/** Move a stop to another day (at the end of that day). */
export function proposeMoveToDay(trip: Trip, siteId: SiteId, day: number, options: PlannerOptions = {}): ItineraryProposal {
  const plan = planOf(trip);
  const entry = plan.find((e) => e.siteId === siteId);
  if (!entry) return rejected(trip, "No está en tu viaje");
  const target = Math.max(0, Math.min(tripDays(trip.context) - 1, Math.trunc(day)));
  if (entry.day === target) return rejected(trip, "Ya está en ese día");
  const rest = plan.filter((e) => e.siteId !== siteId);
  const lastOfDay = rest.reduce((idx, e, i) => (e.day <= target ? i + 1 : idx), 0);
  rest.splice(lastOfDay, 0, { siteId, day: target });
  return replan(trip, rest, trip.context, options);
}

/** Replace the trip with a curated route; the route's transport mode becomes the trip's. */
export function proposeFromRoute(trip: Trip, route: Route, options: PlannerOptions = {}): ItineraryProposal {
  const context: TripContext = { ...trip.context, transport: route.transport };
  const extra: string[] = [];
  if (route.transport !== trip.context.transport) {
    extra.push(`Transporte cambiado a ${route.transport === "car" ? "coche" : "a pie"} para seguir la ruta «${route.name}»`);
  }
  if (trip.stops.length > 0) extra.push("La ruta sustituye las paradas actuales de tu viaje");
  return replan(
    trip,
    route.stopIds.map((siteId) => ({ siteId, day: 0 })),
    context,
    options,
    extra,
    route.id,
  );
}

/** Replace the trip with a plan over several days (the tailored, theme-based planner). */
export function proposePlan(trip: Trip, entries: PlanEntry[], context: TripContext, extra: string[] = [], options: PlannerOptions = {}): ItineraryProposal {
  if (trip.stops.length > 0) extra = [...extra, "Este recorrido sustituye las paradas actuales de tu viaje"];
  return replan(trip, entries, context, options, extra);
}

/** Re-run scheduling after the context (date, times, transport, days) changes. */
export function reschedule(trip: Trip, context: TripContext, options: PlannerOptions = {}): ItineraryProposal {
  const last = tripDays(context) - 1;
  const plan = planOf(trip);
  const extra = plan.some((e) => e.day > last) ? [`Las paradas de los días que se quitan pasan al día ${last + 1}`] : [];
  return replan(
    trip,
    plan.map((e) => ({ ...e, day: Math.min(e.day, last) })),
    context,
    options,
    extra,
  );
}

/**
 * Choose (or, with `serviceId` null, remove) the service for a slot of a day. The schedule is
 * recomputed: a restaurant moves the lunch break there, a lodging moves where the next day starts.
 */
export function proposeService(
  trip: Trip,
  choice: { day: number; slot: TripService["slot"]; serviceId: ServiceId | null },
  options: PlannerOptions = {},
): ItineraryProposal {
  const findService = options.getService ?? contentGetService;
  const days = tripDays(trip.context);
  if (choice.day < 0 || choice.day >= days) return rejected(trip, "Ese día no está en tu viaje");
  if (choice.slot === "overnight" && choice.day >= days - 1) return rejected(trip, "La última noche no hace falta alojamiento en el plan");
  if (choice.serviceId && !findService(choice.serviceId)) return rejected(trip, "Servicio desconocido");
  const current = trip.services ?? [];
  let services: TripService[];
  if (choice.slot === "activity") {
    // Activities add up; choosing one already in that day takes it out.
    if (!choice.serviceId) return rejected(trip, "Indica qué actividad");
    const same = (s: TripService) => s.slot === "activity" && s.day === choice.day && s.serviceId === choice.serviceId;
    services = current.some(same) ? current.filter((s) => !same(s)) : [...current, { day: choice.day, slot: "activity", serviceId: choice.serviceId }];
  } else {
    // One lunch, one lodging and one car per day.
    const others = current.filter((s) => !(s.slot === choice.slot && s.day === choice.day));
    if (!choice.serviceId && others.length === current.length) return rejected(trip, "No había nada elegido");
    services = choice.serviceId ? [...others, { day: choice.day, slot: choice.slot, serviceId: choice.serviceId }] : others;
  }
  const result = schedulePlan(planOf(trip), trip.context, services, options);
  return proposal(trip, trip.context, result, [], undefined, services);
}

/** Apply an accepted proposal. Rejects stale proposals (baseRevision !== trip.revision). */
export function applyProposal(trip: Trip, proposal: ItineraryProposal, nowIso: string): Trip | { error: "stale" | "invalid" } {
  if (proposal.baseRevision !== trip.revision) return { error: "stale" };
  if (!proposal.ok) return { error: "invalid" };
  const next: Trip = {
    ...trip,
    revision: trip.revision + 1,
    updatedAt: nowIso,
    stops: proposal.after,
    context: proposal.context,
    sourceRouteId: proposal.routeId ?? trip.sourceRouteId,
  };
  if (proposal.breaks) next.breaks = proposal.breaks;
  if (proposal.services) next.services = proposal.services;
  if (next.breaks && next.breaks.length === 0) delete next.breaks;
  if (next.services && next.services.length === 0) delete next.services;
  return next;
}

/**
 * Neutral day for route estimates: no date (so no waiting for opening) and no time limit. The
 * planner never reads the area.
 */
const ESTIMATE_CONTEXT: Omit<TripContext, "transport"> = {
  area: "",
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

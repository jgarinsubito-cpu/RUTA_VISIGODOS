/**
 * Deterministic itinerary planner (PLAN.md, "Planner design").
 * Pure functions only: no React, no storage, no network. The language model never decides
 * feasibility; these functions do. Every mutation is returned as a proposal that the visitor accepts.
 *
 * CONTRACT — signatures are consumed by src/state/store.ts and must not change.
 * Additive extensions: every propose* returns a PlannerProposal (an ItineraryProposal that also
 * carries the resulting context and route), and functions accept an optional PlannerOptions last
 * argument so tests and future repositories can inject sites and travel providers.
 */
import { getSite as catalogGetSite } from "@/data/catalog";
import { estimateTravelProvider, type TravelTimeProvider } from "./travel";
import type { ItineraryProposal, Route, RouteId, Site, SiteId, TimeWindow, Trip, TripContext, TripStop } from "./types";

/** Proposal plus what applyProposal needs beyond the stops. */
export interface PlannerProposal extends ItineraryProposal {
  /** Context the `after` schedule was computed with; becomes trip.context on accept. */
  context: TripContext;
  /** Set when the proposal replaces the trip with a curated route. */
  routeId?: RouteId;
}

export interface PlannerOptions {
  getSite?: (id: SiteId) => Site | undefined;
  travel?: TravelTimeProvider;
}

export interface ScheduleResult {
  stops: TripStop[];
  warnings: string[];
  ok: boolean;
  reason?: string;
}

/** Buffer between the end of one visit and leaving for the next stop. */
export const BUFFER_MINUTES = 10;
/** Longest walking leg accepted before suggesting the car. */
export const MAX_WALK_KM = 6;

export const WARN_NO_DATE = "Elige una fecha para comprobar horarios";
export const WARN_EXAMPLE_HOURS = "Horario de ejemplo (no verificado)";
export const WARN_UNKNOWN_HOURS = "Horario sin verificar";
export const WARN_ACCESS = "Accesibilidad sin verificar";
export const WARN_TRAVEL_ESTIMATE = "Tiempos de desplazamiento aproximados (estimación, no ruta real)";

const WEEKDAY_NAMES = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"];

export function emptyTrip(context: TripContext): Trip {
  return { id: "trip-local", revision: 0, context, stops: [], updatedAt: new Date(0).toISOString() };
}

/**
 * ISO weekday (1 = Monday … 7 = Sunday) of a local Europe/Madrid calendar date "YYYY-MM-DD".
 * Computed purely on the calendar date (UTC arithmetic at noon), so DST changes and the
 * runtime's own time zone cannot shift the day. Returns null for malformed dates.
 */
export function isoWeekday(date: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d, 12));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  const js = dt.getUTCDay();
  return (js === 0 ? 7 : js) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

function addUnique(list: string[], item: string) {
  if (!list.includes(item)) list.push(item);
}

/**
 * Earliest start inside the day's windows such that the whole visit fits.
 * Returns the start minute, or a Spanish reason naming the site. Reasons based on hours that are
 * not verified are phrased conditionally and say so: placeholder data is never stated as fact.
 */
function fitInWindows(site: Site, windows: TimeWindow[], arrival: number, weekday: number): number | { reason: string } {
  const verified = site.hours.status === "verified";
  const qualify = (fact: string, conditional: string) =>
    verified ? fact : `Según el horario de ejemplo (no verificado), ${conditional}`;
  if (windows.length === 0) {
    return { reason: qualify(`${site.name} cierra los ${WEEKDAY_NAMES[weekday]}`, `${site.name} cerraría los ${WEEKDAY_NAMES[weekday]}`) };
  }
  const parsed = windows.map((w) => ({ open: parseClock(w.open), close: parseClock(w.close) })).sort((a, b) => a.open - b.open);
  for (const w of parsed) {
    const start = Math.max(arrival, w.open);
    if (start + site.visitMinutes <= w.close) return start;
  }
  const pending = parsed.filter((w) => w.close > arrival);
  if (pending.length === 0) {
    const close = formatClock(parsed[parsed.length - 1].close);
    return {
      reason: qualify(
        `${site.name} cierra a las ${close} y ya estará cerrado al llegar (${formatClock(arrival)})`,
        `${site.name} cerraría a las ${close} y ya estaría cerrado al llegar (${formatClock(arrival)})`,
      ),
    };
  }
  const close = formatClock(pending[pending.length - 1].close);
  return {
    reason: qualify(
      `${site.name} cierra a las ${close} y no da tiempo a la visita`,
      `${site.name} cerraría a las ${close} y no daría tiempo a la visita`,
    ),
  };
}

/** Warning for a stop where the visitor arrives before the site opens. */
export function waitWarning(start: number, verified: boolean): string {
  return `Espera hasta las ${formatClock(start)} (${verified ? "abre a esa hora" : "abriría a esa hora según el horario de ejemplo"})`;
}

/** Recompute arrivals/departures/warnings for an ordered list of site IDs under a context. */
export function schedule(siteIds: SiteId[], context: TripContext, options: PlannerOptions = {}): ScheduleResult {
  const lookup = options.getSite ?? catalogGetSite;
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
    const stopWarnings: string[] = [];
    let travelMinutes = 0;
    let arrival = clock;
    if (prev) {
      const km = travel.distanceKm(prev.coordinates, site.coordinates, context.transport);
      if (context.transport === "walk" && km > MAX_WALK_KM) {
        fail(`De ${prev.name} a ${site.name} hay unos ${Math.round(km)} km: demasiado para ir a pie. Prueba en coche.`);
        addUnique(stopWarnings, "Demasiado lejos para ir a pie");
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
      addUnique(stopWarnings, WARN_EXAMPLE_HOURS);
    } else if (hours.status === "unknown") {
      provisional = true;
      addUnique(stopWarnings, WARN_UNKNOWN_HOURS);
    }
    if (!hours.alwaysOpen && hours.weekly) {
      if (weekday === null) {
        provisional = true;
        addUnique(stopWarnings, WARN_NO_DATE);
      } else {
        const fit = fitInWindows(site, hours.weekly[weekday] ?? [], arrival, weekday);
        if (typeof fit === "number") {
          start = fit;
          if (start > arrival) {
            provisional = true;
            addUnique(stopWarnings, waitWarning(start, hours.status === "verified"));
          }
        } else {
          fail(fit.reason);
          addUnique(stopWarnings, fit.reason);
        }
      }
    }
    if (context.stepFreeRequired && (site.access.status !== "verified" || !site.access.stepFree)) {
      provisional = true;
      addUnique(stopWarnings, WARN_ACCESS);
    }

    const departure = start + site.visitMinutes;
    if (departure > endTime) {
      const r = `La visita a ${site.name} terminaría a las ${formatClock(departure)}, después de tu hora de fin (${context.endTime})`;
      fail(r);
      addUnique(stopWarnings, r);
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
    for (const w of stopWarnings) addUnique(warnings, `${site.name}: ${w}`);
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
  routeId?: RouteId,
): PlannerProposal {
  const beforeIds = new Set(trip.stops.map((s) => s.siteId));
  const afterIds = new Set(result.stops.map((s) => s.siteId));
  const p: PlannerProposal = {
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

function rejected(trip: Trip, reason: string): PlannerProposal {
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
export function proposeAdd(trip: Trip, siteId: SiteId, options: PlannerOptions = {}): PlannerProposal {
  const ids = trip.stops.map((s) => s.siteId);
  if (ids.includes(siteId)) return rejected(trip, "Ya está en tu viaje");
  if (!(options.getSite ?? catalogGetSite)(siteId)) return rejected(trip, `Lugar desconocido: ${siteId}`);

  const append = schedule([...ids, siteId], trip.context, options);
  let best: ScheduleResult | null = append.ok ? append : null;
  for (let i = ids.length - 1; i >= 0; i--) {
    const candidate = schedule([...ids.slice(0, i), siteId, ...ids.slice(i)], trip.context, options);
    if (!candidate.ok) continue;
    if (!best || totalTravel(candidate.stops) < totalTravel(best.stops)) best = candidate;
  }
  return proposal(trip, trip.context, best ?? append);
}

export function proposeRemove(trip: Trip, siteId: SiteId, options: PlannerOptions = {}): PlannerProposal {
  const ids = trip.stops.map((s) => s.siteId);
  if (!ids.includes(siteId)) return rejected(trip, "No está en tu viaje");
  return proposal(trip, trip.context, schedule(ids.filter((id) => id !== siteId), trip.context, options));
}

/** Move a stop to `toIndex` (clamped) and revalidate the whole remainder. */
export function proposeMove(trip: Trip, siteId: SiteId, toIndex: number, options: PlannerOptions = {}): PlannerProposal {
  const ids = trip.stops.map((s) => s.siteId);
  const from = ids.indexOf(siteId);
  if (from < 0) return rejected(trip, "No está en tu viaje");
  const rest = ids.filter((id) => id !== siteId);
  const target = Math.max(0, Math.min(rest.length, Math.trunc(toIndex)));
  rest.splice(target, 0, siteId);
  return proposal(trip, trip.context, schedule(rest, trip.context, options));
}

/** Replace the trip with a curated route; the route's transport mode becomes the trip's. */
export function proposeFromRoute(trip: Trip, route: Route, options: PlannerOptions = {}): PlannerProposal {
  const context: TripContext = { ...trip.context, transport: route.transport };
  const extra: string[] = [];
  if (route.transport !== trip.context.transport) {
    extra.push(`Transporte cambiado a ${route.transport === "car" ? "coche" : "a pie"} para seguir la ruta «${route.name}»`);
  }
  if (trip.stops.length > 0) extra.push("La ruta sustituye las paradas actuales de tu viaje");
  return proposal(trip, context, schedule(route.stopIds, context, options), extra, route.id);
}

/** Re-run scheduling after the context (date, times, transport) changes. */
export function reschedule(trip: Trip, context: TripContext, options: PlannerOptions = {}): PlannerProposal {
  return proposal(trip, context, schedule(trip.stops.map((s) => s.siteId), context, options));
}

/** Apply an accepted proposal. Rejects stale proposals (baseRevision !== trip.revision). */
export function applyProposal(trip: Trip, proposal: ItineraryProposal, nowIso: string): Trip | { error: "stale" | "invalid" } {
  if (proposal.baseRevision !== trip.revision) return { error: "stale" };
  if (!proposal.ok) return { error: "invalid" };
  const extended = proposal as Partial<PlannerProposal>;
  return {
    ...trip,
    revision: trip.revision + 1,
    updatedAt: nowIso,
    stops: proposal.after,
    context: extended.context ?? trip.context,
    sourceRouteId: extended.routeId ?? trip.sourceRouteId,
  };
}

export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseClock(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

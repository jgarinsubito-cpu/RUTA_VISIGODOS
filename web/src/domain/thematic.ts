/**
 * Tailored, theme-based trip (definición funcional §3, "ruta a medida"): the visitor picks themes,
 * days, where they start, transport, pace and profile; the planner composes the places in an order
 * that keeps the story and saves travel:
 *
 *  1. places whose themes match (all Visigothic places when no theme is picked);
 *  2. grouped by town (a visit "nucleus"), starting in the visitor's town, then the nearest town;
 *  3. inside a town, by `narrativeOrder` (the museum that introduces the period first), then the
 *     nearest place;
 *  4. spread over the days without exceeding the pace's visiting time, with a lunch break;
 *  5. non-Visigothic heritage (when asked for) only fills the time left, each where it adds the
 *     least travel, so it never pushes a Visigothic place out.
 * A place that does not fit any day (closed that day, too far for the time left) is reported,
 * never silently dropped.
 *
 * Pure: the result is a plan for proposePlan(), which the visitor reviews before anything changes.
 */
import { sites as contentSites } from "@/data/content";
import { schedulePlan, addDays, MAX_DAYS, type PlanEntry, type PlannerOptions } from "./planner";
import { parseClock } from "./time";
import { estimateTravelProvider } from "./travel";
import type { Coordinates, Locality, Site, SiteId, TravelPace, TripContext } from "./types";

export interface ThematicRequest {
  /** Themes of the showcase; empty: every place. */
  themes: string[];
  days: number;
  /** Town where the visitor starts each day (where they stay). */
  start: Locality;
  /** Also include non-Visigothic heritage that matches the themes (labelled as such). */
  includeOther: boolean;
  pace: TravelPace;
  /** Date, hours, transport, profile and step-free needs. */
  context: TripContext;
}

export interface ThematicPlan {
  entries: PlanEntry[];
  /** The context the plan was made for: days set, lunch break on. */
  context: TripContext;
  /** Places that match but could not be placed, with the reason. */
  leftovers: { siteId: SiteId; reason: string }[];
  /** How many places matched the themes. */
  matched: number;
}

/** Most visiting and travel time per day for each pace, in minutes (the full pace uses the whole day). */
export const PACE_MINUTES: Record<TravelPace, number | null> = { relaxed: 5 * 60, balanced: 7 * 60, full: null };

export interface ThematicOptions extends PlannerOptions {
  sites?: readonly Site[];
}

function centroid(list: readonly Site[]): Coordinates {
  const lat = list.reduce((s, x) => s + x.coordinates.lat, 0) / list.length;
  const lng = list.reduce((s, x) => s + x.coordinates.lng, 0) / list.length;
  return { lat, lng, approximate: true };
}

/** Places matching the request, in story-and-distance order. */
export function orderForThemes(req: ThematicRequest, options: ThematicOptions = {}): Site[] {
  const travel = options.travel ?? estimateTravelProvider;
  const all = options.sites ?? contentSites();
  const wanted = new Set(req.themes);
  const matches = all.filter(
    (s) => s.kind !== "service" && (s.visigothic || req.includeOther) && (wanted.size === 0 || s.themes.some((t) => wanted.has(t))),
  );
  if (matches.length === 0) return [];

  const byTown = new Map<string, Site[]>();
  for (const s of matches) byTown.set(s.locality, [...(byTown.get(s.locality) ?? []), s]);

  // Towns: the starting town first, then always the nearest one not yet visited.
  const towns = [...byTown.keys()];
  const order: string[] = [];
  let here: Coordinates = byTown.has(req.start) ? centroid(byTown.get(req.start)!) : centroid(all.filter((s) => s.locality === req.start).length ? all.filter((s) => s.locality === req.start) : matches);
  while (order.length < towns.length) {
    const left = towns.filter((t) => !order.includes(t));
    const next =
      left.includes(req.start) && order.length === 0
        ? req.start
        : left.reduce((best, t) => (travel.distanceKm(here, centroid(byTown.get(t)!), req.context.transport) < travel.distanceKm(here, centroid(byTown.get(best)!), req.context.transport) ? t : best));
    order.push(next);
    here = centroid(byTown.get(next)!);
  }

  // Inside a town: places with a place in the story first (lowest number), then the nearest.
  const result: Site[] = [];
  let at: Coordinates | null = null;
  for (const town of order) {
    const list = [...byTown.get(town)!];
    const ranked = list.filter((s) => s.narrativeOrder !== undefined).sort((a, b) => a.narrativeOrder! - b.narrativeOrder!);
    const free = list.filter((s) => s.narrativeOrder === undefined);
    for (const s of ranked) {
      result.push(s);
      at = s.coordinates;
    }
    while (free.length) {
      const from: Coordinates = at ?? centroid(free);
      free.sort((a, b) => travel.distanceKm(from, a.coordinates, req.context.transport) - travel.distanceKm(from, b.coordinates, req.context.transport));
      const next = free.shift()!;
      result.push(next);
      at = next.coordinates;
    }
  }
  return result;
}

/** Compose the plan: order the matching places and spread them over the days. */
export function composeThematicPlan(req: ThematicRequest, options: ThematicOptions = {}): ThematicPlan {
  const days = Math.max(1, Math.min(MAX_DAYS, Math.trunc(req.days)));
  const context: TripContext = { ...req.context, days, lunchBreak: true };
  const ordered = orderForThemes(req, options);
  const lookup = new Map((options.sites ?? contentSites()).map((s) => [s.id, s]));
  const plannerOptions: PlannerOptions = { getSite: options.getSite ?? ((id) => lookup.get(id)), travel: options.travel, getService: options.getService };
  const window = parseClock(context.endTime) - parseClock(context.startTime);
  const cap = Math.min(window, PACE_MINUTES[req.pace] ?? window);

  const dayLists: SiteId[][] = Array.from({ length: days }, () => []);
  const leftovers: ThematicPlan["leftovers"] = [];

  /** Does `ids` work as one day (opening hours that day, time, the pace's limit)? With its travel time. */
  const fits = (ids: SiteId[], day: number): { ok: boolean; reason?: string; travel: number } => {
    const oneDay: TripContext = { ...context, days: 1, date: context.date ? addDays(context.date, day) : null };
    const r = schedulePlan(
      ids.map((siteId) => ({ siteId, day: 0 })),
      oneDay,
      [],
      plannerOptions,
    );
    const travel = r.stops.reduce((n, x) => n + x.travelMinutesFromPrevious, 0) + r.breaks.reduce((n, b) => n + b.travelMinutesFromPrevious, 0);
    if (!r.ok) return { ok: false, reason: r.reason, travel };
    const first = r.stops[0];
    const last = r.stops[r.stops.length - 1];
    const lunch = r.breaks.reduce((n, b) => n + (b.end - b.start), 0);
    const busy = last.departure - first.arrival - lunch;
    return busy <= cap ? { ok: true, travel } : { ok: false, reason: "No cabe en el ritmo elegido", travel };
  };

  const primary = ordered.filter((s) => s.visigothic);
  const secondary = ordered.filter((s) => !s.visigothic);

  let day = 0;
  for (const site of primary) {
    let placed = false;
    // Try the current day, then the following ones (a place closed today may fit tomorrow).
    for (let d = day; d < days && !placed; d++) {
      const attempt = fits([...dayLists[d], site.id], d);
      if (attempt.ok) {
        dayLists[d].push(site.id);
        placed = true;
        day = d;
      } else if (dayLists[d].length === 0 && d === days - 1) {
        leftovers.push({ siteId: site.id, reason: attempt.reason ?? "No cabe en los días elegidos" });
      }
    }
    if (!placed && !leftovers.some((l) => l.siteId === site.id)) leftovers.push({ siteId: site.id, reason: "No cabe en los días elegidos" });
  }

  // The rest fills the gaps: each where it adds the least travel.
  for (const site of secondary) {
    let best: { day: number; at: number; extra: number } | null = null;
    for (let d = 0; d < days; d++) {
      const base = dayLists[d].length ? fits(dayLists[d], d).travel : 0;
      for (let at = 0; at <= dayLists[d].length; at++) {
        const candidate = [...dayLists[d].slice(0, at), site.id, ...dayLists[d].slice(at)];
        const attempt = fits(candidate, d);
        if (attempt.ok && (!best || attempt.travel - base < best.extra)) best = { day: d, at, extra: attempt.travel - base };
      }
    }
    if (best) dayLists[best.day].splice(best.at, 0, site.id);
    else leftovers.push({ siteId: site.id, reason: "No cabe en los días elegidos" });
  }

  return {
    entries: dayLists.flatMap((ids, d) => ids.map((siteId) => ({ siteId, day: d }))),
    context,
    leftovers,
    matched: ordered.length,
  };
}

/**
 * Complementary services in the trip (definición funcional §4.3): for each day, where to eat when
 * the lunch break comes, where to sleep before the next day, a rental car on the first day, the
 * guided visits and experiences of the day's places, and other services near them.
 *
 * Order (public, Reglamento (UE) 2019/1150 — see RANKING_CRITERIA):
 *  1. linked to a place of that day;
 *  2. open at that time according to its checked hours (unknown hours go after; closed ones are left out);
 *  3. suited to the visitor (families, step-free access) when they asked for it;
 *  4. distance to where the visitor will be.
 * Sponsorship and joining the network never change the order; sponsored services are labelled.
 *
 * Pure: no React, no storage. Operational data is shown with the date it was last checked.
 */
import { getSite as contentGetSite, services as contentServices } from "@/data/content";
import { addDays, tripDays } from "./planner";
import { isoWeekday, parseClock } from "./time";
import { estimateTravelProvider, type TravelTimeProvider } from "./travel";
import type { Coordinates, Service, ServiceCategory, ServiceSlot, Site, SiteId, Trip, TripStop } from "./types";

/** The criteria, in order, as the app explains them to visitors and businesses. */
export const RANKING_CRITERIA = [
  "Primero, los servicios vinculados a un lugar de tu recorrido de ese día (la visita guiada del yacimiento, el restaurante junto a él).",
  "Después, los que según su horario comprobado abren a la hora en que los necesitas. Los que no tienen horario comprobado van detrás y los cerrados no aparecen.",
  "Si viajas en familia o necesitas acceso sin escalones, antes los que lo cumplen.",
  "Por último, la distancia a donde estarás en ese momento.",
  "Patrocinar o estar adherido a la red no cambia este orden. Lo patrocinado se rotula como tal.",
] as const;

/** Data older than this is shown with a warning. */
export const STALE_DAYS = 90;

export interface ServiceSuggestion {
  service: Service;
  /** Why it appears here, in plain words. */
  reasons: string[];
  km: number;
  /** Open at that time by its checked hours; null: no checked hours or no date. */
  open: boolean | null;
  /** Data checked more than STALE_DAYS ago, or never. */
  stale: boolean;
}

export interface SlotSuggestions {
  slot: ServiceSlot;
  /** Where the visitor will be, in words ("después de Yacimiento de Guarrazar"). */
  where: string;
  /** Minutes from midnight when the service is needed (null: any time). */
  time: number | null;
  options: ServiceSuggestion[];
}

export interface DayServices {
  day: number;
  /** Date of that day, when the trip has one. */
  date: string | null;
  lunch?: SlotSuggestions;
  overnight?: SlotSuggestions;
  car?: SlotSuggestions;
  activities: ServiceSuggestion[];
  /** Cafés, parking, tourist offices, shops near the day's places. */
  nearby: ServiceSuggestion[];
}

export interface SuggestOptions {
  services?: readonly Service[];
  getSite?: (id: SiteId) => Site | undefined;
  travel?: TravelTimeProvider;
  /** Options per slot (default 3). */
  limit?: number;
  /** "Today" for staleness (tests). */
  now?: number;
}

const NEARBY: ServiceCategory[] = ["cafe", "parking", "tourist-office", "shop", "transport"];
/** Farthest restaurant offered for lunch from where the visitor is: a short drive, or a short walk. */
export const LUNCH_MAX_KM: Record<Trip["context"]["transport"], number> = { car: 10, walk: 1.5 };
/** How far "near the day's places" reaches. */
const NEARBY_KM = 1.5;

export function isStale(service: Service, now = Date.now()): boolean {
  if (service.demo) return false;
  if (!service.checkedOn) return true;
  return now - Date.parse(`${service.checkedOn}T12:00:00Z`) > STALE_DAYS * 86_400_000;
}

/** Open at `time` on `date` by its checked hours: true/false, or null when it cannot be said. */
export function openAt(service: Service, date: string | null, time: number | null): boolean | null {
  const { hours } = service;
  if (hours.status !== "verified") return null;
  if (hours.alwaysOpen) return true;
  if (!date || time === null || !hours.weekly) return null;
  const weekday = isoWeekday(date);
  if (!weekday) return null;
  return (hours.weekly[weekday] ?? []).some((w) => parseClock(w.open) <= time && time < parseClock(w.close));
}

interface RankContext {
  near: Coordinates;
  date: string | null;
  time: number | null;
  linked: ReadonlySet<SiteId>;
  family: boolean;
  stepFree: boolean;
  transport: Trip["context"]["transport"];
  travel: TravelTimeProvider;
  siteName: (id: SiteId) => string;
  now: number;
}

/** Rank services by the public criteria; closed ones are left out. */
export function rankServices(list: readonly Service[], ctx: RankContext): ServiceSuggestion[] {
  const scored = list
    .map((service) => {
      const open = openAt(service, ctx.date, ctx.time);
      const linkedTo = service.siteIds.filter((id) => ctx.linked.has(id));
      const fitsVisitor = (!ctx.family || service.familyFriendly === true) && (!ctx.stepFree || (service.access.status === "verified" && service.access.stepFree === true));
      const km = ctx.travel.distanceKm(ctx.near, service.coordinates, ctx.transport);
      const reasons: string[] = [];
      if (linkedTo.length) reasons.push(`Vinculado a ${linkedTo.map(ctx.siteName).join(" y ")}`);
      if (open === true) reasons.push("Abierto a esa hora según su horario comprobado");
      if (ctx.family && service.familyFriendly) reasons.push("Adecuado para familias");
      if (ctx.stepFree && service.access.status === "verified" && service.access.stepFree) reasons.push("Acceso sin escalones comprobado");
      reasons.push(km < 1 ? `A ${Math.max(100, Math.round(km * 10) * 100)} m` : `A unos ${km.toFixed(1).replace(".", ",")} km`);
      return { service, reasons, km, open, stale: isStale(service, ctx.now), linked: linkedTo.length > 0, fitsVisitor };
    })
    .filter((x) => x.open !== false);
  scored.sort(
    (a, b) =>
      Number(b.linked) - Number(a.linked) ||
      Number(b.open === true) - Number(a.open === true) ||
      Number(b.fitsVisitor) - Number(a.fitsVisitor) ||
      a.km - b.km ||
      a.service.name.localeCompare(b.service.name, "es"),
  );
  return scored.map(({ service, reasons, km, open, stale }) => ({ service, reasons, km, open, stale }));
}

/** Stops of one day, in order. */
function stopsOfDay(trip: Trip, day: number): TripStop[] {
  return trip.stops.filter((s) => (s.day ?? 0) === day);
}

/** Suggestions for every day of the trip. Days without places get none. */
export function suggestForTrip(trip: Trip, options: SuggestOptions = {}): DayServices[] {
  const all = options.services ?? contentServices();
  const getSite = options.getSite ?? contentGetSite;
  const travel = options.travel ?? estimateTravelProvider;
  const limit = options.limit ?? 3;
  const now = options.now ?? Date.now();
  const { context } = trip;
  const days = tripDays(context);
  const of = (cats: ServiceCategory[]) => all.filter((s) => cats.includes(s.category));
  const siteName = (id: SiteId) => getSite(id)?.name ?? id;
  const base = { family: context.profile === "family", stepFree: context.stepFreeRequired, transport: context.transport, travel, siteName, now };
  const result: DayServices[] = [];

  for (let day = 0; day < days; day++) {
    const stops = stopsOfDay(trip, day);
    const date = context.date ? addDays(context.date, day) : null;
    const entry: DayServices = { day, date, activities: [], nearby: [] };
    result.push(entry);
    if (stops.length === 0) continue;
    const sitesOfDay = stops.map((s) => getSite(s.siteId)).filter((s): s is Site => Boolean(s));
    const linked = new Set(sitesOfDay.map((s) => s.id));

    // Lunch: where the visitor is when the break comes (or around 13:30 without a planned break).
    const lunchBreak = trip.breaks?.find((b) => b.day === day && b.kind === "lunch");
    const lunchTime = lunchBreak ? lunchBreak.start : 13 * 60 + 30;
    const dayStart = parseClock(context.startTime);
    const dayEnd = parseClock(context.endTime);
    if (dayStart < 15 * 60 && dayEnd > 13 * 60) {
      const beforeIndex = stops.findLastIndex((s) => s.departure <= lunchTime);
      const before = stops[Math.max(0, beforeIndex)];
      const after = stops[beforeIndex + 1];
      const site = getSite(before.siteId);
      if (site) {
        // "Linked" here means linked to the places around lunch, not to any place of the day.
        const around = new Set([before.siteId, ...(after ? [after.siteId] : [])]);
        const reachable = of(["restaurant"]).filter((r) => travel.distanceKm(site.coordinates, r.coordinates, context.transport) <= LUNCH_MAX_KM[context.transport]);
        entry.lunch = {
          slot: "lunch",
          where: beforeIndex < 0 ? `cerca de ${site.name}` : `después de ${site.name}`,
          time: lunchTime,
          options: rankServices(reachable, { ...base, near: site.coordinates, date, time: lunchTime, linked: around }).slice(0, limit),
        };
      }
    }

    // The night after this day: near where the next day starts.
    if (day < days - 1) {
      const next = stopsOfDay(trip, day + 1)[0] ?? stops[stops.length - 1];
      const site = getSite(next.siteId);
      if (site) {
        entry.overnight = {
          slot: "overnight",
          where: `para empezar el día ${day + 2} en ${site.locality}`,
          time: null,
          options: rankServices(of(["lodging"]), { ...base, near: site.coordinates, date: null, time: null, linked: new Set() }).slice(0, limit),
        };
      }
    }

    // A car for the trip, picked up where the first day starts.
    if (day === 0 && context.transport === "car") {
      const site = sitesOfDay[0];
      entry.car = {
        slot: "car",
        where: `para el recorrido, cerca de ${site.locality}`,
        time: dayStart,
        options: rankServices(of(["car-rental"]), { ...base, near: site.coordinates, date, time: dayStart, linked: new Set() }).slice(0, limit),
      };
    }

    // Guided visits and experiences of the day's places, each measured from its own place, in the day's order.
    entry.activities = sitesOfDay
      .flatMap((site) =>
        rankServices(
          of(["guided-visit", "experience"]).filter((s) => s.siteIds.includes(site.id)),
          { ...base, near: site.coordinates, date, time: null, linked },
        ),
      )
      .filter((s, i, list) => list.findIndex((x) => x.service.id === s.service.id) === i)
      .slice(0, limit * 2);

    // Other services near any of the day's places.
    const near = of(NEARBY).filter((s) => sitesOfDay.some((site) => travel.distanceKm(site.coordinates, s.coordinates, "walk") <= NEARBY_KM));
    entry.nearby = rankServices(near, { ...base, near: sitesOfDay[0].coordinates, date, time: null, linked }).slice(0, limit * 2);
  }
  return result;
}

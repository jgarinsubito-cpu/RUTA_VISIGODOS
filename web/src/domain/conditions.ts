/**
 * Trip conditions: the weather and traffic around a planned trip, and the assistant's advice on
 * them (docs/AVISOS-VIAJE.md). Pure: the server fetches AEMET and DGT (lib/conditions-server.ts),
 * these functions read what came back and judge it against the trip.
 *
 * - Weather (AEMET municipal forecasts): rain, storms, heat, frost and gusts at the hours the trip
 *   spends at each outdoor place. Museums count as indoors.
 * - Traffic (DGT DATEX II incidents): works, accidents, closures near the trip's places on its days.
 * - Rain gets a proposal when a different order (or day) keeps the outdoor places drier. As any trip
 *   change, it goes to the review dialog and only applies if the visitor accepts it.
 *
 * Operational data, not heritage claims: shown with its source and time, never as certain.
 */
import { addDays, proposePlan } from "./planner";
import { distanceMeters } from "./geo";
import type { ItineraryProposal, Site, SiteId, Trip, TripStop } from "./types";

/* ------------------------------------------------------------------ data shapes */

/** A stretch of a day with its forecast. Minutes from midnight, local time; `to` may be 1440. */
export interface WeatherWindow {
  from: number;
  to: number;
  precipProb?: number;
  stormProb?: number;
}

export interface WeatherDay {
  locality: string;
  /** YYYY-MM-DD */
  date: string;
  /** Finest available: hourly-forecast windows (6 h) when the day is close, else the daily periods. */
  windows: WeatherWindow[];
  tMax?: number;
  tMin?: number;
  /** Strongest gust forecast for the day, km/h. */
  gustMax?: number;
  /** When AEMET issued the forecast (ISO, local time). */
  issuedAt?: string;
}

export interface TrafficIncident {
  id: string;
  /** Spanish label: «Obras», «Accidente», «Carretera cortada»… */
  label: string;
  road?: string;
  lat: number;
  lng: number;
  /** ISO; absent: unknown. */
  start?: string;
  end?: string;
  comment?: string;
}

export interface ConditionsResponse {
  weather: WeatherDay[];
  incidents: TrafficIncident[];
  weatherStatus: "ok" | "unconfigured" | "unavailable";
  trafficStatus: "ok" | "unavailable";
  fetchedAt: string;
}

/* ------------------------------------------------------------------ AEMET */

const num = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/** "00-12", "12-24", "06-12" (daily) or "0107", "0713", "1901" (hourly) → minutes of the day. */
export function parsePeriod(p: unknown): { from: number; to: number } | null {
  if (typeof p !== "string") return null;
  const m = /^(\d{2})-?(\d{2})$/.exec(p.trim());
  if (!m) return null;
  const from = Number(m[1]) * 60;
  let to = Number(m[2]) * 60;
  if (to <= from) to = 24 * 60; // "1901": until the end of the day for this trip's purposes
  return { from, to };
}

type Json = Record<string, unknown>;
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);

function windowsFrom(probs: Json[], storms: Json[]): WeatherWindow[] {
  const byKey = new Map<string, WeatherWindow>();
  const add = (list: Json[], key: "precipProb" | "stormProb") => {
    for (const p of list) {
      const range = parsePeriod(p.periodo);
      const value = num(p.value);
      if (!range || value === undefined) continue;
      const k = `${range.from}-${range.to}`;
      const w = byKey.get(k) ?? { ...range };
      w[key] = value;
      byKey.set(k, w);
    }
  };
  add(probs, "precipProb");
  add(storms, "stormProb");
  // Prefer the finest windows: drop a window that others of the same day cover more finely.
  const all = [...byKey.values()];
  const fine = all.filter((w) => !all.some((o) => o !== w && o.from >= w.from && o.to <= w.to && o.to - o.from < w.to - w.from));
  return fine.sort((a, b) => a.from - b.from);
}

/** AEMET daily municipal forecast (prediccion.dia[]) → one WeatherDay per date. */
export function parseAemetDaily(json: unknown, locality: string): WeatherDay[] {
  const root = arr(json)[0];
  const days = arr((root?.prediccion as Json | undefined)?.dia);
  return days.flatMap((d) => {
    const date = typeof d.fecha === "string" ? d.fecha.slice(0, 10) : null;
    if (!date) return [];
    const temp = (d.temperatura as Json | undefined) ?? {};
    const gusts = arr(d.rachaMax).map((r) => num(r.value)).filter((v): v is number => v !== undefined);
    return [
      {
        locality,
        date,
        windows: windowsFrom(arr(d.probPrecipitacion), []),
        tMax: num(temp.maxima),
        tMin: num(temp.minima),
        gustMax: gusts.length ? Math.max(...gusts) : undefined,
        issuedAt: typeof root?.elaborado === "string" ? root.elaborado : undefined,
      },
    ];
  });
}

/** AEMET hourly municipal forecast → WeatherDay per date, with 6-hour windows and storm odds. */
export function parseAemetHourly(json: unknown, locality: string): WeatherDay[] {
  const root = arr(json)[0];
  const days = arr((root?.prediccion as Json | undefined)?.dia);
  return days.flatMap((d) => {
    const date = typeof d.fecha === "string" ? d.fecha.slice(0, 10) : null;
    if (!date) return [];
    const temps = arr(d.temperatura).map((t) => num(t.value)).filter((v): v is number => v !== undefined);
    const gusts = arr(d.vientoAndRachaMax).map((r) => num(r.value)).filter((v): v is number => v !== undefined);
    return [
      {
        locality,
        date,
        windows: windowsFrom(arr(d.probPrecipitacion), arr(d.probTormenta)),
        tMax: temps.length ? Math.max(...temps) : undefined,
        tMin: temps.length ? Math.min(...temps) : undefined,
        gustMax: gusts.length ? Math.max(...gusts) : undefined,
        issuedAt: typeof root?.elaborado === "string" ? root.elaborado : undefined,
      },
    ];
  });
}

/** Hourly beats daily for the same date and town (finer windows, storm odds); daily fills the rest. */
export function mergeWeather(hourly: readonly WeatherDay[], daily: readonly WeatherDay[]): WeatherDay[] {
  const out = new Map<string, WeatherDay>();
  for (const d of daily) out.set(`${d.locality}|${d.date}`, d);
  for (const h of hourly) {
    const d = out.get(`${h.locality}|${h.date}`);
    out.set(`${h.locality}|${h.date}`, {
      ...h,
      tMax: d?.tMax ?? h.tMax,
      tMin: d?.tMin ?? h.tMin,
      gustMax: Math.max(h.gustMax ?? 0, d?.gustMax ?? 0) || undefined,
    });
  }
  return [...out.values()];
}

/* ------------------------------------------------------------------ DGT (DATEX II) */

const RECORD_LABEL: [RegExp, string][] = [
  [/accident/i, "Accidente"],
  [/roadworks|maintenancework|constructionwork/i, "Obras"],
  [/roadorcarriagewayorlanemanagement|closure|roadclosed/i, "Restricción de circulación"],
  [/abnormaltraffic|congestion/i, "Retenciones"],
  [/weather|poorenvironment|nonweatherrelatedroadcondition|roadcondition/i, "Estado de la carretera"],
  [/obstruction|vehicleobstruction|animal/i, "Obstáculo en la vía"],
];

function walk(node: unknown, visit: (key: string, value: unknown, parent: Json) => void, key = "", parent: Json = {}) {
  if (Array.isArray(node)) for (const n of node) walk(n, visit, key, parent);
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Json)) {
      visit(k, v, node as Json);
      walk(v, visit, k, node as Json);
    }
  }
}

const local = (k: string) => k.replace(/^.*:/, "");
const text = (v: unknown): string | undefined => {
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number") return String(v);
  if (v && typeof v === "object") {
    const o = v as Json;
    if (typeof o["#text"] === "string" || typeof o["#text"] === "number") return String(o["#text"]);
    for (const val of Object.values(o)) {
      const t = text(val);
      if (t) return t;
    }
  }
  return undefined;
};

/**
 * DATEX II situation records (any version, parsed with attributes as "@_…") → incidents with a
 * point. Read leniently by element names, so profile details of the DGT feed do not break it.
 */
export function parseDatexIncidents(doc: unknown): TrafficIncident[] {
  const records: Json[] = [];
  walk(doc, (k, v) => {
    if (local(k) === "situationRecord") records.push(...(Array.isArray(v) ? (v as Json[]) : [v as Json]));
  });
  const out: TrafficIncident[] = [];
  for (const r of records) {
    let lat: number | undefined;
    let lng: number | undefined;
    let road: string | undefined;
    let start: string | undefined;
    let end: string | undefined;
    let comment: string | undefined;
    walk(r, (k, v) => {
      const name = local(k);
      if (name === "latitude" && lat === undefined) lat = num(text(v));
      else if (name === "longitude" && lng === undefined) lng = num(text(v));
      else if ((name === "roadNumber" || name === "roadName") && !road) road = text(v);
      else if (name === "overallStartTime" && !start) start = text(v);
      else if (name === "overallEndTime" && !end) end = text(v);
      else if ((name === "generalPublicComment" || name === "comment") && !comment) comment = text(v);
    });
    if (lat === undefined || lng === undefined) continue;
    const type = String(r["@_xsi:type"] ?? r["@_type"] ?? Object.keys(r).find((k) => /Type$|type$/.test(k)) ?? "");
    const label = RECORD_LABEL.find(([re]) => re.test(type))?.[1] ?? "Incidencia";
    out.push({ id: String(r["@_id"] ?? `${lat},${lng},${start ?? ""}`), label, road, lat, lng, start, end, comment });
  }
  return out;
}

/* ------------------------------------------------------------------ advice */

export type AdvisoryKind = "rain" | "storm" | "heat" | "frost" | "wind" | "traffic";

export interface Advisory {
  /** Stable while the cause holds, so the visitor is not told twice. */
  id: string;
  kind: AdvisoryKind;
  severity: "info" | "warning";
  /** Trip day (0-based). */
  day: number;
  date: string;
  title: string;
  detail: string;
  siteIds: SiteId[];
  /** "Fuente: AEMET, previsión de las 08:22" */
  source: string;
}

export const RAIN_WARNING = 60;
export const RAIN_INFO = 40;
export const STORM_WARNING = 30;
export const HEAT_WARNING = 34;
export const FROST_INFO = 0;
export const GUST_INFO = 60;
/** Incidents this close to a place of the trip (or to the road between two, by car) are reported. */
export const TRAFFIC_NEAR_M = 2000;

/** Museums are indoors; streets, monuments, sites and landscapes are walked outside. */
export function isOutdoor(site: Pick<Site, "kind">): boolean {
  return site.kind !== "museum" && site.kind !== "service";
}

/** Indoors by kind, or because every stop of the place is marked indoors (passed in by the caller). */
export type IndoorTest = (site: Site) => boolean;
const defaultIndoor: IndoorTest = (site) => !isOutdoor(site);

const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const issued = (iso?: string) => (iso && /T\d{2}:\d{2}/.test(iso) ? `, previsión de las ${iso.slice(11, 16)}` : "");

function stopDate(trip: Trip, stop: TripStop): string | null {
  return trip.context.date ? addDays(trip.context.date, stop.day ?? 0) : null;
}

/** The forecast windows that overlap the time spent at a stop. */
function windowsAt(day: WeatherDay, stop: TripStop): WeatherWindow[] {
  const from = stop.visitStart ?? stop.arrival;
  return day.windows.filter((w) => w.from < stop.departure && w.to > from);
}

function joinNames(names: string[]): string {
  if (names.length > 3) return `${names.slice(0, 2).join(", ")} y ${names.length - 2} lugares más`;
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
}

export function weatherAdvisories(
  trip: Trip,
  getSite: (id: SiteId) => Site | undefined,
  weather: readonly WeatherDay[],
  isIndoor: IndoorTest = defaultIndoor,
): Advisory[] {
  type Hit = { kind: AdvisoryKind; severity: "info" | "warning"; value: number; window?: WeatherWindow; day: WeatherDay; tripDay: number };
  const groups = new Map<string, { hit: Hit; sites: Site[]; from: number; to: number }>();
  const add = (hit: Hit, site: Site, stop: TripStop) => {
    const key = `${hit.kind}|${hit.day.date}|${hit.day.locality}|${hit.window ? `${hit.window.from}-${hit.window.to}` : ""}`;
    const g = groups.get(key) ?? { hit, sites: [], from: Infinity, to: -Infinity };
    if (hit.value > g.hit.value) g.hit = hit;
    if (!g.sites.includes(site)) g.sites.push(site);
    g.from = Math.min(g.from, stop.visitStart ?? stop.arrival);
    g.to = Math.max(g.to, stop.departure);
    groups.set(key, g);
  };

  for (const stop of trip.stops) {
    const site = getSite(stop.siteId);
    const date = stopDate(trip, stop);
    if (!site || !date || isIndoor(site)) continue;
    const day = weather.find((w) => w.date === date && w.locality === site.locality);
    if (!day) continue;
    const tripDay = stop.day ?? 0;
    for (const w of windowsAt(day, stop)) {
      if ((w.stormProb ?? 0) >= STORM_WARNING) add({ kind: "storm", severity: "warning", value: w.stormProb!, window: w, day, tripDay }, site, stop);
      else if ((w.precipProb ?? 0) >= RAIN_INFO) {
        add({ kind: "rain", severity: w.precipProb! >= RAIN_WARNING ? "warning" : "info", value: w.precipProb!, window: w, day, tripDay }, site, stop);
      }
    }
    const from = stop.visitStart ?? stop.arrival;
    if ((day.tMax ?? -99) >= HEAT_WARNING && stop.departure > 13 * 60 && from < 18 * 60) add({ kind: "heat", severity: "warning", value: day.tMax!, day, tripDay }, site, stop);
    if ((day.tMin ?? 99) <= FROST_INFO && from < 11 * 60) add({ kind: "frost", severity: "info", value: day.tMin!, day, tripDay }, site, stop);
    if ((day.gustMax ?? 0) >= GUST_INFO) add({ kind: "wind", severity: "info", value: day.gustMax!, day, tripDay }, site, stop);
  }

  return [...groups.values()].map(({ hit, sites, from, to }) => {
    const names = joinNames(sites.map((s) => s.name));
    // The hours that matter: where the forecast window and the visits overlap.
    const when = hit.window ? `entre las ${hhmm(Math.max(hit.window.from, from))} y las ${hhmm(Math.min(hit.window.to, to))}` : "";
    const where = hit.day.locality;
    const text: Record<AdvisoryKind, { title: string; detail: string }> = {
      rain: {
        title: `Posible lluvia en ${where} (${hit.value} %)`,
        detail: `Probabilidad de lluvia del ${hit.value} % ${when}, mientras visitas al aire libre ${names}.`,
      },
      storm: {
        title: `Posibles tormentas en ${where} (${hit.value} %)`,
        detail: `Probabilidad de tormenta del ${hit.value} % ${when}. En el campo y en lugares altos, busca refugio si oyes truenos. Afecta a ${names}.`,
      },
      heat: {
        title: `Calor en ${where}: hasta ${hit.value} °C`,
        detail: `Las horas centrales del día en ${names} serán calurosas. Lleva agua y gorra, y deja la sombra o los museos para la tarde.`,
      },
      frost: {
        title: `Helada a primera hora en ${where} (${hit.value} °C)`,
        detail: `Mínima de ${hit.value} °C. Cuidado con el suelo helado en ${names}.`,
      },
      wind: {
        title: `Rachas de viento en ${where} (${hit.value} km/h)`,
        detail: `Rachas de hasta ${hit.value} km/h. En ${names}, aléjate de muros en ruina y de árboles.`,
      },
      traffic: { title: "", detail: "" },
    };
    return {
      id: `${hit.kind}:${hit.day.date}:${where}:${hit.window ? `${hit.window.from}-${hit.window.to}` : ""}:${hit.severity}`,
      kind: hit.kind,
      severity: hit.severity,
      day: hit.tripDay,
      date: hit.day.date,
      ...text[hit.kind],
      siteIds: sites.map((s) => s.id),
      source: `Fuente: AEMET${issued(hit.day.issuedAt)}`,
    };
  });
}

/** Distance from point p to the segment a–b, in metres (flat approximation; fine at a few km). */
function distanceToSegment(p: { lat: number; lng: number }, a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const kx = Math.cos((a.lat * Math.PI) / 180) * 111_320;
  const ky = 110_540;
  const ax = 0, ay = 0;
  const bx = (b.lng - a.lng) * kx, by = (b.lat - a.lat) * ky;
  const px = (p.lng - a.lng) * kx, py = (p.lat - a.lat) * ky;
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * bx + (py - ay) * by) / len2));
  return Math.hypot(px - t * bx, py - t * by);
}

function activeOn(incident: TrafficIncident, date: string): boolean {
  const dayStart = Date.parse(`${date}T00:00:00`);
  const dayEnd = Date.parse(`${date}T23:59:59`);
  const start = incident.start ? Date.parse(incident.start) : NaN;
  const end = incident.end ? Date.parse(incident.end) : NaN;
  if (Number.isFinite(start) && start > dayEnd) return false;
  if (Number.isFinite(end) && end < dayStart) return false;
  return true;
}

export function trafficAdvisories(
  trip: Trip,
  getSite: (id: SiteId) => Site | undefined,
  incidents: readonly TrafficIncident[],
  fetchedAt?: string,
): Advisory[] {
  const out: Advisory[] = [];
  const car = trip.context.transport === "car";
  const byDay = new Map<number, Site[]>();
  for (const s of trip.stops) {
    const site = getSite(s.siteId);
    if (!site) continue;
    const list = byDay.get(s.day ?? 0) ?? [];
    list.push(site);
    byDay.set(s.day ?? 0, list);
  }
  for (const [day, sites] of byDay) {
    const date = trip.context.date ? addDays(trip.context.date, day) : null;
    if (!date) continue;
    for (const inc of incidents) {
      if (!activeOn(inc, date)) continue;
      const near = sites.filter((s) => distanceMeters(inc, s.coordinates) <= TRAFFIC_NEAR_M);
      const onTheWay =
        car &&
        sites.some((s, i) => i > 0 && distanceToSegment(inc, sites[i - 1].coordinates, s.coordinates) <= TRAFFIC_NEAR_M / 2);
      if (near.length === 0 && !onTheWay) continue;
      const road = inc.road ? ` en la ${inc.road}` : "";
      const nearText = near.length ? `cerca de ${joinNames(near.map((s) => s.name))}` : "en el camino entre dos paradas de tu viaje";
      out.push({
        id: `traffic:${inc.id}:${date}`,
        kind: "traffic",
        severity: "warning",
        day,
        date,
        title: `${inc.label}${road}`,
        detail: `${inc.label}${road}, ${nearText}.${inc.comment ? ` ${inc.comment}` : ""}${inc.end ? ` Previsto hasta el ${formatDateTime(inc.end)}.` : ""}`,
        siteIds: near.map((s) => s.id),
        source: `Fuente: DGT${fetchedAt ? `, consultado a las ${fetchedAt.slice(11, 16)}` : ""}`,
      });
    }
  }
  return out;
}

function formatDateTime(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]} a las ${m[4]}:${m[5]}` : iso;
}

/** Warnings first, then by day and kind. */
export function tripAdvisories(
  trip: Trip,
  getSite: (id: SiteId) => Site | undefined,
  conditions: Pick<ConditionsResponse, "weather" | "incidents" | "fetchedAt">,
  isIndoor: IndoorTest = defaultIndoor,
): Advisory[] {
  const all = [...weatherAdvisories(trip, getSite, conditions.weather, isIndoor), ...trafficAdvisories(trip, getSite, conditions.incidents, conditions.fetchedAt)];
  return all.sort((a, b) => (a.severity === b.severity ? a.day - b.day : a.severity === "warning" ? -1 : 1));
}

/* ------------------------------------------------------------------ rain proposal */

/** Minutes spent outdoors under a ≥ RAIN_INFO forecast (weighted by probability), the thing to lower. */
export function rainExposure(
  trip: { context: Trip["context"]; stops: readonly TripStop[] },
  getSite: (id: SiteId) => Site | undefined,
  weather: readonly WeatherDay[],
  isIndoor: IndoorTest = defaultIndoor,
): number {
  let total = 0;
  for (const stop of trip.stops) {
    const site = getSite(stop.siteId);
    if (!site || isIndoor(site) || !trip.context.date) continue;
    const date = addDays(trip.context.date, stop.day ?? 0);
    const day = weather.find((w) => w.date === date && w.locality === site.locality);
    if (!day) continue;
    const from = stop.visitStart ?? stop.arrival;
    for (const w of day.windows) {
      const p = Math.max(w.precipProb ?? 0, w.stormProb ?? 0);
      if (p < RAIN_INFO) continue;
      const overlap = Math.max(0, Math.min(stop.departure, w.to) - Math.max(from, w.from));
      total += overlap * (p / 100);
    }
  }
  return total;
}

/**
 * A different order that keeps the outdoor places out of the rain: within each day, outdoor places
 * first (rain later) or last (rain earlier); with several days, the outdoor places of a wet day
 * swapped with a drier day. Returns the best that clearly helps, as a proposal to review; null
 * when nothing improves things by at least a quarter (or 20 minutes).
 */
export function proposeForWeather(
  trip: Trip,
  getSite: (id: SiteId) => Site | undefined,
  weather: readonly WeatherDay[],
  isIndoor: IndoorTest = defaultIndoor,
): ItineraryProposal | null {
  if (!trip.context.date || trip.stops.length < 2) return null;
  const now = rainExposure(trip, getSite, weather, isIndoor);
  if (now <= 0) return null;
  const entries = trip.stops.map((s) => ({ siteId: s.siteId, day: s.day ?? 0 }));
  const outdoor = (id: SiteId) => {
    const s = getSite(id);
    return s ? !isIndoor(s) : false;
  };
  const days = [...new Set(entries.map((e) => e.day))].sort((a, b) => a - b);
  const reorder = (first: "outdoor" | "indoor") =>
    days.flatMap((d) => {
      const of = entries.filter((e) => e.day === d);
      const out = of.filter((e) => outdoor(e.siteId));
      const ins = of.filter((e) => !outdoor(e.siteId));
      return first === "outdoor" ? [...out, ...ins] : [...ins, ...out];
    });
  const candidates: { entries: typeof entries; why: string }[] = [
    { entries: reorder("outdoor"), why: "Los lugares al aire libre pasan antes, y los museos quedan para las horas con más probabilidad de lluvia." },
    { entries: reorder("indoor"), why: "Los museos pasan antes, y los lugares al aire libre quedan para las horas más secas." },
  ];
  if (days.length > 1) {
    for (const a of days)
      for (const b of days) {
        if (a >= b) continue;
        const swapped = entries.map((e) => (e.day === a ? { ...e, day: b } : e.day === b ? { ...e, day: a } : e));
        candidates.push({ entries: swapped, why: `Se intercambian los días ${a + 1} y ${b + 1}, para hacer el campo el día más seco.` });
      }
  }
  let best: { proposal: ItineraryProposal; exposure: number } | null = null;
  for (const c of candidates) {
    const same = c.entries.every((e, i) => e.siteId === entries[i].siteId && e.day === entries[i].day);
    if (same) continue;
    const proposal = proposePlan(trip, c.entries, trip.context, [`Para evitar la lluvia (previsión de AEMET): ${c.why}`]);
    if (!proposal.ok) continue;
    const exposure = rainExposure({ context: proposal.context, stops: proposal.after }, getSite, weather, isIndoor);
    if (!best || exposure < best.exposure) best = { proposal, exposure };
  }
  if (!best) return null;
  const gain = now - best.exposure;
  if (gain < Math.max(20, now * 0.25)) return null;
  // proposePlan says the plan replaces the trip's stops; here it is the same stops, reordered.
  best.proposal.warnings = best.proposal.warnings.filter((w) => !w.startsWith("Este recorrido sustituye"));
  return best.proposal;
}

export { hhmm as formatMinutes };

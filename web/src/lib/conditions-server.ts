/**
 * Server side of the trip conditions (domain/conditions.ts): fetches AEMET forecasts and DGT
 * incidents, with short in-memory caches. Server only: the AEMET key never reaches the browser.
 *
 * - AEMET OpenData: AEMET_API_KEY (free, from opendata.aemet.es). Each request answers with a
 *   `datos` URL that holds the data (ISO-8859-15). Towns are matched by name in AEMET's own list of
 *   municipalities, so no codes live in the content.
 * - DGT: the national incidents feed, DATEX II v3.7, open (CC BY), no key. DGT_INCIDENTS_URL
 *   overrides the address if DGT moves it.
 */
import { XMLParser } from "fast-xml-parser";
import { mergeWeather, parseAemetDaily, parseAemetHourly, parseDatexIncidents, type TrafficIncident, type WeatherDay } from "@/domain/conditions";

const AEMET = "https://opendata.aemet.es/opendata/api";
const DGT_DEFAULT = "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v37.xml";
const TIMEOUT_MS = 10_000;

const WEATHER_TTL = 30 * 60_000;
const TRAFFIC_TTL = 5 * 60_000;
const MUNICIPIOS_TTL = 24 * 60 * 60_000;

const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function get(url: string, headers: Record<string, string> = {}): Promise<Response> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${url.replace(/api_key=[^&]+/, "api_key=…")}`);
  return res;
}

/** AEMET answers in ISO-8859-15; JSON.parse after decoding as Latin-1 keeps accents right. */
async function latin1Json(res: Response): Promise<unknown> {
  const buf = await res.arrayBuffer();
  return JSON.parse(new TextDecoder("iso-8859-15").decode(buf));
}

async function aemet(path: string, key: string): Promise<unknown> {
  const first = await latin1Json(await get(`${AEMET}${path}`, { api_key: key, accept: "application/json" }));
  const datos = (first as { datos?: unknown }).datos;
  if (typeof datos !== "string") return first;
  return latin1Json(await get(datos));
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** AEMET municipality id (5-digit INE code) of a town, by its name. */
async function municipalityId(name: string, key: string): Promise<string | null> {
  const list = await cached("aemet:municipios", MUNICIPIOS_TTL, async () => {
    const json = await aemet("/maestro/municipios", key);
    return (Array.isArray(json) ? json : []) as { id?: string; nombre?: string }[];
  });
  const wanted = fold(name);
  const hit = list.find((m) => typeof m.nombre === "string" && fold(m.nombre) === wanted);
  return hit?.id ? hit.id.replace(/^id/, "") : null;
}

/**
 * Forecast for the towns, for the given dates. Daily for up to 7 days; hourly (finer, with storm
 * odds) for today and the next day or two. `unconfigured` without AEMET_API_KEY.
 */
export async function fetchWeather(localities: readonly string[], dates: readonly string[]): Promise<{ status: "ok" | "unconfigured" | "unavailable"; days: WeatherDay[] }> {
  const key = process.env.AEMET_API_KEY?.trim();
  if (!key) return { status: "unconfigured", days: [] };
  try {
    const days = (
      await Promise.all(
        localities.map(async (locality) => {
          const id = await municipalityId(locality, key);
          if (!id) return [];
          const [daily, hourly] = await Promise.all([
            cached(`aemet:diaria:${id}`, WEATHER_TTL, async () => parseAemetDaily(await aemet(`/prediccion/especifica/municipio/diaria/${id}`, key), locality)),
            cached(`aemet:horaria:${id}`, WEATHER_TTL, async () => parseAemetHourly(await aemet(`/prediccion/especifica/municipio/horaria/${id}`, key), locality)).catch(() => []),
          ]);
          return mergeWeather(hourly, daily);
        }),
      )
    ).flat();
    return { status: "ok", days: days.filter((d) => dates.includes(d.date)) };
  } catch {
    return { status: "unavailable", days: [] };
  }
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", removeNSPrefix: false, parseTagValue: false });

/** DGT incidents inside a box (south, west, north, east). */
export async function fetchIncidents(box: [number, number, number, number]): Promise<{ status: "ok" | "unavailable"; incidents: TrafficIncident[] }> {
  try {
    const all = await cached("dgt:incidencias", TRAFFIC_TTL, async () => {
      const res = await get(process.env.DGT_INCIDENTS_URL?.trim() || DGT_DEFAULT, { accept: "application/xml" });
      return parseDatexIncidents(parser.parse(await res.text()));
    });
    const [s, w, n, e] = box;
    return { status: "ok", incidents: all.filter((i) => i.lat >= s && i.lat <= n && i.lng >= w && i.lng <= e) };
  } catch {
    return { status: "unavailable", incidents: [] };
  }
}

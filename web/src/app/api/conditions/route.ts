/**
 * GET /api/conditions?localities=Toledo,Guadamur&dates=2026-11-14,2026-11-15&box=s,w,n,e
 *
 * Weather (AEMET) and traffic incidents (DGT) for a planned trip (domain/conditions.ts). The browser
 * sends only the towns, dates and the box around the trip's places, never the visitor's position;
 * nothing is stored. Towns must be the catalog's; dates within the forecast range; the box small.
 */
import { z } from "zod";
import type { ConditionsResponse } from "@/domain/conditions";
import { localities } from "@/data/content";
import { loadPublishedCatalog } from "@/data/published";
import { fetchIncidents, fetchWeather } from "@/lib/conditions-server";
import { createTokenBucket } from "@/lib/rateLimit";

export const runtime = "nodejs";

const bucket = createTokenBucket({ capacity: 20, refillPerSecond: 20 / 60 });

const Query = z.object({
  localities: z.string().max(400).transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)),
  dates: z
    .string()
    .max(200)
    .transform((s) => s.split(",").filter(Boolean))
    .pipe(z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(5)),
  box: z
    .string()
    .max(120)
    .transform((s) => s.split(",").map(Number))
    .pipe(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180), z.number().min(-90).max(90), z.number().min(-180).max(180)])),
});

function clientKey(request: Request): string {
  const hops = request.headers.get("x-forwarded-for")?.split(",").map((h) => h.trim()).filter(Boolean) ?? [];
  return hops.at(-1) || request.headers.get("x-real-ip") || "anonymous";
}

export async function GET(request: Request) {
  if (!bucket(clientKey(request))) return Response.json({ error: "Demasiadas consultas. Espera un momento." }, { status: 429 });
  const url = new URL(request.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return Response.json({ error: "Consulta no válida." }, { status: 400 });
  const { dates, box } = parsed.data;
  const [s, w, n, e] = box;
  if (n < s || e < w || n - s > 1 || e - w > 1) return Response.json({ error: "Zona demasiado grande." }, { status: 400 });

  await loadPublishedCatalog();
  const known = new Set(localities());
  const towns = parsed.data.localities.filter((l) => known.has(l)).slice(0, 10);

  const [weather, traffic] = await Promise.all([fetchWeather(towns, dates), fetchIncidents(box)]);
  const body: ConditionsResponse = {
    weather: weather.days,
    incidents: traffic.incidents,
    weatherStatus: weather.status,
    trafficStatus: traffic.status,
    fetchedAt: new Date().toLocaleString("sv-SE", { timeZone: "Europe/Madrid" }).replace(" ", "T"),
  };
  return Response.json(body, { headers: { "cache-control": "private, max-age=300" } });
}

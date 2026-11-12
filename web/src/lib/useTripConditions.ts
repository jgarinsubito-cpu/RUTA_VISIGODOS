"use client";
/**
 * Weather and traffic for the visitor's trip, from /api/conditions, and the assistant's advice on
 * them (domain/conditions.ts). Asks only when the trip has a date inside the forecast range, sends
 * only towns, dates and the box around the trip's places, and refreshes every 15 minutes while the
 * page is visible. One request is shared by every component that uses the hook.
 */
import { useEffect, useState } from "react";
import { getSite, stopsForSite } from "@/data/content";
import { isOutdoor, proposeForWeather, tripAdvisories, type Advisory, type ConditionsResponse } from "@/domain/conditions";
import type { Site } from "@/domain/types";
import { addDays, tripDays } from "@/domain/planner";
import type { ItineraryProposal, Trip } from "@/domain/types";

/** AEMET's municipal forecast covers today and the next six days. */
export const FORECAST_DAYS = 7;
const REFRESH_MS = 15 * 60_000;
const BOX_MARGIN = 0.03; // ≈ 3 km

export type ConditionsState =
  | { status: "no-trip" | "no-date" | "past" }
  | { status: "too-early"; from: string }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: ConditionsResponse; advisories: Advisory[]; proposal: ItineraryProposal | null };

/** A museum, or a place whose every stop is marked as indoors. */
export function isIndoorSite(site: Site): boolean {
  if (!isOutdoor(site)) return true;
  const stops = stopsForSite(site.id);
  return stops.length > 0 && stops.every((s) => s.indoor);
}

export function localToday(now = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}

/** The query the trip needs, or why there is none. */
export function conditionsQuery(trip: Trip, today: string): { query: string } | { status: "no-trip" | "no-date" | "past" } | { status: "too-early"; from: string } {
  if (trip.stops.length === 0) return { status: "no-trip" };
  if (!trip.context.date) return { status: "no-date" };
  const all = Array.from({ length: tripDays(trip.context) }, (_, i) => addDays(trip.context.date!, i));
  const last = addDays(today, FORECAST_DAYS - 1);
  if (all.at(-1)! < today) return { status: "past" };
  const dates = all.filter((d) => d >= today && d <= last);
  if (dates.length === 0) return { status: "too-early", from: addDays(all[0], -(FORECAST_DAYS - 1)) };
  const sites = trip.stops.map((s) => getSite(s.siteId)).filter((s) => s !== undefined);
  const towns = [...new Set(sites.map((s) => s.locality))];
  const lats = sites.map((s) => s.coordinates.lat);
  const lngs = sites.map((s) => s.coordinates.lng);
  const box = [Math.min(...lats) - BOX_MARGIN, Math.min(...lngs) - BOX_MARGIN, Math.max(...lats) + BOX_MARGIN, Math.max(...lngs) + BOX_MARGIN].map((n) => n.toFixed(4));
  const params = new URLSearchParams({ localities: towns.join(","), dates: dates.join(","), box: box.join(",") });
  return { query: params.toString() };
}

const shared = new Map<string, { at: number; promise: Promise<ConditionsResponse> }>();

function load(query: string, force = false): Promise<ConditionsResponse> {
  const hit = shared.get(query);
  if (hit && !force && Date.now() - hit.at < REFRESH_MS) return hit.promise;
  const promise = fetch(`/api/conditions?${query}`).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<ConditionsResponse>;
  });
  shared.set(query, { at: Date.now(), promise });
  promise.catch(() => shared.delete(query));
  return promise;
}

export function useTripConditions(trip: Trip): ConditionsState {
  const plan = conditionsQuery(trip, localToday());
  const query = "query" in plan ? plan.query : null;
  const [result, setResult] = useState<{ query: string; data: ConditionsResponse | null; failed: boolean } | null>(null);

  useEffect(() => {
    if (!query) return;
    let live = true;
    const run = (force: boolean) =>
      load(query, force).then(
        (data) => live && setResult({ query, data, failed: false }),
        () => live && setResult({ query, data: null, failed: true }),
      );
    void run(false);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void run(true);
    }, REFRESH_MS);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [query]);

  if (!("query" in plan)) return plan;
  if (!result || result.query !== query) return { status: "loading" };
  if (result.failed || !result.data) return { status: "error" };
  const advisories = tripAdvisories(trip, getSite, result.data, isIndoorSite);
  const proposal = advisories.some((a) => a.kind === "rain" || a.kind === "storm") ? proposeForWeather(trip, getSite, result.data.weather, isIndoorSite) : null;
  return { status: "ready", data: result.data, advisories, proposal };
}

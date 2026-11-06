import { describe, expect, it } from "vitest";
import { demoCatalog } from "@/data/content";
import { addDays, applyProposal, emptyTrip, LUNCH_FROM, planOf, proposeMoveToDay, proposePlan, proposeService, reschedule, schedule, schedulePlan, type PlannerOptions } from "./planner";
import { composeThematicPlan, orderForThemes, type ThematicRequest } from "./thematic";
import { openAt, rankServices, RANKING_CRITERIA, suggestForTrip } from "./services";
import { estimateTravelProvider } from "./travel";
import type { Service, Site, Trip, TripContext } from "./types";

const DEMO = demoCatalog();
const SERVICES = DEMO.services ?? [];
const siteById = new Map(DEMO.sites.map((s) => [s.id, s]));
const serviceById = new Map(SERVICES.map((s) => [s.id, s]));
const OPTIONS: PlannerOptions = { getSite: (id) => siteById.get(id), getService: (id) => serviceById.get(id) };

const CONTEXT: TripContext = {
  area: "Toledo y Guadamur",
  date: null,
  startTime: "09:30",
  endTime: "19:00",
  profile: "general",
  transport: "car",
  stepFreeRequired: false,
};

function request(patch: Partial<ThematicRequest> = {}): ThematicRequest {
  return { themes: [], days: 2, start: "Toledo", includeOther: false, pace: "balanced", context: CONTEXT, ...patch };
}

function accept(trip: Trip, p: ReturnType<typeof proposePlan>): Trip {
  const next = applyProposal(trip, p, "2026-12-01T10:00:00Z");
  if ("error" in next) throw new Error(`${next.error}: ${p.reason}`);
  return next;
}

describe("multi-day planner", () => {
  it("keeps a one-day schedule exactly as before when there is no lunch break", () => {
    const ids = ["site-san-roman", "site-vega-baja"];
    const one = schedule(ids, CONTEXT, OPTIONS);
    const plan = schedulePlan(
      ids.map((siteId) => ({ siteId, day: 0 })),
      CONTEXT,
      [],
      OPTIONS,
    );
    expect(plan.stops).toEqual(one.stops);
    expect(plan.breaks).toEqual([]);
  });

  it("counts calendar days across the DST changes, whatever the device's time zone", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    // The second day of a trip from Saturday 24 October is Sunday 25 (weekday 7).
    const closedSunday = { ...siteById.get("site-san-roman")!, hours: { status: "verified" as const, weekly: { 6: [{ open: "09:00", close: "19:00" }] } } };
    const r = schedulePlan(
      [
        { siteId: "site-vega-baja", day: 0 },
        { siteId: closedSunday.id, day: 1 },
      ],
      { ...CONTEXT, date: "2026-10-24", days: 2 },
      [],
      { ...OPTIONS, getSite: (id) => (id === closedSunday.id ? closedSunday : siteById.get(id)) },
    );
    expect(r.ok).toBe(false);
    expect(r.stops[1].warnings.some((w) => w.code === "closed-day")).toBe(true);
  });

  it("starts every day at the start time and marks the stops with their day", () => {
    const r = schedulePlan(
      [
        { siteId: "site-san-roman", day: 0 },
        { siteId: "site-guarrazar", day: 1 },
      ],
      { ...CONTEXT, days: 2 },
      [],
      OPTIONS,
    );
    expect(r.ok).toBe(true);
    expect(r.stops[1].day).toBe(1);
    expect(r.stops[1].arrival).toBe(9 * 60 + 30);
    expect(r.stops[1].travelMinutesFromPrevious).toBe(0);
  });

  it("keeps a lunch break between 13:00 and 15:00, at the chosen restaurant", () => {
    const ctx = { ...CONTEXT, startTime: "11:00", lunchBreak: true };
    const plan = [
      { siteId: "site-guarrazar", day: 0 },
      { siteId: "site-castillo-guadamur", day: 0 },
    ];
    const generic = schedulePlan(plan, ctx, [], OPTIONS);
    expect(generic.breaks).toHaveLength(1);
    expect(generic.breaks[0].start).toBeGreaterThanOrEqual(LUNCH_FROM);
    const withRestaurant = schedulePlan(plan, ctx, [{ day: 0, slot: "lunch", serviceId: "service-ejemplo-meson-guadamur" }], OPTIONS);
    expect(withRestaurant.breaks[0].serviceId).toBe("service-ejemplo-meson-guadamur");
    expect(withRestaurant.breaks[0].end - withRestaurant.breaks[0].start).toBe(75);
  });

  it("starts the next day from the chosen lodging", () => {
    const plan = [
      { siteId: "site-san-roman", day: 0 },
      { siteId: "site-guarrazar", day: 1 },
    ];
    const ctx = { ...CONTEXT, days: 2 };
    const fromToledo = schedulePlan(plan, ctx, [{ day: 0, slot: "overnight", serviceId: "service-ejemplo-hotel-casco" }], OPTIONS);
    const fromGuadamur = schedulePlan(plan, ctx, [{ day: 0, slot: "overnight", serviceId: "service-ejemplo-casa-rural-guadamur" }], OPTIONS);
    expect(fromToledo.stops[1].travelMinutesFromPrevious).toBeGreaterThan(fromGuadamur.stops[1].travelMinutesFromPrevious);
  });

  it("moves a stop to another day, and pulls stops back when days are removed", () => {
    let trip = emptyTrip({ ...CONTEXT, days: 2 });
    trip = accept(
      trip,
      proposePlan(
        trip,
        [
          { siteId: "site-san-roman", day: 0 },
          { siteId: "site-vega-baja", day: 0 },
        ],
        { ...CONTEXT, days: 2 },
        [],
        OPTIONS,
      ),
    );
    trip = accept(trip, proposeMoveToDay(trip, "site-vega-baja", 1, OPTIONS));
    expect(planOf(trip)).toEqual([
      { siteId: "site-san-roman", day: 0 },
      { siteId: "site-vega-baja", day: 1 },
    ]);
    const back = reschedule(trip, { ...trip.context, days: 1 }, OPTIONS);
    expect(back.after.every((s) => (s.day ?? 0) === 0)).toBe(true);
    expect(back.warnings.join()).toContain("pasan al día 1");
  });

  it("adds, replaces and removes services through proposals, dropping nights that no longer exist", () => {
    let trip = emptyTrip({ ...CONTEXT, days: 2 });
    trip = accept(
      trip,
      proposePlan(
        trip,
        [
          { siteId: "site-san-roman", day: 0 },
          { siteId: "site-guarrazar", day: 1 },
        ],
        { ...CONTEXT, days: 2 },
        [],
        OPTIONS,
      ),
    );
    trip = accept(trip, proposeService(trip, { day: 0, slot: "overnight", serviceId: "service-ejemplo-hotel-casco" }, OPTIONS));
    trip = accept(trip, proposeService(trip, { day: 0, slot: "overnight", serviceId: "service-ejemplo-casa-rural-guadamur" }, OPTIONS));
    expect(trip.services).toEqual([{ day: 0, slot: "overnight", serviceId: "service-ejemplo-casa-rural-guadamur" }]);
    expect(proposeService(trip, { day: 1, slot: "overnight", serviceId: "service-ejemplo-hotel-casco" }, OPTIONS).ok).toBe(false);
    const oneDay = accept(trip, reschedule(trip, { ...trip.context, days: 1 }, OPTIONS));
    expect(oneDay.services).toBeUndefined();
  });
});

describe("theme-based plan", () => {
  it("picks the places of the chosen themes, Visigothic only unless asked", () => {
    const order = orderForThemes(request({ themes: ["tesoro"] }), { sites: DEMO.sites });
    expect(order.length).toBeGreaterThan(0);
    expect(order.every((s) => s.visigothic && s.themes.includes("tesoro"))).toBe(true);
    const withOther = orderForThemes(request({ themes: [], includeOther: true }), { sites: DEMO.sites });
    expect(withOther.some((s) => !s.visigothic)).toBe(true);
  });

  it("starts in the visitor's town, keeps the story order inside it and groups towns", () => {
    const order = orderForThemes(request(), { sites: DEMO.sites });
    expect(order[0].id).toBe("site-san-roman");
    expect(order[1].id).toBe("site-vega-baja");
    const towns = order.map((s) => s.locality);
    // Once the plan leaves a town it does not come back.
    const seen: string[] = [];
    for (const t of towns) if (seen[seen.length - 1] !== t) seen.push(t);
    expect(new Set(seen).size).toBe(seen.length);
    const fromGuadamur = orderForThemes(request({ start: "Guadamur" }), { sites: DEMO.sites });
    expect(fromGuadamur[0].locality).toBe("Guadamur");
  });

  it("never lets non-Visigothic heritage push a Visigothic place out", () => {
    const visigothic = DEMO.sites.filter((s) => s.visigothic).map((s) => s.id);
    const plan = composeThematicPlan(request({ days: 2, pace: "relaxed", includeOther: true }), { sites: DEMO.sites });
    const placed = new Set(plan.entries.map((e) => e.siteId));
    expect(visigothic.every((id) => placed.has(id))).toBe(true);
    expect(plan.leftovers.every((l) => !siteById.get(l.siteId)!.visigothic)).toBe(true);
  });

  it("spreads the places over the days within the pace, and reports what does not fit", () => {
    const relaxed = composeThematicPlan(request({ days: 1, pace: "relaxed", includeOther: true }), { sites: DEMO.sites });
    const sites = (ids: string[]) => ids.map((id) => siteById.get(id)!) as Site[];
    expect(relaxed.leftovers.length).toBeGreaterThan(0);
    expect(relaxed.entries.length + relaxed.leftovers.length).toBe(relaxed.matched);
    const two = composeThematicPlan(request({ days: 2, pace: "full" }), { sites: DEMO.sites });
    expect(new Set(two.entries.map((e) => e.day)).size).toBeGreaterThanOrEqual(1);
    expect(two.context.lunchBreak).toBe(true);
    expect(two.context.days).toBe(2);
    expect(sites(two.entries.map((e) => e.siteId)).every((s) => s.visigothic)).toBe(true);
    const trip = emptyTrip(CONTEXT);
    const proposal = proposePlan(trip, two.entries, two.context, [], OPTIONS);
    expect(proposal.ok).toBe(true);
  });
});

describe("services in the trip", () => {
  const svc = (patch: Partial<Service>): Service => ({ ...SERVICES[0], ...patch });

  it("ranks by link to the day's places, then opening, then fit, then distance; never by sponsorship", () => {
    const near = { lat: 39.8583, lng: -4.0269, approximate: false };
    const base = { near, date: "2026-12-15", time: 14 * 60, linked: new Set(["site-san-roman"]), family: false, stepFree: false, transport: "walk" as const, travel: estimateTravelProvider, siteName: (id: string) => siteById.get(id)?.name ?? id, now: Date.parse("2026-12-01") };
    const verifiedOpen = { status: "verified" as const, weekly: { 2: [{ open: "13:00", close: "16:00" }] } };
    const list = [
      svc({ id: "far-sponsored", name: "Lejos", sponsored: true, siteIds: [], coordinates: { lat: 39.87, lng: -4.04, approximate: true } }),
      svc({ id: "near-open", name: "Cerca abierto", siteIds: [], hours: verifiedOpen, coordinates: { lat: 39.859, lng: -4.027, approximate: true } }),
      svc({ id: "linked", name: "Vinculado", siteIds: ["site-san-roman"], coordinates: { lat: 39.865, lng: -4.03, approximate: true } }),
      svc({ id: "closed", name: "Cerrado", siteIds: [], hours: { status: "verified", weekly: { 2: [{ open: "20:00", close: "23:00" }] } } }),
    ];
    const ranked = rankServices(list, base).map((r) => r.service.id);
    expect(ranked).toEqual(["linked", "near-open", "far-sponsored"]);
    expect(RANKING_CRITERIA.join(" ")).toContain("no cambia este orden");
  });

  it("knows when a service is open only from checked hours", () => {
    expect(openAt(svc({ hours: { status: "example" } }), "2026-12-15", 600)).toBeNull();
    expect(openAt(svc({ hours: { status: "verified", weekly: { 2: [{ open: "09:00", close: "14:00" }] } } }), "2026-12-15", 600)).toBe(true);
    expect(openAt(svc({ hours: { status: "verified", weekly: { 2: [{ open: "09:00", close: "14:00" }] } } }), "2026-12-16", 600)).toBe(false);
  });

  it("offers lunch near where the visitor is, not at a place of the morning across town", () => {
    let trip = emptyTrip({ ...CONTEXT, startTime: "10:00", lunchBreak: true });
    trip = accept(
      trip,
      proposePlan(
        trip,
        [
          { siteId: "site-san-roman", day: 0 },
          { siteId: "site-vega-baja", day: 0 },
          { siteId: "site-guarrazar", day: 0 },
        ],
        { ...CONTEXT, startTime: "10:00", lunchBreak: true },
        [],
        OPTIONS,
      ),
    );
    const [day] = suggestForTrip(trip, { services: SERVICES, getSite: (id) => siteById.get(id) });
    expect(day.lunch?.where).toContain("Guarrazar");
    expect(day.lunch?.options.length).toBeGreaterThan(0);
    expect(day.lunch?.options.every((o) => o.service.locality === "Guadamur")).toBe(true);
  });

  it("suggests lunch, a lodging for each night, a car on the first day and the day's activities", () => {
    let trip = emptyTrip(CONTEXT);
    const plan = composeThematicPlan(request({ days: 2, pace: "relaxed" }), { sites: DEMO.sites });
    trip = accept(trip, proposePlan(trip, plan.entries, plan.context, [], OPTIONS));
    const days = suggestForTrip(trip, { services: SERVICES, getSite: (id) => siteById.get(id) });
    expect(days).toHaveLength(2);
    expect(days[0].lunch?.options.length).toBeGreaterThan(0);
    expect(days[0].overnight?.options.every((o) => o.service.category === "lodging")).toBe(true);
    expect(days[1].overnight).toBeUndefined();
    expect(days[0].car?.options[0].service.category).toBe("car-rental");
    const guadamurDay = days.find((d) => trip.stops.some((s) => (s.day ?? 0) === d.day && s.siteId === "site-guarrazar"));
    if (guadamurDay) expect(guadamurDay.activities.map((a) => a.service.id)).toContain("service-ejemplo-visita-guarrazar");
  });
});

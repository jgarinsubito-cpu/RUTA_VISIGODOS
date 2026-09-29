import { describe, expect, it } from "vitest";
import { getRoute, getSite } from "@/data/catalog";
import {
  applyProposal,
  emptyTrip,
  formatClock,
  isoWeekday,
  parseClock,
  proposeAdd,
  proposeFromRoute,
  proposeMove,
  proposeRemove,
  reschedule,
  schedule,
  WARN_ACCESS,
  WARN_EXAMPLE_HOURS,
  WARN_NO_DATE,
  WARN_UNKNOWN_HOURS,
  type PlannerOptions,
  type PlannerProposal,
} from "./planner";
import { estimateTravelMinutes } from "./travel";
import type { Site, Trip, TripContext } from "./types";

const SR = "site-san-roman";
const CRISTO = "site-cristo-luz";
const VEGA = "site-vega-baja";
const GUARRAZAR = "site-guarrazar";
const CASTILLO = "site-castillo-guadamur";

// 2026-09-29 is a Tuesday; 2026-09-28 a Monday; 2026-10-04 a Sunday.
const TUESDAY = "2026-09-29";
const MONDAY = "2026-09-28";
const SUNDAY = "2026-10-04";

function ctx(over: Partial<TripContext> = {}): TripContext {
  return {
    area: "Toledo y Guadamur",
    date: TUESDAY,
    startTime: "10:00",
    endTime: "18:00",
    profile: "general",
    transport: "walk",
    stepFreeRequired: false,
    ...over,
  };
}

/** Build a trip by adding sites one by one through proposals, as the UI does. */
function tripWith(ids: string[], context: TripContext, options?: PlannerOptions): Trip {
  let trip = emptyTrip(context);
  const r = schedule(ids, context, options);
  expect(r.ok, r.reason).toBe(true);
  const p: PlannerProposal = {
    ok: true,
    baseRevision: 0,
    before: [],
    after: r.stops,
    added: ids,
    removed: [],
    warnings: r.warnings,
    context,
  };
  const applied = applyProposal(trip, p, "2026-09-29T08:00:00.000Z");
  if ("error" in applied) throw new Error(applied.error);
  trip = applied;
  return trip;
}

const verifiedMuseum: Site = {
  ...getSite(SR)!,
  id: "fx-museum",
  hours: {
    status: "verified",
    verifiedAt: "2026-09-01",
    weekly: { 2: [{ open: "10:00", close: "14:00" }] },
  },
  access: { status: "verified", stepFree: true },
};
const fixtures: PlannerOptions = { getSite: (id) => (id === verifiedMuseum.id ? verifiedMuseum : getSite(id)) };

describe("travel estimate", () => {
  it("is approximate, at least 5 minutes, and adds parking for car", () => {
    const a = getSite(SR)!.coordinates;
    const b = getSite(CRISTO)!.coordinates;
    const walk = estimateTravelMinutes(a, b, "walk");
    expect(walk.approximate).toBe(true);
    expect(walk.minutes).toBeGreaterThanOrEqual(5);
    expect(estimateTravelMinutes(a, a, "walk").minutes).toBe(5);
    const car = estimateTravelMinutes(a, getSite(GUARRAZAR)!.coordinates, "car");
    expect(car.minutes).toBeGreaterThan(10);
    expect(car.minutes).toBeLessThan(60);
  });
});

describe("isoWeekday", () => {
  it("computes weekdays from the calendar date", () => {
    expect(isoWeekday(TUESDAY)).toBe(2);
    expect(isoWeekday(MONDAY)).toBe(1);
    expect(isoWeekday(SUNDAY)).toBe(7);
  });
  it("is DST-safe on the Europe/Madrid change days", () => {
    expect(isoWeekday("2026-10-25")).toBe(7);
    expect(isoWeekday("2026-03-29")).toBe(7);
    expect(isoWeekday("2026-10-26")).toBe(1);
    expect(isoWeekday("2026-03-30")).toBe(1);
  });
  it("rejects malformed dates", () => {
    expect(isoWeekday("2026-02-30")).toBeNull();
    expect(isoWeekday("29/09/2026")).toBeNull();
  });
});

describe("schedule", () => {
  it("happy path: sequential stops with travel and buffer", () => {
    const r = schedule([SR, CRISTO], ctx());
    expect(r.ok).toBe(true);
    const [a, b] = r.stops;
    expect(a.arrival).toBe(parseClock("10:00"));
    expect(a.travelMinutesFromPrevious).toBe(0);
    expect(a.departure).toBe(parseClock("11:00"));
    expect(b.travelMinutesFromPrevious).toBeGreaterThanOrEqual(5);
    expect(b.arrival).toBe(a.departure + 10 + b.travelMinutesFromPrevious);
    expect(b.departure).toBe(b.arrival + 30);
    // Demo hours are examples: stops stay provisional.
    expect(a.status).toBe("provisional");
    expect(a.warnings).toContain(WARN_EXAMPLE_HOURS);
  });

  it("schedules verified hours as 'scheduled' without warnings", () => {
    const r = schedule(["fx-museum"], ctx({ stepFreeRequired: true }), fixtures);
    expect(r.ok).toBe(true);
    expect(r.stops[0].status).toBe("scheduled");
    expect(r.stops[0].warnings).toEqual([]);
  });

  it("rejects weekday closures (museums closed on Monday)", () => {
    const r = schedule([SR], ctx({ date: MONDAY }));
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("Museo de los Concilios");
    expect(r.reason).toContain("lunes");
  });

  it("waits until the next window opens", () => {
    const r = schedule([SR], ctx({ startTime: "15:00" }));
    expect(r.ok).toBe(true);
    expect(r.stops[0].arrival).toBe(parseClock("15:00"));
    expect(r.stops[0].departure).toBe(parseClock("17:00"));
  });

  it("qualifies conflicts based on example hours and states verified ones as fact", () => {
    const example = schedule([SR], ctx({ date: MONDAY }));
    expect(example.ok).toBe(false);
    expect(example.reason).toBe(
      "Según el horario de ejemplo (no verificado), Museo de los Concilios y de la Cultura Visigoda cerraría los lunes",
    );
    const verified = schedule(["fx-museum"], ctx({ date: MONDAY }), fixtures);
    expect(verified.ok).toBe(false);
    expect(verified.reason).toBe("Museo de los Concilios y de la Cultura Visigoda cierra los lunes");
  });

  it("records the wait until opening instead of counting it as visit time", () => {
    const r = schedule([SR], ctx({ startTime: "15:00" }));
    const [stop] = r.stops;
    expect(stop.arrival).toBe(parseClock("15:00"));
    expect(stop.visitStart).toBe(parseClock("16:00"));
    expect(stop.status).toBe("provisional");
    expect(stop.warnings).toContain("Espera hasta las 16:00 (abriría a esa hora según el horario de ejemplo)");
    const onTime = schedule(["fx-museum"], ctx(), fixtures).stops[0];
    expect(onTime.visitStart).toBe(onTime.arrival);
    const early = schedule(["fx-museum"], ctx({ startTime: "09:00" }), fixtures).stops[0];
    expect(early.warnings).toEqual(["Espera hasta las 10:00 (abre a esa hora)"]);
    expect(early.status).toBe("provisional");
  });

  it("explains when the visit does not fit before closing", () => {
    const r = schedule([SR], ctx({ date: SUNDAY, startTime: "14:00" }));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(
      "Según el horario de ejemplo (no verificado), Museo de los Concilios y de la Cultura Visigoda cerraría a las 14:30 y no daría tiempo a la visita",
    );
  });

  it("explains when the site is already closed on arrival", () => {
    const r = schedule([SR], ctx({ date: SUNDAY, startTime: "15:00" }));
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("cerraría a las 14:30");
  });

  it("rejects plans ending after endTime", () => {
    const r = schedule([SR], ctx({ endTime: "10:30" }));
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("hora de fin (10:30)");
  });

  it("marks stops provisional when no date is chosen", () => {
    const r = schedule([SR], ctx({ date: null, startTime: "08:00" }));
    expect(r.ok).toBe(true);
    expect(r.stops[0].status).toBe("provisional");
    expect(r.stops[0].warnings).toContain(WARN_NO_DATE);
    expect(r.stops[0].arrival).toBe(parseClock("08:00"));
  });

  it("flags unknown hours as provisional", () => {
    const r = schedule([VEGA], ctx());
    expect(r.ok).toBe(true);
    expect(r.stops[0].status).toBe("provisional");
    expect(r.stops[0].warnings).toContain(WARN_UNKNOWN_HOURS);
  });

  it("treats alwaysOpen sites as open at any time", () => {
    const r = schedule([GUARRAZAR], ctx({ date: MONDAY, startTime: "07:00", transport: "car" }));
    expect(r.ok).toBe(true);
    expect(r.stops[0].arrival).toBe(parseClock("07:00"));
  });

  it("uses Sunday hours on the DST change days", () => {
    for (const date of ["2026-10-25", "2026-03-29"]) {
      expect(schedule([SR], ctx({ date, startTime: "16:00" })).ok).toBe(false);
      expect(schedule([SR], ctx({ date, startTime: "10:00" })).ok).toBe(true);
    }
  });

  it("warns about unverified step-free access", () => {
    const r = schedule([SR], ctx({ stepFreeRequired: true }));
    expect(r.ok).toBe(true);
    expect(r.stops[0].status).toBe("provisional");
    expect(r.stops[0].warnings).toContain(WARN_ACCESS);
    expect(schedule([SR], ctx()).stops[0].warnings).not.toContain(WARN_ACCESS);
  });

  it("rejects walking legs over 6 km and suggests the car", () => {
    const r = schedule([SR, GUARRAZAR], ctx());
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/coche/);
    expect(schedule([SR, GUARRAZAR], ctx({ transport: "car" })).ok).toBe(true);
  });

  it("rejects duplicate site IDs", () => {
    const r = schedule([SR, SR], ctx());
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("repetido");
  });
});

describe("proposals", () => {
  it("proposeAdd picks the insertion with least travel", () => {
    const trip = tripWith([SR, VEGA], ctx({ date: null }));
    const p = proposeAdd(trip, CRISTO);
    expect(p.ok).toBe(true);
    expect(p.after.map((s) => s.siteId)).toEqual([SR, CRISTO, VEGA]);
    expect(p.added).toEqual([CRISTO]);
    expect(p.removed).toEqual([]);
    expect(p.before).toBe(trip.stops);
    expect(p.baseRevision).toBe(trip.revision);
  });

  it("proposeAdd appends to an empty trip", () => {
    const trip = emptyTrip(ctx());
    const p = proposeAdd(trip, SR);
    expect(p.ok).toBe(true);
    expect(p.after.map((s) => s.siteId)).toEqual([SR]);
    const applied = applyProposal(trip, p, "2026-09-29T09:00:00.000Z");
    expect("error" in applied).toBe(false);
    if (!("error" in applied)) {
      expect(applied.revision).toBe(1);
      expect(applied.updatedAt).toBe("2026-09-29T09:00:00.000Z");
      expect(applied.stops).toEqual(p.after);
    }
  });

  it("proposeAdd refuses duplicates", () => {
    const trip = tripWith([SR], ctx());
    const p = proposeAdd(trip, SR);
    expect(p.ok).toBe(false);
    expect(p.reason).toBe("Ya está en tu viaje");
    expect(p.after).toEqual(trip.stops);
  });

  it("proposeAdd reports the append reason when nothing fits (walk too far)", () => {
    const trip = tripWith([SR], ctx());
    const p = proposeAdd(trip, GUARRAZAR);
    expect(p.ok).toBe(false);
    expect(p.reason).toMatch(/coche/);
    expect(p.after.map((s) => s.siteId)).toEqual([SR, GUARRAZAR]);
  });

  it("applyProposal rejects stale and invalid proposals", () => {
    const trip = tripWith([SR], ctx());
    const p = proposeAdd(trip, CRISTO);
    const next = applyProposal(trip, p, "2026-09-29T10:00:00.000Z");
    if ("error" in next) throw new Error(next.error);
    expect(applyProposal(next, p, "2026-09-29T10:01:00.000Z")).toEqual({ error: "stale" });
    expect(applyProposal(trip, proposeAdd(trip, SR), "x")).toEqual({ error: "invalid" });
  });

  it("proposeMove revalidates the remainder", () => {
    const trip = tripWith([SR, VEGA], ctx({ date: SUNDAY, startTime: "13:00" }));
    const p = proposeMove(trip, VEGA, 0);
    expect(p.after.map((s) => s.siteId)).toEqual([VEGA, SR]);
    expect(p.ok).toBe(false);
    expect(p.reason).toContain("cerraría a las 14:30");
    const back = proposeMove(trip, SR, 5);
    expect(back.after.map((s) => s.siteId)).toEqual([VEGA, SR]);
  });

  it("proposeRemove reschedules the rest", () => {
    const trip = tripWith([SR, CRISTO, VEGA], ctx());
    const p = proposeRemove(trip, CRISTO);
    expect(p.ok).toBe(true);
    expect(p.removed).toEqual([CRISTO]);
    expect(p.after.map((s) => s.siteId)).toEqual([SR, VEGA]);
    expect(proposeRemove(trip, GUARRAZAR).ok).toBe(false);
  });

  it("proposeFromRoute switches to car and applies context and route", () => {
    const trip = tripWith([CRISTO], ctx());
    const route = getRoute("route-tesoro")!;
    const p = proposeFromRoute(trip, route);
    expect(p.ok, p.reason).toBe(true);
    expect(p.context.transport).toBe("car");
    expect(p.routeId).toBe("route-tesoro");
    expect(p.warnings.some((w) => w.includes("coche"))).toBe(true);
    expect(p.after.map((s) => s.siteId)).toEqual([SR, GUARRAZAR, CASTILLO]);
    expect(p.removed).toEqual([CRISTO]);
    expect(p.added).toEqual([SR, GUARRAZAR, CASTILLO]);
    const applied = applyProposal(trip, p, "2026-09-29T11:00:00.000Z");
    if ("error" in applied) throw new Error(applied.error);
    expect(applied.context.transport).toBe("car");
    expect(applied.sourceRouteId).toBe("route-tesoro");
    expect(applied.revision).toBe(trip.revision + 1);
  });

  it("reschedule keeps stops under a new context", () => {
    const trip = tripWith([SR], ctx());
    const p = reschedule(trip, ctx({ date: MONDAY }));
    expect(p.ok).toBe(false);
    expect(p.after.map((s) => s.siteId)).toEqual([SR]);
    const later = reschedule(trip, ctx({ startTime: "16:00" }));
    expect(later.ok).toBe(true);
    const applied = applyProposal(trip, later, "2026-09-29T12:00:00.000Z");
    if ("error" in applied) throw new Error(applied.error);
    expect(applied.context.startTime).toBe("16:00");
    expect(formatClock(applied.stops[0].arrival)).toBe("16:00");
  });
});

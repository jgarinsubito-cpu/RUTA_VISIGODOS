import { describe, expect, it } from "vitest";
import { formatClock, proposeAdd, proposeRemove, reschedule } from "@/domain/planner";
import { actions, getAppState } from "./store";

describe("store.setContext", () => {
  it("lets an empty trip adopt new preferences, but only proposals change a trip with stops", () => {
    actions.setContext({ transport: "car", startTime: "09:00" });
    let s = getAppState();
    expect(s.trip.stops).toHaveLength(0);
    expect(s.trip.context.transport).toBe("car");
    expect(s.trip.context.startTime).toBe("09:00");
    expect(s.previousTrip).toBeNull();

    actions.propose(proposeAdd(s.trip, "site-cristo-luz"));
    expect(actions.acceptProposal()).toEqual({ ok: true });
    s = getAppState();
    expect(s.trip.stops[0]?.arrival).toBe(9 * 60);

    actions.setContext({ transport: "walk" });
    s = getAppState();
    expect(s.context.transport).toBe("walk");
    expect(s.trip.context.transport).toBe("car");
  });
});

describe("store.acceptProposal and undo", () => {
  it("keep preferences the visitor changed but has not applied (diverged context)", () => {
    // Continues from the trip above: stops scheduled by car, preferences switched to walk.
    let s = getAppState();
    expect(s.context.transport).toBe("walk");
    expect(s.trip.context.transport).toBe("car");

    actions.propose(proposeAdd(s.trip, "site-san-roman"));
    expect(actions.acceptProposal()).toEqual({ ok: true });
    s = getAppState();
    expect(s.trip.stops.map((st) => st.siteId)).toContain("site-san-roman");
    expect(s.context.transport).toBe("walk");
    expect(s.trip.context.transport).toBe("car");

    actions.undo();
    s = getAppState();
    expect(s.trip.stops.map((st) => st.siteId)).not.toContain("site-san-roman");
    expect(s.context.transport).toBe("walk");
  });

  it("adopts the proposal's settings when it changes them (reschedule) and restores them on undo", () => {
    actions.setContext({ transport: "car" });
    let s = getAppState();
    expect(s.context.transport).toBe("car");
    actions.propose(reschedule(s.trip, { ...s.trip.context, startTime: "11:00" }));
    expect(actions.acceptProposal()).toEqual({ ok: true });
    s = getAppState();
    expect(s.context.startTime).toBe("11:00");
    expect(s.trip.context.startTime).toBe("11:00");

    actions.undo();
    s = getAppState();
    expect(s.trip.context.startTime).toBe("09:00");
    expect(s.context.startTime).toBe("09:00");
  });

  it("gives add- and remove-specific feedback", () => {
    let s = getAppState();
    actions.propose(proposeAdd(s.trip, "site-vega-baja"));
    actions.acceptProposal();
    s = getAppState();
    const stop = s.trip.stops.find((st) => st.siteId === "site-vega-baja")!;
    expect(s.notice?.text).toBe(`Añadido a tu viaje · ${formatClock(stop.visitStart ?? stop.arrival)}`);

    actions.propose(proposeRemove(s.trip, "site-vega-baja"));
    actions.acceptProposal();
    expect(getAppState().notice?.text).toBe("Quitado de tu viaje");
  });
});

describe("store · proximity alerts", () => {
  it("watches only after the visitor turns them on, and remembers what was announced", () => {
    expect(getAppState().nearbyLive).toBe(false);
    actions.setNearby({ enabled: true });
    expect(getAppState().nearbyLive).toBe(true);

    actions.showNearbyAlert({ siteId: "site-guarrazar", distance: 400, others: 0, coveredIds: ["site-guarrazar"] });
    let s = getAppState();
    expect(s.nearbyAlert?.siteId).toBe("site-guarrazar");
    expect(s.nearby.notified["site-guarrazar"]).toBeTruthy();

    actions.muteNearby("site-guarrazar", "Guarrazar");
    s = getAppState();
    expect(s.nearbyAlert).toBeNull();
    expect(s.nearby.muted).toEqual(["site-guarrazar"]);

    actions.showNearbyAlert({ siteId: "site-san-roman", distance: 40, others: 0, coveredIds: ["site-san-roman"] });
    actions.setNearby({ enabled: false });
    s = getAppState();
    expect(s.nearbyLive).toBe(false);
    expect(s.nearbyAlert).toBeNull();
  });
});

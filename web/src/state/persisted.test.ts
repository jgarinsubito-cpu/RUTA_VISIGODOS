import { describe, expect, it } from "vitest";
import { schedule } from "@/domain/planner";
import type { TripContext } from "@/domain/types";
import { boundConversations, MAX_CONVERSATIONS, MAX_MESSAGES, migrateV1, parseStored, type Conversation } from "./persisted";

const CONTEXT: TripContext = {
  area: "Toledo y Guadamur",
  date: null,
  startTime: "10:00",
  endTime: "18:00",
  profile: "general",
  transport: "walk",
  stepFreeRequired: false,
};

describe("parseStored", () => {
  it("keeps valid parts and drops only the corrupt ones", () => {
    const stops = schedule(["site-san-roman"], CONTEXT).stops;
    const raw = JSON.stringify({
      context: { ...CONTEXT, startTime: "25:99" },
      trip: { id: "trip-local", revision: 2, context: CONTEXT, stops, updatedAt: "x" },
      savedSiteIds: ["site-guarrazar", "site-borrado"],
      conversations: "not a list",
      tour: null,
    });
    const parsed = parseStored(raw)!;
    expect(parsed.context).toBeUndefined();
    expect(parsed.trip?.stops).toEqual(stops);
    expect(parsed.savedSiteIds).toEqual(["site-guarrazar"]);
    expect(parsed.conversations).toBeUndefined();
    expect(parsed.tour).toBeNull();
  });

  it("moves an area the catalog no longer has to the whole region", () => {
    const parsed = parseStored(JSON.stringify({ context: { ...CONTEXT, area: "Marte" } }))!;
    expect(parsed.context).toEqual({ ...CONTEXT, area: "Toledo y Guadamur" });
    expect(parseStored(JSON.stringify({ context: { ...CONTEXT, area: "Guadamur" } }))!.context?.area).toBe("Guadamur");
  });

  it("returns null for unreadable storage", () => {
    expect(parseStored("{not json")).toBeNull();
    expect(parseStored("[]")).toBeNull();
    expect(parseStored(null)).toBeNull();
  });
});

describe("migrateV1", () => {
  it("rebuilds a v1 trip (text warnings) from the same stops and settings", () => {
    const v1 = JSON.stringify({
      context: CONTEXT,
      trip: {
        id: "trip-local",
        revision: 3,
        context: CONTEXT,
        stops: [
          { siteId: "site-san-roman", arrival: 600, departure: 660, travelMinutesFromPrevious: 0, status: "provisional", warnings: ["Horario de ejemplo (no verificado)"] },
          { siteId: "site-cristo-luz", arrival: 676, departure: 706, travelMinutesFromPrevious: 6, status: "provisional", warnings: [] },
        ],
        sourceRouteId: "route-capital",
        updatedAt: "2026-09-29T08:00:00.000Z",
      },
      previousTrip: { stops: [] },
      savedSiteIds: ["site-guarrazar"],
    });
    const migrated = migrateV1(v1)!;
    expect(migrated.trip?.stops.map((s) => s.siteId)).toEqual(["site-san-roman", "site-cristo-luz"]);
    expect(migrated.trip?.stops[0].warnings).toContainEqual({ code: "example-hours" });
    expect(migrated.trip?.revision).toBe(4);
    expect(migrated.trip?.sourceRouteId).toBe("route-capital");
    expect(migrated.previousTrip).toBeNull();
    expect(migrated.savedSiteIds).toEqual(["site-guarrazar"]);
  });
});

describe("boundConversations", () => {
  it("keeps the newest conversations and their latest messages", () => {
    const conversations: Conversation[] = Array.from({ length: MAX_CONVERSATIONS + 5 }, (_, i) => ({
      id: `c${i}`,
      title: `Chat ${i}`,
      updatedAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
      messages: Array.from({ length: i === 0 ? MAX_MESSAGES + 10 : 1 }, (_, j) => ({
        id: `m${j}`,
        role: "user" as const,
        text: `${j}`,
        createdAt: "x",
      })),
    }));
    const bounded = boundConversations(conversations);
    expect(bounded).toHaveLength(MAX_CONVERSATIONS);
    expect(bounded[0].id).toBe(`c${MAX_CONVERSATIONS + 4}`);
    expect(bounded.some((c) => c.id === "c0")).toBe(false);
    const long = boundConversations([conversations[0]])[0];
    expect(long.messages).toHaveLength(MAX_MESSAGES);
    expect(long.messages.at(-1)?.text).toBe(`${MAX_MESSAGES + 9}`);
  });
});

describe("stored preferences", () => {
  it("keeps valid preferences and drops unknown access needs", () => {
    const ok = parseStored(JSON.stringify({ preferences: { interests: ["arte"], pace: "full", group: "couple", accessNeeds: ["quiet"] } }))!;
    expect(ok.preferences).toEqual({ interests: ["arte"], pace: "full", group: "couple", accessNeeds: ["quiet"] });
    const bad = parseStored(JSON.stringify({ preferences: { interests: [], pace: null, group: null, accessNeeds: ["teleport"] } }))!;
    expect(bad.preferences).toBeUndefined();
  });
});

describe("stored guided tour", () => {
  it("reads a tour saved before stops existed into the current shape", () => {
    const old = { routeId: "route-tesoro", mode: "live", currentIndex: 1, visitedSiteIds: ["site-san-roman"], startedAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:30:00Z" };
    const parsed = parseStored(JSON.stringify({ tour: old }));
    expect(parsed?.tour).toEqual({
      tourId: "route-tesoro",
      mode: "live",
      currentIndex: 1,
      visitedStopIds: ["site-san-roman"],
      startedAt: "2026-10-01T10:00:00Z",
      updatedAt: "2026-10-01T10:30:00Z",
    });
  });
});

describe("parseStored · proximity alerts", () => {
  it("keeps the visitor's choices and drops muted places the catalog no longer has", () => {
    const nearby = { enabled: true, visigothic: true, other: false, muted: ["site-guarrazar", "site-borrado"], notified: { "site-guarrazar": "2026-11-12T10:00:00.000Z" } };
    expect(parseStored(JSON.stringify({ nearby }))!.nearby).toEqual({ ...nearby, muted: ["site-guarrazar"] });
  });

  it("ignores a corrupt part instead of turning the alerts on or off by accident", () => {
    expect(parseStored(JSON.stringify({ nearby: { enabled: "yes" } }))!.nearby).toBeUndefined();
  });
});

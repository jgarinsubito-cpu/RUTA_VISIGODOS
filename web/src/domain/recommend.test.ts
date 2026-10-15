import { describe, expect, it } from "vitest";
import { getRoute, getSite, sites } from "@/data/content";
import { answerLocally } from "./assistant";
import { matchingInterests, needsStepFree, rankSites, routeInterestScore } from "./recommend";
import { EMPTY_PREFERENCES, type AssistantRequest, type VisitorPreferences } from "./types";

const prefs = (over: Partial<VisitorPreferences>): VisitorPreferences => ({ ...EMPTY_PREFERENCES, ...over });

describe("recommendations", () => {
  it("puts places matching the visitor's interests first without hiding any", () => {
    const ranked = rankSites(sites(), prefs({ interests: ["tesoro"] }));
    expect(ranked).toHaveLength(sites().length);
    expect(ranked[0].id).toBe("site-guarrazar");
    expect(rankSites(sites(), EMPTY_PREFERENCES).map((s) => s.id)).toEqual(sites().map((s) => s.id));
  });

  it("scores routes by the interests of their stops", () => {
    const p = prefs({ interests: ["tesoro", "territorio"] });
    expect(routeInterestScore(getRoute("route-tesoro")!, getSite, p)).toBeGreaterThan(routeInterestScore(getRoute("route-capital")!, getSite, p));
    expect(matchingInterests(getSite("site-guarrazar")!, p)).toEqual(["tesoro", "territorio"]);
  });

  it("treats wheelchair, reduced mobility and strollers as step-free needs", () => {
    expect(needsStepFree(["stroller"])).toBe(true);
    expect(needsStepFree(["quiet", "hearing"])).toBe(false);
  });

  it("lets interests pick the route and says what is unknown for each access need", () => {
    const req: AssistantRequest = {
      message: "Planifica mi día",
      history: [],
      context: { area: "Toledo y Guadamur", date: null, startTime: "10:00", endTime: "18:00", profile: "general", transport: "car", stepFreeRequired: false },
      tripSiteIds: [],
      preferences: prefs({ interests: ["tesoro"], accessNeeds: ["wheelchair", "quiet"], pace: "relaxed" }),
    };
    const a = answerLocally(req);
    expect(a.suggestedAction).toEqual({ type: "use-route", routeId: "route-tesoro" });
    expect(a.text).toContain("acceso sin escalones");
    expect(a.text).toContain("lugares tranquilos");
    expect(a.text).toContain("menos paradas");
  });
});

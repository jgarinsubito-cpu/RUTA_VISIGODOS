import { describe, expect, it } from "vitest";
import type { StopAudio } from "./types";
import type { TourStop } from "./tour";
import { DRIVE_RURAL_RADIUS_M, DRIVE_URBAN_RADIUS_M, afterEnded, arrivedAt, driveItems, driveRadius, narrationFor, programmeMinutes } from "./drive";

const audio = (s: number): StopAudio => ({ src: `/a${s}.mp3`, durationSeconds: s, label: "Relato", transcript: "x".repeat(50) });

function stop(id: string, lat: number, kind: "monument" | "landscape" = "landscape", withAudio = true): TourStop {
  const coordinates = { lat, lng: -4.1, approximate: false };
  return {
    id,
    name: id,
    coordinates,
    radius: 100,
    manualOnly: false,
    site: { id, kind, coordinates } as TourStop["site"],
    stop: withAudio ? ({ id, audio: audio(60) } as TourStop["stop"]) : null,
  };
}

/** About `km` north of latitude 39.8 (one degree ≈ 111.2 km). */
const at = (km: number) => 39.8 + km / 111.195;
const STOPS = [stop("a", at(0)), stop("b", at(5)), stop("c", at(10), "landscape", false), stop("d", at(15))];
const fixAt = (km: number, accuracy = 20) => ({ lat: at(km), lng: -4.1, accuracy });

describe("driveItems", () => {
  it("puts each stretch before the stop it leads to, and skips stops without audio", () => {
    const items = driveItems(STOPS, [{ toStopId: "b", audio: audio(120) }, { toStopId: "c", audio: audio(90) }]);
    expect(items.map((i) => i.id)).toEqual(["stop:a", "leg:b", "stop:b", "leg:c", "stop:d"]);
    expect(items[1].title).toBe("De camino a b");
    expect(programmeMinutes(items)).toBe(7);
  });
});

describe("arrival", () => {
  it("gives the countryside a wider zone than the town", () => {
    expect(driveRadius(stop("x", 0, "monument"))).toBe(DRIVE_URBAN_RADIUS_M);
    expect(driveRadius(stop("y", 0))).toBe(DRIVE_RURAL_RADIUS_M);
  });

  it("finds the next stop reached, ahead only, and ignores imprecise fixes", () => {
    expect(arrivedAt(STOPS, fixAt(5.1), 1, new Set([0]))).toBe(1);
    expect(arrivedAt(STOPS, fixAt(2.5), 1, new Set([0]))).toBeNull();
    expect(arrivedAt(STOPS, fixAt(5.1, 500), 1, new Set([0]))).toBeNull();
    // Already reached, or behind the current point of the programme.
    expect(arrivedAt(STOPS, fixAt(5.1), 1, new Set([0, 1]))).toBeNull();
    expect(arrivedAt(STOPS, fixAt(0), 1, new Set())).toBeNull();
  });
});

describe("what plays next", () => {
  const items = driveItems(STOPS, [{ toStopId: "b", audio: audio(120) }]);

  it("plays a stretch on its own but makes a narration wait for arrival", () => {
    expect(afterEnded(items, 0)).toEqual({ next: 1, autoplay: true });
    expect(afterEnded(items, 1)).toEqual({ next: 2, autoplay: false });
    expect(afterEnded(items, items.length - 1)).toEqual({ next: null, autoplay: false });
  });

  it("knows which narration belongs to a stop", () => {
    expect(narrationFor(items, 1)).toBe(2);
    expect(narrationFor(items, 2)).toBeNull();
  });
});

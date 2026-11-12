/**
 * Car mode: a route heard as one programme. Pure rules; the player is components/drive/DriveMode.
 *
 * The programme alternates two kinds of audio:
 * - a stretch (`Route.legs`), heard on the way, written to need no looking: it plays on its own
 *   after the previous stop;
 * - a stop's narration, which asks the visitor to look ("mira la torre"): it plays on its own only
 *   on arrival (with the position on), never kilometres before, and never cuts the audio playing.
 *
 * Arrival zones are wider than on foot (the car stops where it can, not at the exact point).
 * Automatic playback happens only after the visitor pressed «Empezar» (PLAN.md: no audio by itself).
 */
import { distanceMeters, type GeoFix } from "./geo";
import type { RouteLeg, StopAudio } from "./types";
import type { TourStop } from "./tour";

/** In town by car: the car park or the street nearby. */
export const DRIVE_URBAN_RADIUS_M = 200;
/** In the countryside: the lay-by, the track's end, the viewpoint. */
export const DRIVE_RURAL_RADIUS_M = 450;
export const DRIVE_APPROXIMATE_EXTRA_M = 100;
/** Fixes less precise than this cannot place the car at a stop. */
export const DRIVE_MAX_ACCURACY_M = 150;
/** Arrival is looked for at the next stops only: a route that passes a stop twice keeps its order. */
export const LOOKAHEAD = 3;

export interface DriveItem {
  /** "leg:<stopId>" or "stop:<stopId>". */
  id: string;
  kind: "leg" | "stop";
  /** Index of the tour stop this item belongs to (a leg: the stop it leads to). */
  stopIndex: number;
  title: string;
  audio: StopAudio;
}

/** The programme: for each stop, the stretch that leads to it (if any) and then its narration. */
export function driveItems(stops: readonly TourStop[], legs: readonly RouteLeg[] = []): DriveItem[] {
  const legTo = new Map(legs.map((l) => [l.toStopId, l.audio]));
  return stops.flatMap((t, i) => {
    const items: DriveItem[] = [];
    const leg = legTo.get(t.id);
    if (leg) items.push({ id: `leg:${t.id}`, kind: "leg", stopIndex: i, title: `De camino a ${t.name}`, audio: leg });
    const audio = t.stop?.audio;
    if (audio) items.push({ id: `stop:${t.id}`, kind: "stop", stopIndex: i, title: t.name, audio });
    return items;
  });
}

export function driveRadius(t: Pick<TourStop, "site" | "coordinates">): number {
  const rural = t.site.kind === "archaeological" || t.site.kind === "landscape";
  const base = rural ? DRIVE_RURAL_RADIUS_M : DRIVE_URBAN_RADIUS_M;
  return t.coordinates.approximate ? base + DRIVE_APPROXIMATE_EXTRA_M : base;
}

/**
 * The stop the car has just reached: the nearest of the next LOOKAHEAD stops not yet reached
 * (from `from`) whose zone contains the fix. Indoor stops count too: the car parks outside.
 */
export function arrivedAt(stops: readonly TourStop[], fix: GeoFix, from: number, reached: ReadonlySet<number>): number | null {
  if (!(fix.accuracy <= DRIVE_MAX_ACCURACY_M)) return null;
  let best: number | null = null;
  let bestDistance = Infinity;
  for (let i = Math.max(0, from); i < Math.min(stops.length, from + LOOKAHEAD); i++) {
    if (reached.has(i)) continue;
    const d = distanceMeters(fix, stops[i].coordinates);
    if (d <= driveRadius(stops[i]) && d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  }
  return best;
}

/** The narration to cue on arriving at stop `stopIndex`, if it has one. */
export function narrationFor(items: readonly DriveItem[], stopIndex: number): number | null {
  const i = items.findIndex((it) => it.kind === "stop" && it.stopIndex === stopIndex);
  return i === -1 ? null : i;
}

/**
 * What follows when an item ends: a stretch plays on its own (it is heard on the way). A narration
 * waits: for arrival with the position on, or for «Siguiente» without it.
 */
export function afterEnded(items: readonly DriveItem[], index: number): { next: number | null; autoplay: boolean } {
  const next = index + 1 < items.length ? index + 1 : null;
  return { next, autoplay: next !== null && items[next].kind === "leg" };
}

/** Total listening time of the programme, in minutes (rounded up). */
export function programmeMinutes(items: readonly DriveItem[]): number {
  return Math.ceil(items.reduce((s, it) => s + it.audio.durationSeconds, 0) / 60);
}

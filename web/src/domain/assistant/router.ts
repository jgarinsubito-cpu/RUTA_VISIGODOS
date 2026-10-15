/**
 * Request router (PLAN.md, "Assistant behavior and reliability"): heritage, travel, mixed or unknown.
 * Keyword based, accent-insensitive (word lists in ./vocabulary).
 */
import { perCatalog } from "@/data/content";
import type { AssistantAnswer } from "@/domain/types";
import { normalize } from "./text";
import { GENERIC_HERITAGE_KEYWORDS, PLAN_KEYWORDS, TRAVEL_KEYWORDS, keywordHits } from "./vocabulary";

export { TRAVEL_KEYWORDS, keywordHits } from "./vocabulary";

export type Intent = AssistantAnswer["intent"];

/** Generic historical wording plus the current catalog's own vocabulary. */
export const heritageKeywords = perCatalog((catalog) => [...GENERIC_HERITAGE_KEYWORDS, ...catalog.showcase.heritageKeywords]);

export function classifyIntent(message: string): Intent {
  const travel = keywordHits(message, TRAVEL_KEYWORDS).length > 0;
  const heritage = keywordHits(message, heritageKeywords()).length > 0;
  if (travel && heritage) return "mixed";
  if (travel) return "travel";
  if (heritage) return "heritage";
  return "unknown";
}

/** True when the visitor asks for a plan/itinerary rather than a single fact. */
export function isPlanRequest(message: string): boolean {
  const n = normalize(message);
  if (/\btengo (\d+|una|dos|tres|cuatro) horas?\b/.test(n)) return true;
  return keywordHits(message, PLAN_KEYWORDS).length > 0;
}

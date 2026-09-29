/**
 * Request router (PLAN.md, "Assistant behavior and reliability"): heritage, travel, mixed or unknown.
 * Keyword based, accent-insensitive. Entries ending in "*" match any word with that prefix.
 */
import type { AssistantAnswer } from "@/domain/types";
import { hasPhrase, normalize } from "./text";

export type Intent = AssistantAnswer["intent"];

export const TRAVEL_KEYWORDS = [
  "horario*", "abierto*", "abre", "abren", "cierra*", "llegar", "llego", "llega", "coche", "aparca*",
  "parking", "cuanto tarda", "cuanto tiempo", "cuanto dura", "tarda*", "dura", "duracion", "plan",
  "planes", "planifica*", "planea*", "organiza*", "ruta*", "itinerario*", "recorrido*", "viaje*",
  "medio dia", "un dia", "una manana", "una tarde", "fin de semana", "nino*", "familia*", "carrito",
  "accesib*", "silla de ruedas", "escalon*", "entrada*", "precio*", "cuesta dinero", "visitar",
  "visita", "ver en", "que ver", "a pie", "andando", "caminando", "distancia", "lejos", "cerca",
  "transporte", "autobus", "tren", "anadir", "anade", "incluir", "mi viaje", "horas", "cuando abre",
];

export const HERITAGE_KEYWORDS = [
  "historia*", "historic*", "visigod*", "rey", "reyes", "reina", "corona*", "concilio*", "tesoro*",
  "que es", "que era", "que son", "que eran", "por que", "quien fue", "quienes fueron", "siglo*",
  "recesvinto", "recaredo", "leovigildo", "wamba", "suintila", "rodrigo", "arqueolog*", "excavacion*",
  "yacimiento*", "palacio*", "palatino", "capital", "corte", "reino", "votiva*", "hallazgo*",
  "descubri*", "capitel*", "reaprovecha*", "mezquita", "califal", "epoca", "origen", "significado",
  "leyenda*", "tradicion*", "cuentame", "hablame", "explicame", "piezas", "obispo*", "iglesia",
];

function matches(normalized: string, words: string[], keyword: string): boolean {
  if (keyword.endsWith("*")) {
    const prefix = keyword.slice(0, -1);
    return words.some((w) => w.startsWith(prefix));
  }
  return hasPhrase(normalized, keyword);
}

export function keywordHits(message: string, keywords: string[]): string[] {
  const normalized = normalize(message);
  const words = normalized ? normalized.split(" ") : [];
  return keywords.filter((k) => matches(normalized, words, k));
}

export function classifyIntent(message: string): Intent {
  const travel = keywordHits(message, TRAVEL_KEYWORDS).length > 0;
  const heritage = keywordHits(message, HERITAGE_KEYWORDS).length > 0;
  if (travel && heritage) return "mixed";
  if (travel) return "travel";
  if (heritage) return "heritage";
  return "unknown";
}

const PLAN_KEYWORDS = [
  "plan", "planes", "planifica*", "planea*", "organiza*", "itinerario*", "recorrido*", "ruta*",
  "medio dia", "un dia", "una manana", "una tarde", "fin de semana", "que ver", "que visitar",
  "que hacer",
];

/** True when the visitor asks for a plan/itinerary rather than a single fact. */
export function isPlanRequest(message: string): boolean {
  const n = normalize(message);
  if (/\btengo (\d+|una|dos|tres|cuatro) horas?\b/.test(n)) return true;
  return keywordHits(message, PLAN_KEYWORDS).length > 0;
}

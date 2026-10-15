/**
 * The assistant's fixed Spanish vocabulary (no content): words that mark travel, history and plan
 * requests, keyword matching, and the phrases that name a site. The route's own names and objects
 * are content (Showcase.heritageKeywords, Site.aliases, Route.keywords). Entries ending in "*"
 * match any word with that prefix.
 */
import type { Site } from "@/domain/types";
import { hasPhrase, normalize, unique } from "./text";

export const TRAVEL_KEYWORDS = [
  "horario*", "abierto*", "abre", "abren", "cierra*", "llegar", "llego", "llega", "coche", "aparca*",
  "parking", "cuanto tarda", "cuanto tiempo", "cuanto dura", "tarda*", "dura", "duracion", "plan",
  "planes", "planifica*", "planea*", "organiza*", "ruta*", "itinerario*", "recorrido*", "viaje*",
  "medio dia", "un dia", "una manana", "una tarde", "fin de semana", "nino*", "familia*", "carrito",
  "accesib*", "silla de ruedas", "escalon*", "entrada*", "precio*", "cuesta dinero", "visitar",
  "visita", "ver en", "que ver", "a pie", "andando", "caminando", "distancia", "lejos", "cerca",
  "transporte", "autobus", "tren", "anadir", "anade", "incluir", "mi viaje", "horas", "cuando abre",
];

/** Generic historical wording; the route's own names and objects come from Showcase.heritageKeywords. */
export const GENERIC_HERITAGE_KEYWORDS = [
  "historia*", "historic*", "que es", "que era", "que son", "que eran", "por que", "quien fue",
  "quienes fueron", "siglo*", "arqueolog*", "excavacion*", "yacimiento*", "hallazgo*", "descubri*",
  "epoca", "origen", "significado", "leyenda*", "tradicion*", "cuentame", "hablame", "explicame", "piezas",
];

export const PLAN_KEYWORDS = [
  "plan", "planes", "planifica*", "planea*", "organiza*", "itinerario*", "recorrido*", "ruta*",
  "medio dia", "un dia", "una manana", "una tarde", "fin de semana", "que ver", "que visitar",
  "que hacer",
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

/**
 * Phrases that name a site: its name, its slug as words and its aliases. Single slug words are not
 * used ("alcazar-de-toledo" must not claim every mention of "Toledo"): shorter names visitors use
 * go in Site.aliases, which the admin checks for clashes (domain/editorial/validate.ts).
 */
export function siteNames(site: Pick<Site, "name" | "slug" | "aliases">): string[] {
  return unique([normalize(site.name), site.slug.replace(/-/g, " "), ...(site.aliases ?? []).map(normalize)]).filter(Boolean);
}

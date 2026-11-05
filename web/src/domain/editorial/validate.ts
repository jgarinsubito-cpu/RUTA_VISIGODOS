/**
 * Cross-record rules for a catalog version, checked before anything is published and again when a
 * snapshot is installed. Errors block publishing; warnings are shown to the validator.
 *
 * These are the rules the demo catalog's tests used to hold (unique ids, links in both directions,
 * stories only on published claims of their own place) plus the ones an admin needs: towns and
 * themes known, aliases that cannot take over another place or a town, and words the assistant
 * matches written the way it matches them.
 */
import type { Catalog, Showcase, Site } from "@/domain/types";
import { normalize } from "@/domain/assistant/text";
import { GENERIC_HERITAGE_KEYWORDS, PLAN_KEYWORDS, TRAVEL_KEYWORDS, keywordHits, siteNames } from "@/domain/assistant/vocabulary";
import type { RecordKind } from "./schema";

export interface CatalogIssue {
  severity: "error" | "warning";
  kind: RecordKind;
  /** Record id ("showcase" for the home page and assistant settings). */
  id: string;
  message: string;
}

const SHOWCASE_ID = "showcase";

/** Lowercase and accent-free, with an optional trailing "*" (router keyword syntax). */
function isMatchForm(keyword: string): boolean {
  const body = keyword.endsWith("*") ? keyword.slice(0, -1) : keyword;
  return body.length > 0 && normalize(body) === body;
}

/** Same ids, in any order. */
function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const v of values) (seen.has(v) ? dup : seen).add(v);
  return [...dup];
}

export function validateCatalog(catalog: Catalog, previous: Catalog | null = null): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const error = (kind: RecordKind, id: string, message: string) => issues.push({ severity: "error", kind, id, message });
  const warn = (kind: RecordKind, id: string, message: string) => issues.push({ severity: "warning", kind, id, message });

  const { sites, claims, stories, routes, showcase } = catalog;
  const stops = catalog.stops ?? [];
  const siteById = new Map(sites.map((s) => [s.id, s]));
  const stopById = new Map(stops.map((s) => [s.id, s]));
  const claimById = new Map(claims.map((c) => [c.id, c]));

  for (const [kind, list] of [
    ["site", sites],
    ["stop", stops],
    ["claim", claims],
    ["story", stories],
    ["route", routes],
  ] as const) {
    for (const id of duplicates(list.map((x) => x.id))) error(kind, id, `El identificador «${id}» está repetido.`);
  }
  for (const [kind, list] of [
    ["site", sites],
    ["route", routes],
  ] as const) {
    for (const slug of duplicates(list.map((x) => x.slug))) {
      const owner = list.find((x) => x.slug === slug)!;
      error(kind, owner.id, `La dirección «${slug}» la usa más de un registro.`);
    }
  }

  validateShowcase(showcase, siteById, error, warn);

  /* Places */
  const localities = new Set(showcase.localities);
  const themes = new Set(showcase.themes);
  for (const site of sites) {
    if (!localities.has(site.locality)) {
      error("site", site.id, `La localidad «${site.locality}» no está en la lista de localidades (Portada y asistente).`);
    }
    for (const theme of site.themes) {
      if (!themes.has(theme)) warn("site", site.id, `El tema «${theme}» no está en la lista de temas: no aparecerá como filtro ni como interés.`);
    }
    const ownClaims = claims.filter((c) => c.siteId === site.id).map((c) => c.id);
    if (!sameIds(ownClaims, site.claimIds)) error("site", site.id, "Sus fichas no coinciden con las fichas que apuntan a este lugar.");
    const ownStories = stories.filter((s) => s.siteId === site.id).map((s) => s.id);
    if (!sameIds(ownStories, site.storyIds)) error("site", site.id, "Sus relatos no coinciden con los relatos que apuntan a este lugar.");
    for (const alias of site.aliases ?? []) {
      if (normalize(alias) !== alias) error("site", site.id, `Escribe el nombre alternativo «${alias}» en minúsculas y sin tildes.`);
    }
    if (site.visigothic && ownClaims.length === 0) {
      warn("site", site.id, "Lugar visigodo sin fichas publicadas: el asistente no podrá contar su historia.");
    }
    if (!site.image) warn("site", site.id, "Sin foto: se mostrará un fondo de color.");
    if (site.hours.status === "verified" && !site.hours.verifiedAt) error("site", site.id, "Un horario verificado necesita la fecha de verificación.");
  }
  validateNames(catalog, error, warn);

  /* Stops */
  for (const stop of stops) {
    const site = siteById.get(stop.siteId);
    if (!site) error("stop", stop.id, `Apunta a un lugar que no existe («${stop.siteId}»).`);
    const ownStories = stories.filter((s) => s.stopId === stop.id).map((s) => s.id);
    if (!sameIds(ownStories, stop.storyIds)) error("stop", stop.id, "Sus relatos no coinciden con los relatos que apuntan a esta parada.");
    if (!stop.coordinates && !stop.indoor) {
      warn("stop", stop.id, "Sin coordenadas: la llegada no se detectará sola; el visitante avanzará a mano.");
    }
    if (stop.coordinates && site && stop.coordinates.approximate) {
      warn("stop", stop.id, "Coordenadas aproximadas: tómalas en campo antes de publicar.");
    }
    if (!stop.audio) warn("stop", stop.id, "Sin locución: se podrá leer el relato, pero no escucharlo grabado.");
    for (const model of stop.models ?? []) {
      if (model.description.trim().length < 40) {
        error("stop", stop.id, `El modelo 3D «${model.name}» necesita una explicación de qué se ha encontrado y qué se propone.`);
      }
    }
    if (stop.audio && stop.audio.transcript.trim().length < 40) {
      error("stop", stop.id, "La transcripción de la locución está incompleta: hace falta el texto entero.");
    }
  }
  const stopsBySite = new Map<string, typeof stops>();
  for (const stop of stops) stopsBySite.set(stop.siteId, [...(stopsBySite.get(stop.siteId) ?? []), stop]);
  for (const [siteId, list] of stopsBySite) {
    for (const order of duplicates(list.map((s) => String(s.order)))) {
      error("stop", list.find((s) => String(s.order) === order)!.id, `Dos paradas de «${siteById.get(siteId)?.name ?? siteId}» tienen el mismo orden (${order}).`);
    }
  }

  /* Claims */
  for (const claim of claims) {
    if (!siteById.has(claim.siteId)) error("claim", claim.id, `Apunta a un lugar que no existe («${claim.siteId}»).`);
    if (claim.status !== "published") error("claim", claim.id, "Solo se publican fichas en estado publicado.");
    if (claim.evidence === "I" && !claim.attribution) error("claim", claim.id, "Una interpretación (I) necesita atribución: de quién es.");
  }

  /* Stories */
  for (const story of stories) {
    if (!siteById.has(story.siteId)) error("story", story.id, `Apunta a un lugar que no existe («${story.siteId}»).`);
    if (story.stopId) {
      const stop = stopById.get(story.stopId);
      if (!stop) error("story", story.id, `Apunta a una parada que no está publicada («${story.stopId}»).`);
      else if (stop.siteId !== story.siteId) error("story", story.id, `Su parada («${story.stopId}») es de otro lugar.`);
    }
    for (const claimId of story.claimIds) {
      const claim = claimById.get(claimId);
      if (!claim) error("story", story.id, `Se basa en una ficha que no está publicada («${claimId}»).`);
      else if (claim.siteId !== story.siteId) error("story", story.id, `Se basa en una ficha de otro lugar («${claimId}»).`);
    }
  }

  /* Routes */
  for (const route of routes) {
    for (const stopId of route.stopIds) {
      if (!siteById.has(stopId)) error("route", route.id, `Tiene una parada que no está publicada («${stopId}»).`);
    }
    for (const stopId of duplicates(route.stopIds)) error("route", route.id, `Repite la parada «${stopId}».`);
    for (const keyword of route.keywords ?? []) {
      if (!isMatchForm(keyword)) error("route", route.id, `Escribe la palabra clave «${keyword}» en minúsculas y sin tildes.`);
    }
    for (const stopId of route.tourStopIds ?? []) {
      const stop = stopById.get(stopId);
      if (!stop) error("route", route.id, `Su recorrido guiado pasa por una parada que no está publicada («${stopId}»).`);
      else if (!route.stopIds.includes(stop.siteId)) {
        error("route", route.id, `Su recorrido guiado pasa por «${stop.name}», de un lugar que no está en la ruta.`);
      }
    }
    for (const stopId of duplicates(route.tourStopIds ?? [])) error("route", route.id, `El recorrido guiado repite la parada «${stopId}».`);
    if (route.illustratedMap) {
      // Pins point to stops the route's tour goes through.
      const tourStops = new Set(route.tourStopIds ?? stops.filter((s) => route.stopIds.includes(s.siteId)).map((s) => s.id));
      for (const pin of route.illustratedMap.pins) {
        if (!tourStops.has(pin.stopId)) error("route", route.id, `El mapa ilustrado tiene un punto de una parada que no está en el recorrido («${pin.stopId}»).`);
      }
      for (const stopId of duplicates(route.illustratedMap.pins.map((p) => p.stopId))) error("route", route.id, `El mapa ilustrado repite la parada «${stopId}».`);
    }
  }

  if (previous) compareWithPrevious(catalog, previous, warn);
  return issues;
}

type Report = (kind: RecordKind, id: string, message: string) => void;

function validateShowcase(showcase: Showcase, siteById: Map<string, Site>, error: Report, warn: Report) {
  const id = SHOWCASE_ID;
  for (const town of duplicates(showcase.localities)) error("showcase", id, `La localidad «${town}» está repetida.`);
  if (showcase.localities.includes(showcase.regionName)) {
    error("showcase", id, "El nombre de la zona completa no puede ser el de una localidad.");
  }
  for (const theme of duplicates(showcase.themes.map(normalize))) error("showcase", id, `El tema «${theme}» está repetido.`);
  if (!siteById.has(showcase.heroSiteId)) error("showcase", id, `El lugar de portada no está publicado («${showcase.heroSiteId}»).`);
  for (const example of showcase.assistantExamples) {
    if (!siteById.has(example.siteId)) error("showcase", id, `Un ejemplo del asistente apunta a un lugar no publicado («${example.siteId}»).`);
  }
  for (const town of showcase.localities) {
    if (!showcase.gettingThere[town]) error("showcase", id, `Falta cómo se llega a ${town}.`);
  }
  const areas = new Set([...showcase.localities, showcase.regionName]);
  for (const area of Object.keys(showcase.areaHints)) {
    if (!areas.has(area)) warn("showcase", id, `La ayuda de zona «${area}» no corresponde a ninguna zona: no se mostrará.`);
  }
  for (const keyword of showcase.heritageKeywords) {
    if (!isMatchForm(keyword)) error("showcase", id, `Escribe la palabra clave «${keyword}» en minúsculas y sin tildes.`);
  }
}

/**
 * Every phrase that names a place must name only that place, and must not be a town or a word the
 * assistant reads as something else ("toledo", "reyes", "plan"): a question mentioning it would
 * otherwise be answered about the wrong place.
 */
function validateNames(catalog: Catalog, error: Report, warn: Report) {
  const owners = new Map<string, Site[]>();
  for (const site of catalog.sites) {
    for (const phrase of siteNames(site)) owners.set(phrase, [...(owners.get(phrase) ?? []), site]);
  }
  for (const [phrase, sites] of owners) {
    if (sites.length > 1) {
      for (const site of sites) error("site", site.id, `«${phrase}» nombra a más de un lugar (${sites.map((s) => s.name).join(", ")}).`);
    }
  }
  const towns = new Set([...catalog.showcase.localities, catalog.showcase.regionName].map(normalize));
  const vocabulary = [...TRAVEL_KEYWORDS, ...PLAN_KEYWORDS, ...GENERIC_HERITAGE_KEYWORDS, ...catalog.showcase.heritageKeywords];
  for (const site of catalog.sites) {
    for (const alias of (site.aliases ?? []).map(normalize)) {
      if (towns.has(alias)) {
        error("site", site.id, `«${alias}» es el nombre de una localidad: cualquier pregunta sobre ella hablaría de ${site.name}.`);
        continue;
      }
      const hits = keywordHits(alias, vocabulary);
      if (hits.length > 0 && !alias.includes(" ")) {
        warn("site", site.id, `«${alias}» también es una palabra que el asistente usa para entender la pregunta («${hits[0]}»).`);
      }
      for (const other of catalog.sites) {
        if (other.id === site.id) continue;
        if (siteNames(other).some((name) => name !== alias && ` ${name} `.includes(` ${alias} `))) {
          warn("site", site.id, `«${alias}» aparece en el nombre de ${other.name}: una pregunta por ese lugar mencionaría también este.`);
        }
      }
    }
  }
}

function compareWithPrevious(catalog: Catalog, previous: Catalog, warn: Report) {
  for (const [kind, now, before] of [
    ["site", catalog.sites, previous.sites],
    ["route", catalog.routes, previous.routes],
  ] as const) {
    const current = new Map<string, { slug: string }>(now.map((x) => [x.id, x]));
    for (const old of before) {
      const next = current.get(old.id);
      if (next && next.slug !== old.slug) {
        warn(kind, old.id, `Cambia de dirección («${old.slug}» → «${next.slug}»): los enlaces compartidos dejarán de funcionar.`);
      }
      if (!next && kind === "site") {
        warn(kind, old.id, `Se retira «${old.id}»: desaparecerá de los viajes y guardados de los visitantes.`);
      }
    }
  }
}

export function hasErrors(issues: readonly CatalogIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}

/**
 * DEMO CATALOG — NOT APPROVED CONTENT.
 *
 * The approved FM-01…FM-10 records, licensed imagery and verified operational data have not been
 * supplied yet (PLAN.md, "Evidence and assumptions"). Everything here is a demo fixture:
 *  - every record has `demo: true` and the UI must show it;
 *  - opening hours have status "example" and must never be presented as live;
 *  - coordinates are approximate;
 *  - claims cite a placeholder source until Urbs Regia validation.
 * Replace this module with the staged-import repository once approved data exists.
 */
import type { Route, Site, Story, ValidatedClaim } from "@/domain/types";

export const DEMO_SOURCE = { title: "Ficha de demostración — pendiente de validación (Urbs Regia)" };

const museumHours = {
  status: "example" as const,
  note: "Horario de ejemplo, no verificado. Consulta la web oficial antes de ir.",
  weekly: {
    2: [{ open: "10:00", close: "14:30" }, { open: "16:00", close: "18:30" }],
    3: [{ open: "10:00", close: "14:30" }, { open: "16:00", close: "18:30" }],
    4: [{ open: "10:00", close: "14:30" }, { open: "16:00", close: "18:30" }],
    5: [{ open: "10:00", close: "14:30" }, { open: "16:00", close: "18:30" }],
    6: [{ open: "10:00", close: "18:30" }],
    7: [{ open: "10:00", close: "14:30" }],
  },
};

export const SITES: Site[] = [
  {
    id: "site-san-roman",
    slug: "museo-concilios-san-roman",
    name: "Museo de los Concilios y de la Cultura Visigoda",
    locality: "Toledo",
    kind: "museum",
    visigothic: true,
    tagline: "La corte visigoda contada desde la iglesia de San Román",
    summary:
      "Instalado en la antigua iglesia de San Román, en la parte alta de la ciudad, reúne piezas de época visigoda de Toledo y su entorno. Es el punto de partida natural para entender la ciudad como sede regia.",
    coordinates: { lat: 39.8594, lng: -4.0272, approximate: true },
    visitMinutes: 60,
    hours: museumHours,
    access: { status: "unknown", note: "Accesibilidad pendiente de verificación." },
    themes: ["capital", "museos", "arte"],
    claimIds: ["claim-toledo-sede", "claim-san-roman-museo", "claim-concilios"],
    storyIds: ["story-concilios"],
    imageTone: "linear-gradient(135deg,#7a6a2e 0%,#b9a25a 55%,#e8dcb5 100%)",
    demo: true,
  },
  {
    id: "site-vega-baja",
    slug: "vega-baja",
    name: "Yacimiento de la Vega Baja",
    locality: "Toledo",
    kind: "archaeological",
    visigothic: true,
    tagline: "El gran espacio urbano extramuros de la Toledo visigoda",
    summary:
      "Área arqueológica al pie de la ciudad histórica, junto al Tajo. Las excavaciones han documentado ocupación de época tardoantigua y visigoda; su interpretación como parte del complejo palatino es objeto de debate.",
    coordinates: { lat: 39.8703, lng: -4.0335, approximate: true },
    visitMinutes: 45,
    hours: { status: "unknown", note: "Condiciones de visita pendientes de verificación." },
    access: { status: "unknown" },
    themes: ["capital", "arqueología", "paisaje"],
    claimIds: ["claim-vega-baja-ocupacion", "claim-vega-baja-palatino"],
    storyIds: ["story-vega-baja"],
    imageTone: "linear-gradient(135deg,#4f5a3a 0%,#8f9a64 55%,#d9dcb8 100%)",
    demo: true,
  },
  {
    id: "site-cristo-luz",
    slug: "cristo-de-la-luz",
    name: "Mezquita del Cristo de la Luz",
    locality: "Toledo",
    kind: "monument",
    visigothic: false,
    tagline: "Mezquita del siglo X con posibles materiales reaprovechados",
    summary:
      "Pequeña mezquita de época califal, posteriormente iglesia. No es un edificio visigodo, pero se suele relacionar con la ruta por los materiales anteriores que se han identificado en su construcción.",
    coordinates: { lat: 39.8621, lng: -4.0239, approximate: true },
    visitMinutes: 30,
    hours: museumHours,
    access: { status: "unknown" },
    themes: ["capital", "arquitectura"],
    claimIds: ["claim-cristo-luz-fecha", "claim-cristo-luz-capiteles"],
    storyIds: [],
    imageTone: "linear-gradient(135deg,#8a4b2a 0%,#c98a5a 55%,#efd6bd 100%)",
    demo: true,
  },
  {
    id: "site-guarrazar",
    slug: "huerta-de-guarrazar",
    name: "Huerta de Guarrazar",
    locality: "Guadamur",
    kind: "landscape",
    visigothic: true,
    tagline: "El lugar donde apareció el tesoro de coronas votivas",
    summary:
      "Paraje de Guadamur donde en 1858 se halló el llamado Tesoro de Guarrazar, un conjunto de coronas y cruces votivas de oro. Hoy las piezas se conservan en varios museos; la visita es al territorio del hallazgo.",
    coordinates: { lat: 39.7995, lng: -4.1575, approximate: true },
    visitMinutes: 40,
    hours: { status: "example", alwaysOpen: true, note: "Espacio exterior. Condiciones de acceso no verificadas." },
    access: { status: "unknown", note: "Terreno rural; accesibilidad sin verificar." },
    themes: ["tesoro", "paisaje", "territorio"],
    claimIds: ["claim-guarrazar-hallazgo", "claim-guarrazar-recesvinto", "claim-guarrazar-museos"],
    storyIds: ["story-guarrazar"],
    imageTone: "linear-gradient(135deg,#6b5a1f 0%,#c4a53f 50%,#f1e2a6 100%)",
    demo: true,
  },
  {
    id: "site-castillo-guadamur",
    slug: "castillo-de-guadamur",
    name: "Castillo de Guadamur",
    locality: "Guadamur",
    kind: "monument",
    visigothic: false,
    tagline: "Patrimonio local no visigodo, junto a la ruta del tesoro",
    summary:
      "Castillo bajomedieval que domina la localidad. No pertenece a la época visigoda; se incluye como patrimonio local cercano para completar la visita a Guadamur.",
    coordinates: { lat: 39.8129, lng: -4.1469, approximate: true },
    visitMinutes: 45,
    hours: { status: "unknown", note: "Régimen de visitas pendiente de verificación." },
    access: { status: "unknown" },
    themes: ["territorio", "patrimonio local"],
    claimIds: ["claim-castillo-no-visigodo"],
    storyIds: [],
    imageTone: "linear-gradient(135deg,#5a5147 0%,#9a8d7b 55%,#e2dbcf 100%)",
    demo: true,
  },
];

/**
 * Claims shipped with the app. This module is imported by client components, so it must hold
 * published claims only: drafts, review and superseded records live in ./editorial (tests and
 * tooling only) and never reach the browser bundle.
 */
export const CLAIMS: ValidatedClaim[] = [
  {
    id: "claim-toledo-sede",
    siteId: "site-san-roman",
    text: "Toledo se consolidó como sede de la corte del reino visigodo en la segunda mitad del siglo VI.",
    evidence: "D",
    source: DEMO_SOURCE,
    status: "published",
    version: 1,
    keywords: ["toledo", "capital", "corte", "reino", "sede", "leovigildo", "siglo vi"],
  },
  {
    id: "claim-concilios",
    siteId: "site-san-roman",
    text: "En Toledo se celebraron numerosos concilios durante época visigoda, que tuvieron un papel político además de religioso.",
    evidence: "D",
    source: DEMO_SOURCE,
    status: "published",
    version: 1,
    keywords: ["concilio", "concilios", "iglesia", "politica", "religion"],
  },
  {
    id: "claim-san-roman-museo",
    siteId: "site-san-roman",
    text: "El museo ocupa la antigua iglesia de San Román, un edificio posterior a la época visigoda.",
    evidence: "D",
    source: DEMO_SOURCE,
    status: "published",
    version: 1,
    keywords: ["san roman", "museo", "iglesia", "edificio"],
  },
  {
    id: "claim-vega-baja-ocupacion",
    siteId: "site-vega-baja",
    text: "Las excavaciones en la Vega Baja han documentado ocupación urbana de época tardoantigua y visigoda.",
    evidence: "D",
    source: DEMO_SOURCE,
    status: "published",
    version: 1,
    keywords: ["vega baja", "excavacion", "yacimiento", "arqueologia", "ciudad"],
  },
  {
    id: "claim-vega-baja-palatino",
    siteId: "site-vega-baja",
    text: "Parte de la investigación propone que en la Vega Baja se situaba el complejo palatino y episcopal de la ciudad regia.",
    evidence: "I",
    attribution: "Interpretación de parte de la investigación arqueológica (autoría pendiente de ficha)",
    source: DEMO_SOURCE,
    status: "published",
    version: 1,
    keywords: ["vega baja", "palacio", "palatino", "rey", "corte"],
  },
  {
    id: "claim-cristo-luz-fecha",
    siteId: "site-cristo-luz",
    text: "La mezquita del Cristo de la Luz es una construcción de época califal, de finales del siglo X.",
    evidence: "D",
    source: DEMO_SOURCE,
    status: "published",
    version: 1,
    keywords: ["cristo de la luz", "mezquita", "califal", "siglo x"],
  },
  {
    id: "claim-cristo-luz-capiteles",
    siteId: "site-cristo-luz",
    text: "Algunos capiteles del edificio podrían proceder de construcciones visigodas anteriores reaprovechadas.",
    evidence: "H",
    source: DEMO_SOURCE,
    status: "published",
    version: 1,
    keywords: ["capiteles", "reaprovechado", "cristo de la luz", "columnas"],
  },
  {
    id: "claim-guarrazar-hallazgo",
    siteId: "site-guarrazar",
    text: "El Tesoro de Guarrazar se descubrió en 1858 en Guadamur.",
    evidence: "D",
    source: DEMO_SOURCE,
    status: "published",
    version: 1,
    keywords: ["guarrazar", "tesoro", "1858", "hallazgo", "guadamur", "descubrimiento"],
  },
  {
    id: "claim-guarrazar-recesvinto",
    siteId: "site-guarrazar",
    text: "Una de las coronas votivas lleva colgantes con letras que forman el nombre del rey Recesvinto.",
    evidence: "D",
    source: DEMO_SOURCE,
    status: "published",
    version: 1,
    keywords: ["corona", "coronas", "recesvinto", "votiva", "rey", "letras"],
  },
  {
    id: "claim-guarrazar-museos",
    siteId: "site-guarrazar",
    text: "Las piezas del tesoro se conservan hoy repartidas entre varios museos, entre ellos el Museo Arqueológico Nacional de Madrid.",
    evidence: "D",
    source: DEMO_SOURCE,
    status: "published",
    version: 1,
    keywords: ["museo", "donde", "madrid", "arqueologico nacional", "coronas", "tesoro"],
  },
  {
    id: "claim-castillo-no-visigodo",
    siteId: "site-castillo-guadamur",
    text: "El castillo de Guadamur es una fortaleza bajomedieval, muy posterior a la época visigoda.",
    evidence: "D",
    source: DEMO_SOURCE,
    status: "published",
    version: 1,
    keywords: ["castillo", "guadamur", "medieval", "fortaleza"],
  },
];

export const STORIES: Story[] = [
  {
    id: "story-concilios",
    siteId: "site-san-roman",
    title: "Una ciudad que reunía al reino",
    body: "Imagina Toledo en plena época visigoda: obispos y nobles llegan desde todo el reino para reunirse en concilio. Allí no solo se hablaba de fe: también se debatían cuestiones que afectaban al poder del rey.",
    claimIds: ["claim-toledo-sede", "claim-concilios"],
    audience: "general",
    minutes: 2,
  },
  {
    id: "story-vega-baja",
    siteId: "site-vega-baja",
    title: "La ciudad bajo la vega",
    body: "Bajo estos campos junto al Tajo, la arqueología ha encontrado restos de una ciudad tardoantigua y visigoda. Qué edificios eran exactamente sigue siendo una pregunta abierta para los investigadores.",
    claimIds: ["claim-vega-baja-ocupacion", "claim-vega-baja-palatino"],
    audience: "general",
    minutes: 2,
  },
  {
    id: "story-guarrazar",
    siteId: "site-guarrazar",
    title: "Coronas en la huerta",
    body: "En 1858, en una huerta de Guadamur, salió a la luz el Tesoro de Guarrazar. Una de sus coronas votivas deja leer, letra a letra, el nombre del rey Recesvinto.",
    claimIds: ["claim-guarrazar-hallazgo", "claim-guarrazar-recesvinto"],
    audience: "family",
    minutes: 2,
  },
];

export const ROUTES: Route[] = [
  {
    id: "route-capital",
    slug: "la-capital-de-un-reino",
    name: "La capital de un reino",
    theme: "Toledo como sede regia visigoda",
    summary:
      "Un recorrido a pie por la Toledo visigoda: el museo de San Román, materiales reaprovechados en el Cristo de la Luz y la Vega Baja junto al Tajo.",
    stopIds: ["site-san-roman", "site-cristo-luz", "site-vega-baja"],
    estimatedMinutes: 210,
    transport: "walk",
    limitations: ["Cuestas pronunciadas en el casco histórico", "Horarios y accesos sin verificar (demo)"],
    demo: true,
  },
  {
    id: "route-tesoro",
    slug: "del-tesoro-al-territorio",
    name: "Del tesoro al territorio",
    theme: "De las coronas votivas al paisaje de Guadamur",
    summary:
      "Empieza en el museo de Toledo para entender el contexto y continúa en coche hasta Guadamur, donde apareció el Tesoro de Guarrazar.",
    stopIds: ["site-san-roman", "site-guarrazar", "site-castillo-guadamur"],
    estimatedMinutes: 240,
    transport: "car",
    limitations: ["Requiere vehículo", "Terreno rural en Guarrazar", "Horarios y accesos sin verificar (demo)"],
    demo: true,
  },
];

/**
 * Only published claims may reach visitors or the assistant (PLAN.md, assistant step 2). CLAIMS is
 * already published-only; the filter guards against a non-published record being added here.
 */
export const PUBLISHED_CLAIMS = CLAIMS.filter((c) => c.status === "published");

export function getSite(id: string): Site | undefined {
  return SITES.find((s) => s.id === id);
}
export function getSiteBySlug(slug: string): Site | undefined {
  return SITES.find((s) => s.slug === slug);
}
export function getRoute(id: string): Route | undefined {
  return ROUTES.find((r) => r.id === id);
}
export function getRouteBySlug(slug: string): Route | undefined {
  return ROUTES.find((r) => r.slug === slug);
}
export function getPublishedClaim(id: string): ValidatedClaim | undefined {
  return PUBLISHED_CLAIMS.find((c) => c.id === id);
}
export function claimsForSite(siteId: string): ValidatedClaim[] {
  return PUBLISHED_CLAIMS.filter((c) => c.siteId === siteId);
}
export function storiesForSite(siteId: string): Story[] {
  return STORIES.filter((s) => s.siteId === siteId);
}

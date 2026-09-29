/**
 * Deterministic Spanish answer composer (provider "local"). Default provider: works without an API
 * key and is the fallback whenever the model fails. Heritage text is built only from retrieved
 * published claims, phrased by evidence level; operational text only from catalog records.
 */
import { ROUTES, SITES, claimsForSite, getRoute, getSite, storiesForSite } from "@/data/catalog";
import type {
  AssistantAnswer,
  AssistantRequest,
  Citation,
  Route,
  Site,
  SiteId,
  ValidatedClaim,
  VisitorProfile,
} from "@/domain/types";
import { accessSentence, durationLabel, hoursSentence } from "./operational";
import type { ResolvedSites, RetrievalResult } from "./retrieval";
import { type Intent, TRAVEL_KEYWORDS, isPlanRequest, keywordHits } from "./router";
import { normalize, stem, unique } from "./text";

export interface ComposeInput {
  req: AssistantRequest;
  intent: Intent;
  sites: ResolvedSites;
  retrieval: RetrievalResult;
}

export const ABSTAIN_LEAD = "No consta en las fuentes aprobadas información sobre eso, así que prefiero no inventarlo.";

/* ---------- Evidence phrasing ---------- */

/** Sentence openers that may be lowercased after "Está documentado que…". Proper nouns never are. */
const LOWERABLE = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "algunos", "algunas", "parte", "en", "de",
  "interpretación",
]);

function lowerFirst(text: string): string {
  const first = text.split(" ")[0] ?? "";
  if (!LOWERABLE.has(first.toLowerCase())) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function stripPeriod(text: string): string {
  return text.trim().replace(/[.\s]+$/, "");
}

/** D documented, I with attribution, H as possibility, T as tradition (PLAN.md, assistant step 3). */
export function phraseClaim(claim: ValidatedClaim): string {
  const body = lowerFirst(stripPeriod(claim.text));
  switch (claim.evidence) {
    case "D":
      return `Está documentado que ${body}.`;
    case "I":
      return claim.attribution
        ? `Según ${lowerFirst(stripPeriod(claim.attribution))}, ${body}.`
        : `Según una interpretación de la investigación, ${body}.`;
    case "H":
      return `Una hipótesis plantea que ${body}.`;
    case "T":
      return `Según la tradición, ${body}.`;
  }
}

export function citationFor(claim: ValidatedClaim): Citation {
  return {
    claimId: claim.id,
    evidence: claim.evidence,
    sourceTitle: claim.source.title,
    ...(claim.source.page ? { page: claim.source.page } : {}),
    ...(claim.attribution ? { attribution: claim.attribution } : {}),
  };
}

/* ---------- Place references ---------- */

function siteRef(site: Site): string {
  return site.visigothic ? `[[${site.id}]]` : `[[${site.id}]] (patrimonio no visigodo)`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function placeSentence(siteIds: SiteId[]): string {
  const sites = unique(siteIds).map(getSite).filter((s): s is Site => Boolean(s));
  if (sites.length === 0) return "";
  const refs = joinList(sites.map(siteRef));
  return sites.length === 1 ? `Lugar relacionado: ${refs}.` : `Lugares relacionados: ${refs}.`;
}

/* ---------- Heritage ---------- */

const MAX_CLAIMS: Record<VisitorProfile, number> = { family: 2, general: 3, expert: 4 };

const TRAVEL_STEMS = new Set(
  TRAVEL_KEYWORDS.flatMap((k) => k.replace("*", "").split(" ")).map((w) => stem(normalize(w))),
);

interface Part {
  text: string;
  citations: Citation[];
  placeIds: SiteId[];
  abstained: boolean;
  action?: AssistantAnswer["suggestedAction"];
}

function heritagePart({ req, retrieval }: ComposeInput): Part | null {
  const claims = retrieval.claims.slice(0, MAX_CLAIMS[req.context.profile]).map((c) => c.claim);
  if (claims.length === 0) return null;
  const paragraphs: string[] = [];
  const unmatched = retrieval.unmatchedTerms.filter((t) => !TRAVEL_STEMS.has(t) && !/^\d{1,2}$/.test(t));
  const matchedCount = retrieval.topicalTerms.length - retrieval.unmatchedTerms.length;
  if (unmatched.length > 0 && unmatched.length >= matchedCount) {
    paragraphs.push("No todo lo que preguntas consta en las fuentes aprobadas; esto es lo que sí está recogido:");
  } else if (req.context.profile === "family") {
    paragraphs.push("Te lo cuento de forma sencilla:");
  }
  paragraphs.push(claims.map(phraseClaim).join(" "));
  const siteIds = unique(claims.map((c) => c.siteId));
  paragraphs.push(placeSentence(siteIds));
  return {
    text: paragraphs.filter(Boolean).join("\n\n"),
    citations: claims.map(citationFor),
    placeIds: siteIds,
    abstained: false,
  };
}

/** Honest abstention plus related documented material (PLAN.md, assistant step 5). */
function abstainPart({ sites }: ComposeInput, lead = ABSTAIN_LEAD): Part {
  const site = sites.all[0];
  if (site) {
    const related = claimsForSite(site.id);
    const claim = related.find((c) => c.evidence === "D") ?? related[0];
    if (claim) {
      return {
        text: `${lead}\n\nLo que sí está recogido sobre ${siteRef(site)}: ${phraseClaim(claim)}`,
        citations: [citationFor(claim)],
        placeIds: [site.id],
        abstained: true,
      };
    }
  }
  return {
    text: `${lead}\n\nPuedo contarte lo que sí recogen las fichas aprobadas, por ejemplo cómo apareció el Tesoro de Guarrazar ([[site-guarrazar]]) o por qué Toledo fue sede de la corte visigoda ([[site-san-roman]]).`,
    citations: [],
    placeIds: ["site-guarrazar", "site-san-roman"],
    abstained: true,
  };
}

/* ---------- Travel ---------- */

const UNSUPPORTED_OPERATIONS: { keywords: string[]; label: string }[] = [
  { keywords: ["aparca*", "parking"], label: "aparcamiento" },
  { keywords: ["precio*", "entrada*", "cuesta dinero", "tarifa*", "gratis"], label: "precios y entradas" },
  { keywords: ["restaurante*", "comer", "comida", "cafeteria*"], label: "restauración" },
  { keywords: ["autobus*", "tren", "taxi"], label: "transporte público" },
];

function clockToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function hoursHonesty(stops: Site[]): string {
  const example = stops.some((s) => s.hours.status === "example");
  const unknown = stops.some((s) => s.hours.status === "unknown");
  if (example && unknown) return "Los horarios de estas paradas son de ejemplo (no verificados) o están sin verificar: confírmalos en la web oficial antes de ir.";
  if (example) return "Los horarios de estas paradas son de ejemplo (no verificados): confírmalos en la web oficial antes de ir.";
  if (unknown) return "Los horarios de estas paradas están sin verificar: confírmalos antes de ir.";
  return "";
}

function chooseRoute({ req, sites }: ComposeInput): Route {
  const tesoroHint =
    keywordHits(req.message, ["tesoro*", "guarrazar", "guadamur", "corona*", "castillo", "coche"]).length > 0 ||
    sites.mentioned.some((s) => s.locality === "Guadamur") ||
    req.context.area === "Guadamur";
  return getRoute(tesoroHint ? "route-tesoro" : "route-capital") ?? ROUTES[0];
}

function planPart(input: ComposeInput): Part {
  const { req } = input;
  const route = chooseRoute(input);
  const stops = route.stopIds.map(getSite).filter((s): s is Site => Boolean(s));
  const family = req.context.profile === "family";
  const how = route.transport === "car" ? "combinando visita a pie y trayecto en coche" : "a pie";
  const paragraphs: string[] = [
    `${family ? "Para una salida en familia te propongo" : "Te propongo"} la ruta «${route.name}»: unos ${durationLabel(route.estimatedMinutes)} ${how}. Paradas: ${joinList(stops.map(siteRef))}.`,
  ];

  const notes: string[] = [];
  const start = clockToMinutes(req.context.startTime);
  const end = clockToMinutes(req.context.endTime);
  const halfDay = keywordHits(req.message, ["medio dia", "una manana", "una tarde"]).length > 0;
  const available = halfDay ? 240 : start !== null && end !== null ? end - start : null;
  if (available !== null && available > 0 && route.estimatedMinutes > available) {
    notes.push(`Puede quedarse justa para el tiempo disponible (${durationLabel(available)}); el planificador te avisará si algo no encaja.`);
  }
  if (route.transport === "car" && req.context.transport === "walk") {
    notes.push("Esta ruta requiere coche y tu viaje está configurado a pie.");
  }
  if (route.limitations.length > 0) notes.push(`A tener en cuenta: ${route.limitations.join("; ").toLowerCase()}.`);
  const honesty = hoursHonesty(stops);
  if (honesty) notes.push(honesty);
  if (req.context.stepFreeRequired) {
    notes.push("Has indicado que necesitas acceso sin escalones: la accesibilidad de estas paradas está sin verificar.");
  }
  if (family) {
    const story = stops.flatMap((s) => storiesForSite(s.id)).find((s) => s.audience === "family");
    if (story) notes.push(`Con niños, en [[${story.siteId}]] hay un relato breve pensado para familias: «${story.title}».`);
  }
  paragraphs.push(notes.join(" "));

  const inTrip = new Set(req.tripSiteIds);
  const allIn = route.stopIds.every((id) => inTrip.has(id));
  let action: Part["action"];
  if (allIn) {
    paragraphs.push("Ya tienes todas estas paradas en tu viaje.");
  } else {
    paragraphs.push("Si te encaja, puedes usar esta ruta en tu viaje: verás el antes y el después antes de confirmar nada.");
    action = { type: "use-route", routeId: route.id };
  }
  return {
    text: paragraphs.filter(Boolean).join("\n\n"),
    citations: [],
    placeIds: stops.map((s) => s.id),
    abstained: false,
    action,
  };
}

function siteTravelPart({ req, sites }: ComposeInput, unsupported: string[]): Part {
  const targets = sites.all.slice(0, 2);
  const askedAccess = keywordHits(req.message, ["accesib*", "silla de ruedas", "escalon*", "carrito"]).length > 0;
  const askedGetting = keywordHits(req.message, ["llegar", "llego", "llega", "coche", "distancia", "lejos", "cerca", "tarda*", "andando", "a pie"]).length > 0;
  const paragraphs = targets.map((site) => {
    const parts = [`${siteRef(site)}: visita de unos ${durationLabel(site.visitMinutes)}.`, hoursSentence(site)];
    if (askedAccess || req.context.stepFreeRequired) parts.push(accessSentence(site));
    if (askedGetting) {
      parts.push(
        site.locality === "Guadamur"
          ? "Está en Guadamur, fuera de Toledo: se llega en coche y el planificador calcula el trayecto cuando lo añades a tu viaje."
          : "Está en Toledo; el planificador calcula el trayecto cuando lo añades a tu viaje.",
      );
      if (site.coordinates.approximate) parts.push("La ubicación del mapa es aproximada.");
    }
    return parts.join(" ");
  });
  if (unsupported.length > 0) {
    paragraphs.push(`No consta en los datos disponibles información sobre ${joinList(unsupported)}; consulta la web oficial.`);
  }
  const first = targets[0];
  let action: Part["action"];
  if (targets.length === 1 && first) {
    if (req.tripSiteIds.includes(first.id)) {
      paragraphs.push("Ya está en tu viaje.");
    } else {
      paragraphs.push("Si quieres, puedes añadirlo a tu viaje: verás cómo queda el horario antes de confirmar.");
      action = { type: "add-stop", siteId: first.id };
    }
  }
  return { text: paragraphs.join("\n\n"), citations: [], placeIds: targets.map((s) => s.id), abstained: false, action };
}

function travelPart(input: ComposeInput): Part {
  const { req, sites } = input;
  const unsupported = UNSUPPORTED_OPERATIONS.filter((o) => keywordHits(req.message, o.keywords).length > 0).map((o) => o.label);
  if (isPlanRequest(req.message)) return planPart(input);
  if (sites.all.length > 0) return siteTravelPart(input, unsupported);
  if (unsupported.length > 0) {
    return {
      text: `No consta en los datos disponibles información sobre ${joinList(unsupported)}; consulta la web oficial de cada lugar.\n\nLo que sí puedo darte son duraciones de visita, horarios de ejemplo (no verificados) y las rutas de demostración, por ejemplo «La capital de un reino» por Toledo.`,
      citations: [],
      placeIds: [],
      abstained: true,
    };
  }
  const [capital, tesoro] = [getRoute("route-capital"), getRoute("route-tesoro")];
  return {
    text: `Puedo ayudarte a organizar la visita con dos rutas de demostración: «${capital?.name}» (a pie por Toledo, unos ${durationLabel(capital?.estimatedMinutes ?? 0)}) y «${tesoro?.name}» (en coche hasta Guadamur, unos ${durationLabel(tesoro?.estimatedMinutes ?? 0)}).\n\nTambién puedo decirte cuánto dura la visita a cada lugar y sus horarios de ejemplo (no verificados). Dime cuánto tiempo tienes o qué te interesa.`,
    citations: [],
    placeIds: [],
    abstained: false,
  };
}

/* ---------- Suggested prompts ---------- */

const SITE_PROMPTS: Record<SiteId, string[]> = {
  "site-san-roman": ["¿Por qué Toledo fue la capital del reino visigodo?", "¿Qué eran los concilios de Toledo?", "¿Cuánto dura la visita al museo de San Román?"],
  "site-vega-baja": ["¿Qué se ha encontrado en la Vega Baja?", "¿Estaba en la Vega Baja el palacio de los reyes?", "¿Cómo visito la Vega Baja?"],
  "site-cristo-luz": ["¿Es visigodo el Cristo de la Luz?", "¿De dónde vienen sus capiteles?", "¿Qué horario tiene el Cristo de la Luz?"],
  "site-guarrazar": ["¿Dónde están hoy las coronas de Guarrazar?", "¿Qué rey aparece en las coronas?", "¿Cómo llego a Guarrazar?"],
  "site-castillo-guadamur": ["¿De qué época es el castillo de Guadamur?", "Planifica la ruta del tesoro en coche", "¿Qué es el Tesoro de Guarrazar?"],
};

const GENERAL_PROMPTS = [
  "Planifica medio día en Toledo",
  "¿Qué es el Tesoro de Guarrazar?",
  "¿Por qué Toledo fue la capital del reino visigodo?",
  "Planifica la ruta del tesoro en coche",
];

export function suggestedPromptsFor(input: ComposeInput, planned = false): string[] {
  const { req, sites } = input;
  const pool: string[] = [];
  if (planned) pool.push("¿Qué horarios tienen estas paradas?");
  if (req.context.profile === "family") pool.push("Plan con niños por Toledo");
  const primary = sites.all[0] ?? (planned ? undefined : SITES.find((s) => req.tripSiteIds.includes(s.id)));
  if (primary) pool.push(...(SITE_PROMPTS[primary.id] ?? []));
  pool.push(...GENERAL_PROMPTS);
  const asked = normalize(req.message);
  return unique(pool).filter((p) => normalize(p) !== asked).slice(0, 3);
}

/* ---------- Entry point ---------- */

export function composeLocal(input: ComposeInput): AssistantAnswer {
  const { intent } = input;
  let part: Part;
  if (intent === "heritage") {
    part = heritagePart(input) ?? abstainPart(input);
  } else if (intent === "travel") {
    part = travelPart(input);
  } else if (intent === "mixed") {
    const heritage = heritagePart(input);
    const travel = travelPart(input);
    part = {
      text: [heritage?.text ?? "Sobre la parte histórica, no consta información en las fuentes aprobadas.", travel.text].join("\n\n"),
      citations: heritage?.citations ?? [],
      placeIds: unique([...(heritage?.placeIds ?? []), ...travel.placeIds]),
      abstained: !heritage && travel.abstained,
      action: travel.action,
    };
  } else {
    part = abstainPart(input);
  }
  return {
    intent,
    text: part.text,
    citations: part.citations,
    placeIds: part.placeIds,
    suggestedPrompts: suggestedPromptsFor(input, part.action?.type === "use-route"),
    ...(part.action ? { suggestedAction: part.action } : {}),
    abstained: part.abstained,
    provider: "local",
  };
}

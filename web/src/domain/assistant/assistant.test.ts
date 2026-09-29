import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLAIMS, PUBLISHED_CLAIMS, SITES } from "@/data/catalog";
import { EDITORIAL_CLAIMS } from "@/data/editorial";
import type { AssistantAnswer, AssistantRequest, TripContext } from "@/domain/types";
import { POST } from "@/app/api/assistant/route";
import {
  answerLocally,
  answerQuestion,
  classifyIntent,
  isPlanRequest,
  phraseClaim,
  placeTokens,
  resolveSites,
  retrieveClaims,
  validateAnswer,
} from "./index";

const CONTEXT: TripContext = {
  area: "Toledo y Guadamur",
  date: null,
  startTime: "10:00",
  endTime: "18:00",
  profile: "general",
  transport: "walk",
  stepFreeRequired: false,
};

function req(message: string, extra: Partial<AssistantRequest> = {}): AssistantRequest {
  return { message, history: [], context: CONTEXT, selectedSiteId: null, tripSiteIds: [], ...extra };
}

const SITE_IDS = new Set(SITES.map((s) => s.id));
const PUBLISHED_IDS = new Set(PUBLISHED_CLAIMS.map((c) => c.id));
const DRAFT_ID = "claim-guarrazar-ocultacion";

function expectWellFormed(a: AssistantAnswer) {
  for (const id of placeTokens(a.text)) expect(SITE_IDS.has(id)).toBe(true);
  expect(a.placeIds).toEqual(placeTokens(a.text));
  for (const c of a.citations) expect(PUBLISHED_IDS.has(c.claimId)).toBe(true);
  expect(a.suggestedPrompts.length).toBeGreaterThanOrEqual(2);
  expect(a.suggestedPrompts.length).toBeLessThanOrEqual(4);
  expect(a.provider).toBe("local");
}

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("router", () => {
  it("classifies heritage, travel, mixed and unknown (accent-insensitive)", () => {
    expect(classifyIntent("¿Qué es el tesoro de Guarrazar?")).toBe("heritage");
    expect(classifyIntent("historia de los VISIGODOS")).toBe("heritage");
    expect(classifyIntent("¿A qué hora abre el museo? ¿Cuál es el horario?")).toBe("travel");
    expect(classifyIntent("¿Cuánto tarda en llegar en coche?")).toBe("travel");
    expect(classifyIntent("Planifica medio dia con ninos")).toBe("travel");
    expect(classifyIntent("¿Por qué es importante la corona y cuál es el horario del museo?")).toBe("mixed");
    expect(classifyIntent("¿Quién ganó el mundial?")).toBe("unknown");
  });

  it("detects plan requests", () => {
    expect(isPlanRequest("¿Qué hago con medio día en Toledo?")).toBe(true);
    expect(isPlanRequest("Tengo 3 horas")).toBe(true);
    expect(isPlanRequest("¿Qué horario tiene el museo?")).toBe(false);
  });
});

describe("retrieval", () => {
  it("resolves sites by name, alias and slug fragment plus selected context", () => {
    expect(resolveSites("Háblame de la huerta de Guarrazar").mentioned.map((s) => s.id)).toEqual(["site-guarrazar"]);
    expect(resolveSites("¿Y el Cristo de la Luz?").mentioned.map((s) => s.id)).toEqual(["site-cristo-luz"]);
    expect(resolveSites("museo de San Roman").mentioned.map((s) => s.id)).toEqual(["site-san-roman"]);
    const withContext = resolveSites("¿Cuánto dura la visita?", "site-vega-baja");
    expect(withContext.mentioned).toEqual([]);
    expect(withContext.all.map((s) => s.id)).toEqual(["site-vega-baja"]);
  });

  it("returns only published claims and never the draft 711 tradition", () => {
    expect(EDITORIAL_CLAIMS.find((c) => c.id === DRAFT_ID)?.status).toBe("draft");
    expect(CLAIMS.some((c) => c.id === DRAFT_ID)).toBe(false);
    const questions = [
      "¿Por qué escondieron el tesoro en 711?",
      "ocultacion del tesoro escondido 711",
      "Cuéntame la tradición de Guarrazar",
      "¿Qué es Guarrazar?",
    ];
    for (const q of questions) {
      const r = retrieveClaims(q, resolveSites(q, "site-guarrazar"), { limit: 20 });
      for (const { claim } of r.claims) {
        expect(claim.status).toBe("published");
        expect(claim.id).not.toBe(DRAFT_ID);
      }
      const answer = answerLocally(req(q, { selectedSiteId: "site-guarrazar" }));
      expect(answer.citations.map((c) => c.claimId)).not.toContain(DRAFT_ID);
      expect(answer.text).not.toContain("711");
    }
  });

  it("ranks by keyword overlap", () => {
    const q = "¿Qué rey aparece en las coronas?";
    const r = retrieveClaims(q, resolveSites(q));
    expect(r.claims[0].claim.id).toBe("claim-guarrazar-recesvinto");
  });
});

describe("evidence phrasing", () => {
  const byId = (id: string) => PUBLISHED_CLAIMS.find((c) => c.id === id)!;

  it("phrases D, I, H and T distinctly", () => {
    expect(phraseClaim(byId("claim-guarrazar-hallazgo"))).toBe("Está documentado que el Tesoro de Guarrazar se descubrió en 1858 en Guadamur.");
    expect(phraseClaim(byId("claim-vega-baja-palatino"))).toMatch(/^Según interpretación de parte de la investigación arqueológica/);
    expect(phraseClaim(byId("claim-cristo-luz-capiteles"))).toBe(
      "Una hipótesis plantea que algunos capiteles del edificio podrían proceder de construcciones visigodas anteriores reaprovechadas.",
    );
    expect(phraseClaim({ ...byId("claim-toledo-sede"), evidence: "T" })).toMatch(/^Según la tradición, Toledo/);
  });

  it("heritage answers use the phrasing and cite claims", () => {
    const d = answerLocally(req("¿Cuándo se descubrió el tesoro de Guarrazar?"));
    expect(d.intent).toBe("heritage");
    expect(d.abstained).toBe(false);
    expect(d.text).toContain("Está documentado que el Tesoro de Guarrazar se descubrió en 1858");
    expect(d.citations.map((c) => c.claimId)).toContain("claim-guarrazar-hallazgo");
    expect(d.text).toContain("[[site-guarrazar]]");
    expectWellFormed(d);

    const i = answerLocally(req("¿Estaba en la Vega Baja el palacio del rey?"));
    expect(i.text).toMatch(/Según interpretación de parte de la investigación/);
    const cit = i.citations.find((c) => c.claimId === "claim-vega-baja-palatino");
    expect(cit?.evidence).toBe("I");
    expect(cit?.attribution).toBeTruthy();
    expectWellFormed(i);

    const h = answerLocally(req("¿De dónde vienen los capiteles del Cristo de la Luz?"));
    expect(h.text).toContain("Una hipótesis plantea que algunos capiteles");
    expect(h.citations.find((c) => c.claimId === "claim-cristo-luz-capiteles")?.evidence).toBe("H");
    expect(h.text).toContain("patrimonio no visigodo");
    expectWellFormed(h);
  });

  it("citations carry source title", () => {
    const a = answerLocally(req("¿Qué eran los concilios de Toledo?"));
    expect(a.citations.length).toBeGreaterThan(0);
    for (const c of a.citations) expect(c.sourceTitle).toMatch(/demostración/);
  });
});

describe("abstention", () => {
  it("abstains on unrelated questions", () => {
    const a = answerLocally(req("¿Quién ganó el mundial?"));
    expect(a.intent).toBe("unknown");
    expect(a.abstained).toBe(true);
    expect(a.text).toMatch(/^No consta en las fuentes aprobadas/);
    expect(a.citations).toEqual([]);
    expectWellFormed(a);
  });

  it("abstains on heritage questions without approved evidence", () => {
    const a = answerLocally(req("¿Qué comía Recaredo en el desayuno?"));
    expect(a.intent).toBe("heritage");
    expect(a.abstained).toBe(true);
    expect(a.text).toMatch(/^No consta en las fuentes aprobadas/);
    expect(a.text).not.toMatch(/Recaredo (comía|desayunaba)/);
    expectWellFormed(a);
  });

  it("offers related documented material for the selected site when abstaining", () => {
    const a = answerLocally(req("¿Qué comía Recaredo en el desayuno?", { selectedSiteId: "site-guarrazar" }));
    expect(a.abstained).toBe(true);
    expect(a.text).toContain("Lo que sí está recogido sobre [[site-guarrazar]]");
    expect(a.citations).toHaveLength(1);
    expectWellFormed(a);
  });

  it("answerQuestion works without an API key", async () => {
    const a = await answerQuestion(req("¿Quién ganó el mundial?"));
    expect(a.provider).toBe("local");
    expect(a.abstained).toBe(true);
  });
});

describe("travel", () => {
  it("half-day plan in Toledo suggests the capital route", () => {
    const a = answerLocally(req("¿Qué hago con medio día en Toledo?"));
    expect(a.intent).toBe("travel");
    expect(a.suggestedAction).toEqual({ type: "use-route", routeId: "route-capital" });
    expect(a.text).toContain("La capital de un reino");
    expect(a.text).toMatch(/de ejemplo \(no verificados\)/);
    expect(a.placeIds).toEqual(["site-san-roman", "site-cristo-luz", "site-vega-baja"]);
    expectWellFormed(a);
  });

  it("treasure plan suggests the tesoro route and flags the car", () => {
    const a = answerLocally(req("Plan para ver el tesoro en Guadamur"));
    expect(a.suggestedAction).toEqual({ type: "use-route", routeId: "route-tesoro" });
    expect(a.text).toContain("requiere coche");
    expect(a.text).toContain("[[site-castillo-guadamur]] (patrimonio no visigodo)");
    expectWellFormed(a);
  });

  it("does not suggest a route already fully in the trip", () => {
    const a = answerLocally(req("Planifica medio día en Toledo", { tripSiteIds: ["site-san-roman", "site-cristo-luz", "site-vega-baja"] }));
    expect(a.suggestedAction).toBeUndefined();
    expect(a.text).toContain("Ya tienes todas estas paradas");
  });

  it("site hours are labelled honestly and suggest add-stop", () => {
    const museum = answerLocally(req("¿Qué horario tiene el museo de San Román?"));
    expect(museum.text).toContain("Horario de ejemplo (no verificado)");
    expect(museum.text).toContain("lun cerrado");
    expect(museum.suggestedAction).toEqual({ type: "add-stop", siteId: "site-san-roman" });

    const vega = answerLocally(req("¿Es accesible y a qué hora abre?", { selectedSiteId: "site-vega-baja" }));
    expect(vega.text).toContain("Horario: sin verificar");
    expect(vega.text).toContain("Accesibilidad: sin verificar");
    expect(vega.text).not.toMatch(/\babierto\b/i);

    const inTrip = answerLocally(req("¿Cuánto dura la visita?", { selectedSiteId: "site-vega-baja", tripSiteIds: ["site-vega-baja"] }));
    expect(inTrip.suggestedAction).toBeUndefined();
    expect(inTrip.text).toContain("Ya está en tu viaje");
  });

  it("family profile gets simpler phrasing and the family story", () => {
    const a = answerLocally({ ...req("Plan con niños para ver el tesoro"), context: { ...CONTEXT, profile: "family" } });
    expect(a.text).toContain("Para una salida en familia");
    expect(a.text).toContain("Coronas en la huerta");
    expectWellFormed(a);
  });

  it("mixed answers keep both evidence types", () => {
    const a = answerLocally(req("¿Qué rey aparece en las coronas de Guarrazar y cómo llego?"));
    expect(a.intent).toBe("mixed");
    expect(a.citations.length).toBeGreaterThan(0);
    expect(a.text).toContain("Guadamur, fuera de Toledo");
    expectWellFormed(a);
  });
});

describe("validateAnswer", () => {
  const base: AssistantAnswer = {
    intent: "heritage",
    text: "Está documentado que el Tesoro de Guarrazar se descubrió en 1858. Lugar: [[site-guarrazar]] y [[site-atlantida]].",
    citations: [
      { claimId: "claim-guarrazar-hallazgo", evidence: "H", sourceTitle: "inventado" },
      { claimId: "claim-inventada", evidence: "D", sourceTitle: "x" },
      { claimId: DRAFT_ID, evidence: "T", sourceTitle: "x" },
    ],
    placeIds: ["site-atlantida", "site-vega-baja"],
    suggestedPrompts: ["uno", "dos", "", "uno"],
    suggestedAction: { type: "add-stop", siteId: "site-atlantida" },
    abstained: false,
    provider: "anthropic",
  };

  it("drops bogus citations and tokens and re-derives metadata", () => {
    const v = validateAnswer(base);
    expect(v.citations.map((c) => c.claimId)).toEqual(["claim-guarrazar-hallazgo"]);
    expect(v.citations[0].evidence).toBe("D");
    expect(v.citations[0].sourceTitle).toMatch(/demostración/);
    expect(v.text).not.toContain("site-atlantida");
    expect(v.placeIds).toEqual(["site-guarrazar"]);
    expect(v.suggestedAction).toBeUndefined();
    expect(v.suggestedPrompts).toEqual(["uno", "dos"]);
    expect(v.abstained).toBe(false);
  });

  it("abstains when a heritage answer has no valid citation", () => {
    const v = validateAnswer({ ...base, citations: [{ claimId: DRAFT_ID, evidence: "T", sourceTitle: "x" }] });
    expect(v.abstained).toBe(true);
    expect(v.citations).toEqual([]);
    expect(v.text).toMatch(/^No consta en las fuentes aprobadas/);
    expect(v.text).not.toContain("1858");
  });
});

describe("POST /api/assistant", () => {
  const post = (body: unknown) =>
    POST(new Request("http://localhost/api/assistant", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

  it("returns an AssistantAnswer", async () => {
    const res = await post(req("¿Qué es Guarrazar?"));
    expect(res.status).toBe(200);
    const a = (await res.json()) as AssistantAnswer;
    expect(a.intent).toBe("heritage");
    expect(a.citations.length).toBeGreaterThan(0);
    expectWellFormed(a);
  });

  it("rejects invalid input with 400", async () => {
    expect((await post("{not json")).status).toBe(400);
    expect((await post({ message: "hola" })).status).toBe(400);
    expect((await post(req("x".repeat(1001)))).status).toBe(400);
    const history = Array.from({ length: 21 }, () => ({ role: "user", text: "hola" }));
    expect((await post({ ...req("hola"), history })).status).toBe(400);
  });
});

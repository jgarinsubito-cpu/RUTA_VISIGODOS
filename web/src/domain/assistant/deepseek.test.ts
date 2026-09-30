import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantRequest, TripContext } from "@/domain/types";
import { answerQuestion } from "./index";

const CONTEXT: TripContext = {
  area: "Toledo y Guadamur",
  date: null,
  startTime: "10:00",
  endTime: "18:00",
  profile: "general",
  transport: "walk",
  stepFreeRequired: false,
};

function req(message: string): AssistantRequest {
  return { message, history: [], context: CONTEXT, selectedSiteId: null, tripSiteIds: [] };
}

/** Stub fetch with one chat-completions reply whose message content is `content`. */
function reply(content: string, finishReason = "stop") {
  const fetchMock = vi.fn(async () =>
    Response.json({ choices: [{ finish_reason: finishReason, message: { content } }] }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("DeepSeek provider", () => {
  it("returns a validated answer that keeps only retrieved, published citations", async () => {
    const fetchMock = reply(
      JSON.stringify({
        text: "Está documentado que el Tesoro de Guarrazar se descubrió en 1858 en Guadamur. [[site-guarrazar]]",
        citedClaimIds: ["claim-guarrazar-hallazgo", "claim-inventada"],
        suggestedPrompts: ["¿Qué rey aparece en las coronas?", "¿Cómo llego a Guarrazar?"],
        abstained: false,
      }),
    );
    const a = await answerQuestion(req("¿Qué es el Tesoro de Guarrazar?"));
    expect(a.provider).toBe("deepseek");
    expect(a.citations.map((c) => c.claimId)).toEqual(["claim-guarrazar-hallazgo"]);
    expect(a.placeIds).toEqual(["site-guarrazar"]);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    // The visitor's question travels as JSON-encoded data, never as a bare instruction.
    expect(String(init.body)).toContain("<pregunta>");
  });

  it("strips internal ids the model echoes", async () => {
    reply(
      JSON.stringify({
        text: "Está documentado que el Tesoro de Guarrazar se descubrió en 1858 en Guadamur (claim-guarrazar-hallazgo). Ruta (route-tesoro).",
        citedClaimIds: ["claim-guarrazar-hallazgo"],
        suggestedPrompts: ["uno", "dos"],
        abstained: false,
      }),
    );
    const a = await answerQuestion(req("¿Qué es el Tesoro de Guarrazar?"));
    expect(a.provider).toBe("deepseek");
    expect(a.text).not.toMatch(/route-|claim-/);
  });

  it("falls back to the local composer on malformed or truncated output", async () => {
    reply("no es JSON");
    expect((await answerQuestion(req("¿Qué es Guarrazar?"))).provider).toBe("local");
    reply(JSON.stringify({ text: "x", citedClaimIds: [], suggestedPrompts: [], abstained: false }), "length");
    expect((await answerQuestion(req("¿Qué es Guarrazar?"))).provider).toBe("local");
  });

  it("falls back when a heritage answer cites nothing it retrieved", async () => {
    reply(
      JSON.stringify({
        text: "El tesoro se escondió en 711.",
        citedClaimIds: ["claim-inventada"],
        suggestedPrompts: [],
        abstained: false,
      }),
    );
    expect((await answerQuestion(req("¿Qué es Guarrazar?"))).provider).toBe("local");
  });

  it("answers greetings and open questions with the model instead of a fixed reply", async () => {
    const fetchMock = reply(
      JSON.stringify({
        text: "¡Hola! Puedo ayudarte a planificar la visita o contarte la historia de los lugares.",
        citedClaimIds: [],
        suggestedPrompts: ["Medio día en Toledo a pie", "¿Qué es el Tesoro de Guarrazar?"],
        abstained: false,
      }),
    );
    const a = await answerQuestion(req("Hola"));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(a.provider).toBe("deepseek");
    expect(a.text).toMatch(/^¡Hola!/);
  });

  it("keeps a plan that repeats the visitor's own time window", async () => {
    reply(
      JSON.stringify({
        text: "Entre las 10:00 y las 18:00 te encaja la ruta «La capital de un reino»: [[site-san-roman]], [[site-cristo-luz]] y [[site-vega-baja]]. Sus horarios son de ejemplo (no verificados).",
        citedClaimIds: [],
        suggestedPrompts: ["uno", "dos"],
        abstained: false,
      }),
    );
    expect((await answerQuestion(req("¿Qué ver en Toledo?"))).provider).toBe("deepseek");
  });

  it("still discards unverified opening times stated as fact", async () => {
    reply(
      JSON.stringify({
        text: "El [[site-san-roman]] abre de 10:00 a 14:00.",
        citedClaimIds: [],
        suggestedPrompts: ["uno", "dos"],
        abstained: false,
      }),
    );
    expect((await answerQuestion(req("¿Qué horario tiene San Román?"))).provider).toBe("local");
  });

  it("falls back on an HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 429 })));
    expect((await answerQuestion(req("¿Qué es Guarrazar?"))).provider).toBe("local");
  });
});

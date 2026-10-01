import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantRequest, TripContext } from "@/domain/types";
import { answerQuestion } from "./index";
import { systemPrompt } from "./model-io";

const CONTEXT: TripContext = {
  area: "Toledo y Guadamur",
  date: null,
  startTime: "10:00",
  endTime: "18:00",
  profile: "general",
  transport: "walk",
  stepFreeRequired: false,
};

/** A historical question no published claim answers. */
const UNSOURCED = "¿Cuál es la historia del Alcázar?";

function req(message: string, mode?: AssistantRequest["mode"]): AssistantRequest {
  return { message, history: [], context: CONTEXT, selectedSiteId: null, tripSiteIds: [], ...(mode ? { mode } : {}) };
}

function reply(output: object) {
  const fetchMock = vi.fn(async () =>
    Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(output) } }] }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const GENERAL = {
  text: "Como contexto general, no verificado en las fuentes de la ruta, el Alcázar se reconstruyó varias veces.",
  citedClaimIds: [],
  suggestedPrompts: ["¿Qué ver cerca?", "¿Qué es el Tesoro de Guarrazar?"],
  abstained: false,
  generalKnowledge: true,
};

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

describe("assistant modes", () => {
  it("strict mode (the default) abstains locally on an unsourced historical question", async () => {
    const fetchMock = reply(GENERAL);
    const a = await answerQuestion(req(UNSOURCED));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(a.provider).toBe("local");
    expect(a.abstained).toBe(true);
    expect(a.generalKnowledge).toBeUndefined();
  });

  it("open mode lets the model answer, labelled as general knowledge", async () => {
    const fetchMock = reply(GENERAL);
    const a = await answerQuestion(req(UNSOURCED, "open"));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(a.provider).toBe("deepseek");
    expect(a.abstained).toBe(false);
    expect(a.generalKnowledge).toBe(true);
    expect(a.citations).toEqual([]);
  });

  it("open mode labels an uncited historical answer even when the model does not flag it", async () => {
    reply({ ...GENERAL, generalKnowledge: false });
    const a = await answerQuestion(req(UNSOURCED, "open"));
    expect(a.generalKnowledge).toBe(true);
  });

  it("open mode still discards unverified hours stated as fact", async () => {
    reply({ ...GENERAL, text: "[[site-guarrazar]] abre a las 10:00 todos los días." });
    const a = await answerQuestion(req("¿Qué historia tiene Guarrazar y cuándo abre?", "open"));
    expect(a.provider).toBe("local");
  });

  it("only the open prompt relaxes the source rules", () => {
    expect(systemPrompt("strict")).not.toContain("Modo abierto");
    expect(systemPrompt("open")).toContain("Modo abierto");
    expect(systemPrompt("open")).not.toContain("generalKnowledge: false");
  });
});

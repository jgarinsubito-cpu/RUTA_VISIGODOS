import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/domain/types";
import { DEFAULT_CONTEXT } from "@/state/store";
import { buildRequest, contextLine, isAnswer, paragraphs, parseInline, plainText, sameContext } from "./format";

describe("parseInline", () => {
  it("splits text and [[site-id]] tokens in order", () => {
    expect(parseInline("Ve a [[site-san-roman]] y luego [[site-guarrazar]].")).toEqual([
      { type: "text", value: "Ve a " },
      { type: "place", siteId: "site-san-roman" },
      { type: "text", value: " y luego " },
      { type: "place", siteId: "site-guarrazar" },
      { type: "text", value: "." },
    ]);
  });

  it("returns plain text untouched and ignores malformed tokens", () => {
    expect(parseInline("Sin lugares [[ ]] aquí")).toEqual([{ type: "text", value: "Sin lugares [[ ]] aquí" }]);
  });
});

describe("paragraphs / plainText", () => {
  it("splits on blank lines and drops empties", () => {
    expect(paragraphs("Uno.\n\n\nDos\nsigue.\n\n")).toEqual(["Uno.", "Dos\nsigue."]);
  });

  it("replaces tokens with names", () => {
    expect(plainText("En [[site-x]].", (id) => (id === "site-x" ? "X" : undefined))).toBe("En X.");
  });
});

describe("context labels", () => {
  it("summarises the default context", () => {
    expect(contextLine(DEFAULT_CONTEXT)).toBe("Toledo y Guadamur · Sin fecha · General · A pie");
  });

  it("includes date, times and step-free need", () => {
    const ctx = { ...DEFAULT_CONTEXT, date: "2026-10-03", transport: "car" as const, stepFreeRequired: true, profile: "family" as const };
    expect(contextLine(ctx)).toBe("Toledo y Guadamur · 03/10/2026 · 10:00–18:00 · En familia · Sin escalones · En coche");
    expect(sameContext(ctx, { ...ctx })).toBe(true);
    expect(sameContext(ctx, DEFAULT_CONTEXT)).toBe(false);
  });
});

describe("buildRequest", () => {
  it("keeps only the last 10 messages as history", () => {
    const msgs: ChatMessage[] = Array.from({ length: 14 }, (_, i) => ({
      id: `m${i}`,
      role: i % 2 ? "assistant" : "user",
      text: `t${i}`,
      createdAt: "2026-01-01T00:00:00Z",
    }));
    const req = buildRequest("hola", msgs, DEFAULT_CONTEXT, null, ["site-a"]);
    expect(req.history).toHaveLength(10);
    expect(req.history[0]).toEqual({ role: "user", text: "t4" });
    expect(req).toMatchObject({ message: "hola", selectedSiteId: null, tripSiteIds: ["site-a"] });
  });
});

describe("isAnswer", () => {
  it("accepts a well-formed answer and rejects errors", () => {
    expect(
      isAnswer({ intent: "unknown", text: "x", citations: [], placeIds: [], suggestedPrompts: [], abstained: true, provider: "local" }),
    ).toBe(true);
    expect(isAnswer({ error: "Petición no válida." })).toBe(false);
    expect(isAnswer(null)).toBe(false);
  });
});

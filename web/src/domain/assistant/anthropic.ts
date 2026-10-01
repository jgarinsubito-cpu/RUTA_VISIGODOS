/**
 * Optional Claude provider. Used only when ANTHROPIC_API_KEY is set (server-side). The model receives
 * ONLY retrieved published claims and catalog site/route records as data, answers in Spanish via a
 * structured JSON schema, and its output is re-validated. Any failure returns null so the caller
 * falls back to the local composer.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { AssistantAnswer } from "@/domain/types";
import type { ComposeInput } from "./compose-local";
import { OutputSchema, buildUserContent, finalizeModelAnswer, systemPrompt } from "./model-io";

export { dataJson } from "./model-io";

export const DEFAULT_MODEL = "claude-opus-5-5";
const TIMEOUT_MS = 20_000;
/** Models that accept the server-side refusal fallback ("default" routing). */
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

let cachedClient: Anthropic | null = null;
function client(): Anthropic {
  cachedClient ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 });
  return cachedClient;
}

export function buildMessages(input: ComposeInput, local: AssistantAnswer): Anthropic.Beta.BetaMessageParam[] {
  return [{ role: "user", content: buildUserContent(input, local) }];
}

export function anthropicEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Ask Claude for a structured answer. Returns null on any error, refusal, timeout or unparsable output. */
export async function answerWithAnthropic(
  input: ComposeInput,
  local: AssistantAnswer,
): Promise<AssistantAnswer | null> {
  if (!anthropicEnabled()) return null;
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  try {
    const response = await client().beta.messages.parse({
      model,
      max_tokens: 4000,
      system: systemPrompt(input.req.mode),
      messages: buildMessages(input, local),
      output_config: { effort: "low", format: betaZodOutputFormat(OutputSchema) },
      ...(FALLBACK_MODELS.has(model)
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
    });
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    const out = response.parsed_output;
    if (!out) return null;
    return finalizeModelAnswer(input, local, out, "anthropic");
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.warn(`[assistant] Anthropic API error ${error.status ?? ""}: ${error.message}`);
    } else {
      console.warn("[assistant] Anthropic provider failed; using local composer.", error);
    }
    return null;
  }
}

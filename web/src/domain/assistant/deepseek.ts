/**
 * Optional DeepSeek provider (OpenAI-compatible chat completions in JSON mode). Used only when
 * DEEPSEEK_API_KEY is set (server-side) and Claude is not configured. It sends the same data-only
 * prompt as the Claude provider and its output goes through the same re-validation. Any failure
 * returns null so the caller falls back to the local composer.
 */
import { z } from "zod";
import type { AssistantAnswer } from "@/domain/types";
import type { ComposeInput } from "./compose-local";
import { OutputSchema, buildUserContent, finalizeModelAnswer, systemPrompt } from "./model-io";

export const DEEPSEEK_DEFAULT_MODEL = "deepseek-flash";
const ENDPOINT = "https://api.deepseek.com/chat/completions";
const TIMEOUT_MS = 20_000;

/** JSON mode needs the shape spelled out in the prompt: there is no schema parameter. */
const JSON_FORMAT = `

Formato de salida: responde SOLO con un objeto JSON con exactamente estas claves: "text" (string con la respuesta), "citedClaimIds" (array de strings), "suggestedPrompts" (array de strings), "abstained" (boolean) y "generalKnowledge" (boolean).`;

const CompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable(),
        message: z.object({ content: z.string().nullable() }),
      }),
    )
    .min(1),
});

export function deepseekEnabled(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export async function answerWithDeepSeek(
  input: ComposeInput,
  local: AssistantAnswer,
): Promise<AssistantAnswer | null> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL,
        response_format: { type: "json_object" },
        reasoning_effort: "low",
        max_tokens: 4000,
        messages: [
          { role: "system", content: systemPrompt(input.req.mode) + JSON_FORMAT },
          { role: "user", content: buildUserContent(input, local) },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn(`[assistant] DeepSeek API error ${response.status}`);
      return null;
    }
    const completion = CompletionSchema.safeParse(await response.json());
    if (!completion.success) {
      console.warn("[assistant] DeepSeek reply has an unexpected shape; using local composer.");
      return null;
    }
    const choice = completion.data.choices[0];
    if (choice.finish_reason !== "stop" || !choice.message.content) {
      console.warn(`[assistant] DeepSeek stopped with "${choice.finish_reason}"; using local composer.`);
      return null;
    }
    const out = OutputSchema.safeParse(JSON.parse(choice.message.content));
    if (!out.success) {
      console.warn("[assistant] DeepSeek JSON does not match the answer schema; using local composer.");
      return null;
    }
    return finalizeModelAnswer(input, local, out.data, "deepseek");
  } catch (error) {
    console.warn("[assistant] DeepSeek provider failed; using local composer.", error);
    return null;
  }
}

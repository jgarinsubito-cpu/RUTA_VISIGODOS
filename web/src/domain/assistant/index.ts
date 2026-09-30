/**
 * Assistant orchestration: route -> resolve sites -> retrieve published claims -> compose -> validate.
 * The local composer always runs; a model (Claude, else DeepSeek) is tried only when configured and
 * never blocks an answer.
 */
import type { AssistantAnswer, AssistantRequest } from "@/domain/types";
import { answerWithAnthropic, anthropicEnabled } from "./anthropic";
import { answerWithDeepSeek, deepseekEnabled } from "./deepseek";
import { type ComposeInput, composeLocal } from "./compose-local";
import { resolveSites, retrieveClaims } from "./retrieval";
import { classifyIntent } from "./router";
import { validateAnswer } from "./validate";

export function prepare(req: AssistantRequest): ComposeInput {
  let intent = classifyIntent(req.message);
  const sites = resolveSites(req.message, req.selectedSiteId);
  // "Guarrazar" alone names a place without a question word: treat it as "tell me about it".
  if (intent === "unknown" && sites.mentioned.length > 0) intent = "heritage";
  const retrieval = retrieveClaims(req.message, sites);
  return { req, intent, sites, retrieval };
}

/** Deterministic answer with no network access. */
export function answerLocally(req: AssistantRequest): AssistantAnswer {
  return validateAnswer(composeLocal(prepare(req)));
}

export interface AnswerOptions {
  /**
   * Called only when the model would actually be used; returning false (e.g. rate limit reached)
   * keeps the deterministic local answer.
   */
  allowModel?: () => boolean;
}

export async function answerQuestion(req: AssistantRequest, options: AnswerOptions = {}): Promise<AssistantAnswer> {
  const input = prepare(req);
  const local = validateAnswer(composeLocal(input));
  // Nothing for the model to add when there is no evidence to ground the historical part of a
  // heritage or mixed question: the local composer says honestly that it is not in the sources.
  // Everything else (travel, greetings, open questions) goes to the model when one is configured.
  const needsEvidence = input.intent === "heritage" || input.intent === "mixed";
  const grounded = !(needsEvidence && input.retrieval.claims.length === 0);
  const answerWithModel = anthropicEnabled() ? answerWithAnthropic : deepseekEnabled() ? answerWithDeepSeek : null;
  if (!answerWithModel || !grounded) return local;
  if (options.allowModel && !options.allowModel()) return local;
  const remote = await answerWithModel(input, local);
  return remote ?? local;
}

export { classifyIntent, isPlanRequest } from "./router";
export { resolveSites, retrieveClaims } from "./retrieval";
export { validateAnswer, placeTokens } from "./validate";
export { phraseClaim } from "./compose-local";

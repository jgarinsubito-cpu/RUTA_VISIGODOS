/**
 * The deterministic part of the assistant: route -> resolve sites -> retrieve published claims ->
 * compose -> validate. No network and no model SDKs, so the admin can run it in the browser to
 * preview answers from a draft catalog (data/content withCatalog).
 */
import type { AssistantAnswer, AssistantRequest } from "@/domain/types";
import { type ComposeInput, composeLocal } from "./compose-local";
import { resolveSites, retrieveClaims } from "./retrieval";
import { classifyIntent } from "./router";
import { validateAnswer } from "./validate";

/**
 * A question with no historical wording whose terms match a published claim's own keywords is a
 * historical question about this route's content ("¿Qué dice el epitafio de Crispín?").
 */
export const KEYWORD_EVIDENCE = 2;

export function prepare(req: AssistantRequest): ComposeInput {
  let intent = classifyIntent(req.message);
  const sites = resolveSites(req.message, req.selectedSiteId);
  // "Guarrazar" alone names a place without a question word: treat it as "tell me about it".
  if (intent === "unknown" && sites.mentioned.length > 0) intent = "heritage";
  const retrieval = retrieveClaims(req.message, sites);
  if (intent === "unknown" && retrieval.claims.some((c) => c.keywordScore >= KEYWORD_EVIDENCE)) intent = "heritage";
  return { req, intent, sites, retrieval };
}

/** Deterministic answer with no network access. */
export function answerLocally(req: AssistantRequest): AssistantAnswer {
  return validateAnswer(composeLocal(prepare(req)));
}

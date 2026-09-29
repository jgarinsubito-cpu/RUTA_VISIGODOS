/**
 * Post-generation checks (PLAN.md, assistant step 4). Runs on every answer, local or model-made:
 * citations must point to published claims (metadata is re-derived from the catalog, never trusted),
 * [[site-id]] tokens must name real sites, placeIds mirror the tokens, and a heritage answer with no
 * valid citation becomes an honest abstention.
 */
import { getPublishedClaim, getRoute, getSite } from "@/data/catalog";
import type { AssistantAnswer, Citation, Site, SiteId } from "@/domain/types";
import { ABSTAIN_LEAD, citationFor } from "./compose-local";
import { resolveSites } from "./retrieval";
import { normalize, unique } from "./text";

const TOKEN = /\[\[([^\]\s]+)\]\]/g;

export function placeTokens(text: string): SiteId[] {
  return unique(Array.from(text.matchAll(TOKEN), (m) => m[1]));
}

/** Remove tokens for unknown sites and tidy the whitespace/punctuation they leave behind. */
function stripUnknownTokens(text: string): string {
  return text
    .replace(TOKEN, (whole, id: string) => (getSite(id) ? whole : ""))
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]+(?:y|e|o)[ \t]*([.,;:])/g, "$1")
    .replace(/[ \t]+([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .trim();
}

export function validateAnswer(answer: AssistantAnswer): AssistantAnswer {
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const c of answer.citations) {
    const claim = getPublishedClaim(c.claimId);
    if (!claim || seen.has(claim.id)) continue;
    seen.add(claim.id);
    citations.push(citationFor(claim));
  }

  let text = stripUnknownTokens(answer.text);
  let abstained = answer.abstained;
  // A model answer to a mixed question carries a historical part too: it needs a citation as well.
  const needsCitation = answer.intent === "heritage" || (answer.intent === "mixed" && answer.provider === "anthropic");
  if (needsCitation && citations.length === 0 && !abstained) {
    text = `${ABSTAIN_LEAD}\n\nPuedes preguntarme por los lugares de la ruta, por ejemplo el Tesoro de Guarrazar ([[site-guarrazar]]).`;
    abstained = true;
  }
  if (!text) {
    text = ABSTAIN_LEAD;
    abstained = true;
  }

  let suggestedAction = answer.suggestedAction;
  if (suggestedAction?.type === "add-stop" && !getSite(suggestedAction.siteId)) suggestedAction = undefined;
  if (suggestedAction?.type === "use-route" && !getRoute(suggestedAction.routeId)) suggestedAction = undefined;

  const suggestedPrompts = unique(
    answer.suggestedPrompts.map((p) => p.trim()).filter((p) => p.length > 0 && p.length <= 140),
  ).slice(0, 4);

  return {
    intent: answer.intent,
    provider: answer.provider,
    text,
    citations,
    placeIds: placeTokens(text),
    suggestedPrompts,
    ...(suggestedAction ? { suggestedAction } : {}),
    abstained,
  };
}

/** Wording that states opening hours or access as fact (normalized text). */
const HOURS_WORDING = /\b(abre|abren|abierto|abierta|abiertos|abiertas|cierra|cierran|cerrado|cerrada)\b|\b\d{1,2} \d{2}\b/;
const ACCESS_WORDING = /\b(accesible|accesibles|sin escalones|silla de ruedas|adaptado|adaptada)\b/;
const QUALIFIER = /\b(de ejemplo|no verificad[oa]s?|sin verificar|consulta)\b/;

/**
 * Post-generation check for model text: when a mentioned site's hours or access are not verified,
 * no sentence may state them as fact (open/closed times, "accesible", "sin escalones") without
 * saying the data is an example or unverified. Returns false when the answer must be discarded.
 */
export function operationalWordingOk(text: string, mentioned: Site[]): boolean {
  const unverifiedHours = mentioned.some((s) => s.hours.status !== "verified");
  const unverifiedAccess = mentioned.some((s) => s.access.status !== "verified");
  if (!unverifiedHours && !unverifiedAccess) return true;
  const sentences = text.replace(TOKEN, " ").split(/(?<=[.!?])\s+|\n+/);
  for (const raw of sentences) {
    const sentence = normalize(raw);
    if (!sentence || QUALIFIER.test(sentence)) continue;
    if (unverifiedHours && HOURS_WORDING.test(sentence)) return false;
    if (unverifiedAccess && ACCESS_WORDING.test(sentence)) return false;
  }
  return true;
}

/** Sites a text refers to by [[token]], name or alias. */
export function mentionedSites(text: string, sites: Site[]): Site[] {
  const tokens = new Set(placeTokens(text));
  const named = new Set(resolveSites(text.replace(TOKEN, " ")).mentioned.map((s) => s.id));
  return sites.filter((s) => tokens.has(s.id) || named.has(s.id));
}

/** True when the text describes the suggested action's route (by name) or site (token or name). */
export function describesAction(text: string, action: NonNullable<AssistantAnswer["suggestedAction"]>): boolean {
  const n = normalize(text);
  if (action.type === "use-route") {
    const route = getRoute(action.routeId);
    return route !== undefined && n.includes(normalize(route.name));
  }
  const site = getSite(action.siteId);
  return site !== undefined && (placeTokens(text).includes(site.id) || n.includes(normalize(site.name)));
}

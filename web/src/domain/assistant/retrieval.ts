/**
 * Site resolution and claim retrieval. Retrieval reads ONLY published claims: drafts, review and
 * superseded records never reach the assistant (PLAN.md, assistant step 2).
 */
import { perCatalog, publishedClaims, sites } from "@/data/content";
import type { Site, SiteId, ValidatedClaim } from "@/domain/types";
import { GENERIC_TERMS, STOPWORDS, hasPhrase, normalize, stem, tokens, unique } from "./text";
import { siteNames } from "./vocabulary";

export { siteNames } from "./vocabulary";

export interface ResolvedSites {
  /** Sites named in the message, in catalog order. */
  mentioned: Site[];
  /** Mentioned sites plus the manually selected site (context), deduplicated. */
  all: Site[];
  /** Normalized alias words that matched, removed from topical terms. */
  aliasWords: Set<string>;
}

export function resolveSites(message: string, selectedSiteId?: SiteId | null): ResolvedSites {
  const n = normalize(message);
  const aliasWords = new Set<string>();
  const mentioned: Site[] = [];
  for (const site of sites()) {
    const hits = siteNames(site).filter((a) => hasPhrase(n, a));
    if (hits.length === 0) continue;
    mentioned.push(site);
    for (const h of hits) for (const w of h.split(" ")) aliasWords.add(w);
  }
  const all = [...mentioned];
  const selected = selectedSiteId ? sites().find((s) => s.id === selectedSiteId) : undefined;
  if (selected && !all.includes(selected)) all.push(selected);
  return { mentioned, all, aliasWords };
}

export interface ScoredClaim {
  claim: ValidatedClaim;
  score: number;
  /** The part of the score that comes from the claim's own keywords (no place or evidence boost). */
  keywordScore: number;
  /** Topical query terms (stemmed) this claim matched. */
  matched: string[];
}

export interface RetrievalResult {
  claims: ScoredClaim[];
  /** Stemmed topical terms of the question (stopwords, generic words and site names removed). */
  topicalTerms: string[];
  /** Topical terms no retrieved claim covers: parts of the question the sources do not answer. */
  unmatchedTerms: string[];
}

interface ClaimIndex {
  claim: ValidatedClaim;
  keywordPhrases: string[];
  keywordStems: Set<string>;
  textStems: Set<string>;
}

/** Search index of the published claims, rebuilt when a new catalog version is installed. */
const claimIndex = perCatalog((): ClaimIndex[] =>
  publishedClaims().map((claim) => {
    const keywordPhrases = claim.keywords.map(normalize);
    return {
      claim,
      keywordPhrases,
      keywordStems: new Set(keywordPhrases.flatMap((k) => k.split(" ")).map(stem)),
      textStems: new Set(tokens(claim.text).filter((w) => !STOPWORDS.has(w)).map(stem)),
    };
  }),
);

/** Stemmed content terms of a question, excluding scaffolding and site names. */
export function topicalTerms(message: string, aliasWords: Set<string> = new Set()): string[] {
  return unique(
    tokens(message)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !GENERIC_TERMS.has(w) && !aliasWords.has(w))
      .map(stem),
  );
}

/**
 * Rank published claims by keyword overlap. When the question only names a place ("¿Qué es
 * Guarrazar?"), the referenced sites' claims are returned as an overview. When it asks something
 * specific, a claim must match at least one topical term; site context only boosts ranking.
 */
export function retrieveClaims(
  message: string,
  sites: ResolvedSites,
  options: { limit?: number } = {},
): RetrievalResult {
  const limit = options.limit ?? 4;
  const n = normalize(message);
  const terms = topicalTerms(message, sites.aliasWords);
  const siteIds = new Set(sites.all.map((s) => s.id));
  const mentionedIds = new Set(sites.mentioned.map((s) => s.id));

  const scored: ScoredClaim[] = [];
  for (const entry of claimIndex()) {
    let score = 0;
    let keywordScore = 0;
    const matched: string[] = [];
    for (const phrase of entry.keywordPhrases) {
      if (phrase.length >= 3 && hasPhrase(n, phrase)) keywordScore += phrase.includes(" ") ? 4 : 3;
    }
    for (const term of terms) {
      if (entry.keywordStems.has(term)) {
        keywordScore += 2;
        matched.push(term);
      } else if (entry.textStems.has(term)) {
        score += 1;
        matched.push(term);
      }
    }
    score += keywordScore;
    const overview = terms.length === 0 && mentionedIds.has(entry.claim.siteId);
    if (matched.length === 0 && !overview) continue;
    if (siteIds.has(entry.claim.siteId)) score += mentionedIds.has(entry.claim.siteId) ? 3 : 1;
    // Documented claims first on ties: they are the safest opening statement.
    if (entry.claim.evidence === "D") score += 0.5;
    scored.push({ claim: entry.claim, score, keywordScore, matched });
  }
  scored.sort((a, b) => b.score - a.score);
  const claims = scored.slice(0, limit);
  const covered = new Set(claims.flatMap((c) => c.matched));
  return { claims, topicalTerms: terms, unmatchedTerms: terms.filter((t) => !covered.has(t)) };
}

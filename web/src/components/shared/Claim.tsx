/**
 * Published claims as visitors see them: evidence level (with attribution for interpretations),
 * the claim text and its source (product rule 2). Used by the place panel, the assistant's
 * sources and the guided tour, so a claim looks the same everywhere.
 */
import type { Story, ValidatedClaim } from "@/domain/types";
import { claimsForStory } from "@/data/content";
import { EvidenceBadge } from "./EvidenceBadge";

export function ClaimSource({ claim }: { claim: ValidatedClaim }) {
  return (
    <p className="text-xs text-ink-muted">
      Fuente:{" "}
      {claim.source.url ? (
        <a href={claim.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {claim.source.title}
          <span className="sr-only"> (abre en otra pestaña)</span>
        </a>
      ) : (
        claim.source.title
      )}
      {claim.source.page ? ` · p. ${claim.source.page}` : ""}
    </p>
  );
}

/** Evidence badge, text and source, without a frame. */
export function ClaimBody({ claim, textSize = "text-sm" }: { claim: ValidatedClaim; textSize?: string }) {
  return (
    <>
      <EvidenceBadge level={claim.evidence} attribution={claim.evidence === "I" ? claim.attribution : undefined} />
      <p className={`${textSize} text-ink`}>{claim.text}</p>
      <ClaimSource claim={claim} />
    </>
  );
}

export function ClaimCard({ claim, className = "" }: { claim: ValidatedClaim; className?: string }) {
  return (
    <li className={`flex flex-col gap-1.5 rounded-xl border border-stone bg-surface p-3.5 ${className}`}>
      <ClaimBody claim={claim} />
    </li>
  );
}

/** "En qué se basa": the published claims behind a story, so its narrative is never unsourced. */
export function StoryEvidence({ story, className = "" }: { story: Story; className?: string }) {
  const claims = claimsForStory(story);
  if (claims.length === 0) return null;
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-ink-muted">En qué se basa</p>
      <ul className="mt-1.5 flex flex-col gap-2">
        {claims.map((c) => (
          <li key={c.id} className="flex flex-col gap-1">
            <ClaimBody claim={c} textSize="text-xs" />
          </li>
        ))}
      </ul>
    </div>
  );
}

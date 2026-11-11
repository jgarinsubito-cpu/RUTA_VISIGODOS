/**
 * A museum piece: what it is, where it was found and where it is now — the bridge between a
 * place of the route and the museum that keeps what came out of it. Its claims show with their
 * evidence level and source like any other; photos show only with the museum's permission.
 */
import Image from "next/image";
import Link from "next/link";
import { getSite, publishedClaims } from "@/data/content";
import type { Piece } from "@/domain/types";
import { ClaimBody } from "./Claim";

export function PieceCard({ piece, from, headingLevel = 3 }: { piece: Piece; from: "origin" | "museum" | "stop"; headingLevel?: 3 | 4 }) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  const images = piece.images.filter((im) => im.permission === "granted");
  const claimIds = new Set(piece.claimIds);
  const claims = publishedClaims().filter((c) => claimIds.has(c.id));
  const museumSite = piece.museum.siteId ? getSite(piece.museum.siteId) : undefined;
  const originSite = piece.originSiteId ? getSite(piece.originSiteId) : undefined;
  const where = `${piece.museum.name}${piece.museum.room ? `, ${piece.museum.room}` : ""}`;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-stone bg-surface p-4">
      {images.length > 0 && (
        <div className={`grid gap-2 ${images.length > 1 ? "grid-cols-2" : ""}`}>
          {images.map((im) => (
            <figure key={im.src} className="flex flex-col gap-1">
              <Image src={im.src} width={im.width} height={im.height} alt={im.alt} sizes="(min-width: 768px) 24rem, 90vw" className="h-auto w-full rounded-xl bg-surface-muted object-cover" />
              <figcaption className="text-2xs text-ink-muted">{im.credit}</figcaption>
            </figure>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Heading className="font-display text-lg leading-snug text-ink">{piece.name}</Heading>
        <p className="text-xs text-ink-muted">
          {[piece.material, piece.date].filter(Boolean).join(" · ")}
          {piece.inventory ? ` · ${piece.inventory}` : ""}
          {piece.owner ? ` · ${piece.owner}` : ""}
        </p>
      </div>
      <p className="rounded-xl bg-surface-muted px-3 py-2 text-sm text-ink">
        {from === "museum" ? (
          <>
            <span className="font-semibold">Procedencia:</span>{" "}
            {originSite ? (
              <Link href={`/lugares/${originSite.slug}`} className="underline underline-offset-4">
                {piece.provenance}
              </Link>
            ) : (
              piece.provenance
            )}
          </>
        ) : (
          <>
            <span className="font-semibold">Se halló aquí. Hoy está en </span>
            {museumSite ? (
              <Link href={`/lugares/${museumSite.slug}`} className="underline underline-offset-4">
                {where}
              </Link>
            ) : (
              where
            )}
            .
          </>
        )}
      </p>
      <p className="text-sm leading-relaxed text-ink">{piece.description}</p>
      {claims.length > 0 && (
        <ul className="flex flex-col gap-2 border-l-2 border-stone pl-3" aria-label={`Lo que sabemos de ${piece.name}`}>
          {claims.map((c) => (
            <li key={c.id} className="flex flex-col gap-1">
              <ClaimBody claim={c} />
            </li>
          ))}
        </ul>
      )}
      {piece.labelText && (
        <details className="rounded-xl border border-stone">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-ink">Cartela del museo</summary>
          <p className="whitespace-pre-line px-3 pb-3 text-sm text-ink-muted">{piece.labelText}</p>
        </details>
      )}
    </article>
  );
}

export function PiecesSection({
  title,
  intro,
  items,
  from,
  headingId,
  level = 2,
}: {
  title: string;
  intro?: string;
  items: readonly Piece[];
  from: "origin" | "museum" | "stop";
  headingId: string;
  /** Heading level of the section (the cards go one below). */
  level?: 2 | 3;
}) {
  if (items.length === 0) return null;
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <Heading id={headingId} className="font-display text-xl text-ink">
        {title}
      </Heading>
      {intro && <p className="text-sm text-ink-muted">{intro}</p>}
      <ul className="flex flex-col gap-3">
        {items.map((p) => (
          <li key={p.id}>
            <PieceCard piece={p} from={from} headingLevel={level === 2 ? 3 : 4} />
          </li>
        ))}
      </ul>
    </section>
  );
}

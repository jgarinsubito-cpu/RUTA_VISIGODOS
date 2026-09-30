"use client";
/**
 * Place card. "default": a 4:3 photo with text below, no box (Explorar grid,
 * Guardados, route stops); its photo morphs into the place page on navigation.
 * "compact": a fixed-size row (chat carousel, map list), so every card in a list matches.
 * With `onSelect` it is a button (e.g. opens the contextual PlacePanel); otherwise it links to
 * /lugares/[slug]. Saved/scheduled indicators come from the store and are text, not color only.
 */
import Link from "next/link";
import { ViewTransition } from "react";
import type { Site } from "@/domain/types";
import { formatClock } from "@/domain/planner";
import { useAppState } from "@/state/store";
import { formatDuration, KIND_LABEL, themeLabel } from "@/lib/labels";
import { matchingInterests } from "@/domain/recommend";
import { SiteImage } from "./SiteImage";
import { NonVisigothicBadge } from "./DemoBadge";

export interface SiteCardProps {
  site: Site;
  variant?: "default" | "compact";
  onSelect?: (siteId: string) => void;
  /** Highlights the card when its place is open in the contextual panel. */
  selected?: boolean;
  className?: string;
}

/** "Te interesa: Arqueología" when the place matches the visitor's interests. */
function InterestMatch({ site }: { site: Site }) {
  const prefs = useAppState((s) => s.preferences);
  const matches = matchingInterests(site, prefs);
  if (matches.length === 0) return null;
  return <span className="truncate text-xs font-semibold text-accent">Te interesa: {matches.map(themeLabel).join(", ")}</span>;
}

function Indicators({ siteId }: { siteId: string }) {
  const saved = useAppState((s) => s.savedSiteIds.includes(siteId));
  const arrival = useAppState((s) => {
    const stop = s.trip.stops.find((st) => st.siteId === siteId);
    return stop ? (stop.visitStart ?? stop.arrival) : undefined;
  });
  if (!saved && arrival === undefined) return null;
  return (
    <span className="truncate text-xs font-semibold text-ink">
      {[arrival !== undefined ? `En tu viaje · ${formatClock(arrival)}` : null, saved ? "Guardado" : null]
        .filter(Boolean)
        .join(" · ")}
    </span>
  );
}

/** The non-Visigothic label when it applies (rule 4); demo status is marked once per screen. */
function StatusLine({ site }: { site: Site }) {
  if (site.visigothic) return null;
  return (
    <span className="flex min-w-0 items-center truncate whitespace-nowrap">
      <NonVisigothicBadge />
    </span>
  );
}

export function SiteCard({ site, variant = "default", onSelect, selected = false, className = "" }: SiteCardProps) {
  const compact = variant === "compact";
  const kind = site.category ?? KIND_LABEL[site.kind];

  const frame = compact
    ? `group flex h-28 w-72 items-center gap-3 rounded-2xl border bg-surface p-2.5 pr-3 text-left transition-colors duration-150 hover:bg-surface-muted ${
        selected ? "border-ink" : "border-stone"
      } ${className}`
    : `group flex h-full w-full flex-col gap-3 rounded-2xl text-left ${selected ? "ring-2 ring-ink ring-offset-4 ring-offset-ivory" : ""} ${className}`;

  const body = compact ? (
    <>
      <SiteImage site={site} aspect="" rounded="rounded-xl" width="w-[88px]" className="h-[88px] shrink-0" sizes="88px" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 font-display text-base leading-snug text-ink">{site.name}</span>
        <span className="truncate text-xs text-ink-muted">
          {site.locality} · {formatDuration(site.visitMinutes)}
        </span>
        <StatusLine site={site} />
      </span>
    </>
  ) : (
    <>
      <ViewTransition name={`place-${site.id}`} share="place-morph" default="none">
        <div className="overflow-hidden rounded-2xl">
          <SiteImage
            site={site}
            aspect="aspect-[4/3]"
            className="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(min-width: 1280px) 280px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          />
        </div>
      </ViewTransition>
      <span className="flex flex-col gap-1 px-0.5">
        <span className="truncate text-xs text-ink-muted">
          {site.locality} · {kind}
        </span>
        <span className="line-clamp-2 min-h-[2.5em] font-display text-xl leading-tight text-ink">{site.name}</span>
        <span className="truncate text-caption text-ink-muted">Visita aprox. {formatDuration(site.visitMinutes)}</span>
        <StatusLine site={site} />
        <InterestMatch site={site} />
        <Indicators siteId={site.id} />
      </span>
    </>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(site.id)} aria-pressed={selected} className={frame}>
        {body}
      </button>
    );
  }
  return (
    <Link href={`/lugares/${site.slug}`} className={frame}>
      {body}
    </Link>
  );
}

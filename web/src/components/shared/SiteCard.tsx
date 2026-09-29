"use client";
/**
 * Site card used in lists, the map sidebar and chat carousels.
 * With `onSelect` it is a button (e.g. opens the contextual PlacePanel); otherwise it links to
 * /lugares/[slug]. Saved/scheduled indicators come from the store and are text, not color only.
 */
import Link from "next/link";
import type { Site } from "@/domain/types";
import { formatClock } from "@/domain/planner";
import { useAppState } from "@/state/store";
import { formatDuration, KIND_LABEL } from "@/lib/labels";
import { IconClock, IconHeart, IconTrip } from "@/components/shell/icons";
import { DemoBadge, NonVisigothicBadge } from "./DemoBadge";
import { SiteImage } from "./SiteImage";

export interface SiteCardProps {
  site: Site;
  variant?: "default" | "compact";
  onSelect?: (siteId: string) => void;
  /** Highlights the card when its place is open in the contextual panel. */
  selected?: boolean;
  className?: string;
}

function Indicators({ siteId }: { siteId: string }) {
  const saved = useAppState((s) => s.savedSiteIds.includes(siteId));
  const arrival = useAppState((s) => {
    const stop = s.trip.stops.find((st) => st.siteId === siteId);
    return stop ? (stop.visitStart ?? stop.arrival) : undefined;
  });
  if (!saved && arrival === undefined) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {arrival !== undefined && (
        <span className="inline-flex items-center gap-1 rounded-full bg-olive px-2 py-0.5 text-[11px] font-semibold text-on-olive">
          <IconTrip width={12} height={12} />
          En tu viaje · {formatClock(arrival)}
        </span>
      )}
      {saved && (
        <span className="inline-flex items-center gap-1 rounded-full border border-stone bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink">
          <IconHeart width={12} height={12} fill="currentColor" />
          Guardado
        </span>
      )}
    </span>
  );
}

export function SiteCard({ site, variant = "default", onSelect, selected = false, className = "" }: SiteCardProps) {
  const compact = variant === "compact";
  const frame = `group block w-full overflow-hidden rounded-2xl border bg-surface text-left shadow-sm transition-shadow hover:shadow-md ${
    selected ? "border-olive ring-2 ring-olive/30" : "border-stone"
  } ${compact ? "w-60 shrink-0" : ""} ${className}`;

  const body = (
    <>
      <SiteImage site={site} aspect={compact ? "aspect-[16/9]" : "aspect-[16/10]"} rounded="rounded-none" />
      <span className={`flex flex-col gap-1.5 ${compact ? "p-3" : "p-4"}`}>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gold">
          {site.locality} · {KIND_LABEL[site.kind]}
        </span>
        <span className={`font-display leading-snug text-ink ${compact ? "line-clamp-2 text-base" : "text-lg"}`}>
          {site.name}
        </span>
        {!compact && <span className="line-clamp-2 text-sm text-ink-muted">{site.tagline}</span>}
        <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
          <IconClock width={14} height={14} />
          Visita aprox. {formatDuration(site.visitMinutes)}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {!site.visigothic && <NonVisigothicBadge />}
          {site.demo && <DemoBadge />}
        </span>
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

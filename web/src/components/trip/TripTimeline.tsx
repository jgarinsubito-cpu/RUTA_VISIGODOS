"use client";
/**
 * Ordered list of trip stops: time window, name, travel leg and provisional warnings.
 * Reused by /mi-viaje and by ProposalReview (with `marks` for before/after highlighting).
 */
import type { ReactNode } from "react";
import type { SiteId, TransportMode, TripStop } from "@/domain/types";
import { getSite } from "@/data/catalog";
import { formatClock } from "@/domain/planner";
import { travelLegText } from "@/lib/labels";
import { IconInfo } from "@/components/shell/icons";

export type StopMark = "added" | "removed" | "changed";

const MARK_LABEL: Record<StopMark, string> = {
  added: "Nuevo",
  removed: "Se quita",
  changed: "Hora cambiada",
};

export interface TripTimelineProps {
  stops: TripStop[];
  transport?: TransportMode;
  onSelect?: (siteId: SiteId) => void;
  selectedSiteId?: SiteId | null;
  /** Per-stop action slot (e.g. move/remove buttons on /mi-viaje). */
  renderActions?: (stop: TripStop, index: number) => ReactNode;
  marks?: Partial<Record<SiteId, StopMark>>;
  compact?: boolean;
  "aria-label"?: string;
  className?: string;
}

export function TripTimeline({
  stops,
  transport,
  onSelect,
  selectedSiteId,
  renderActions,
  marks,
  compact = false,
  "aria-label": ariaLabel = "Paradas del viaje",
  className = "",
}: TripTimelineProps) {
  return (
    <ol aria-label={ariaLabel} className={`flex flex-col ${className}`}>
      {stops.map((stop, i) => {
        const site = getSite(stop.siteId);
        const name = site?.name ?? stop.siteId;
        const mark = marks?.[stop.siteId];
        const selected = selectedSiteId === stop.siteId;
        const provisional = stop.status === "provisional";
        return (
          <li key={`${stop.siteId}-${i}`} className="flex flex-col">
            {i > 0 && stop.travelMinutesFromPrevious > 0 && (
              <p className="ml-4 flex items-center gap-2 border-l-2 border-dotted border-stone py-1.5 pl-6 text-xs text-ink-muted">
                <span className="sr-only">Trayecto: </span>
                {travelLegText(stop.travelMinutesFromPrevious, transport)}
              </p>
            )}
            {i > 0 && stop.travelMinutesFromPrevious <= 0 && <span aria-hidden="true" className="ml-4 h-3 border-l-2 border-dotted border-stone" />}
            <div
              className={`flex items-start gap-3 rounded-xl border bg-surface ${compact ? "p-2.5" : "p-3.5"} ${
                mark === "added"
                  ? "border-olive ring-1 ring-olive/30"
                  : mark === "removed"
                    ? "border-dashed border-danger/60 opacity-80"
                    : selected
                      ? "border-olive"
                      : "border-stone"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                  provisional ? "border-2 border-dashed border-warn text-warn" : "bg-olive text-on-olive"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-ink-muted">
                  <span className="sr-only">Parada {i + 1}, </span>
                  {stop.visitStart !== undefined && stop.visitStart > stop.arrival && (
                    <span className="tabular-nums font-normal">Llegada {formatClock(stop.arrival)} ·</span>
                  )}
                  <span className="tabular-nums">
                    <span className="sr-only">Visita </span>
                    {formatClock(stop.visitStart ?? stop.arrival)}–{formatClock(stop.departure)}
                  </span>
                  {provisional && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] text-warn">
                      <IconInfo width={12} height={12} />
                      Provisional
                    </span>
                  )}
                  {mark && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        mark === "removed"
                          ? "border border-danger/50 text-danger"
                          : mark === "added"
                            ? "bg-olive text-on-olive"
                            : "bg-gold-soft text-ink"
                      }`}
                    >
                      {MARK_LABEL[mark]}
                    </span>
                  )}
                </p>
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(stop.siteId)}
                    aria-pressed={selected}
                    className="mt-0.5 min-h-11 text-left font-medium text-ink underline-offset-2 hover:underline"
                  >
                    {name}
                  </button>
                ) : (
                  <p className={`mt-0.5 font-medium text-ink ${mark === "removed" ? "line-through" : ""}`}>{name}</p>
                )}
                {!compact && site && <p className="text-xs text-ink-muted">{site.locality}</p>}
                {stop.warnings.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-1 text-xs text-warn">
                    {stop.warnings.map((w) => (
                      <li key={w} className="flex gap-1.5">
                        <IconInfo width={14} height={14} className="mt-px shrink-0" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {renderActions && <div className="flex shrink-0 items-center gap-1">{renderActions(stop, i)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

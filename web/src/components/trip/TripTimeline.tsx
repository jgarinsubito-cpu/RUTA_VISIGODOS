"use client";
/**
 * Ordered list of trip stops: time window, name, travel leg and provisional warnings.
 * Reused by /mi-viaje and by ProposalReview (with `marks` for before/after highlighting).
 * Trip-wide warnings (groupWarnings) are shown once by SharedWarnings and hidden from each stop.
 */
import type { ReactNode } from "react";
import type { SiteId, StopWarning, StopWarningCode, TransportMode, TripStop } from "@/domain/types";
import { getSite } from "@/data/content";
import { formatClock } from "@/domain/time";
import { describeSharedWarning, describeWarning, warningKey } from "@/domain/warnings";
import { travelLegText } from "@/lib/labels";
import { IconInfo } from "@/components/shell/icons";

export type StopMark = "added" | "removed" | "changed";
/** How a warning differs from the other side of a before/after comparison. */
export type WarningMark = "new" | "gone";

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
  /** Marks warnings that appear ("new") or disappear ("gone") with a proposed change. */
  warningMark?: (siteId: SiteId, warning: StopWarning) => WarningMark | undefined;
  /** Warning codes already shown once for the whole trip (see SharedWarnings). */
  hiddenCodes?: ReadonlySet<StopWarningCode>;
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
  warningMark,
  hiddenCodes,
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
        const warnings = hiddenCodes ? stop.warnings.filter((w) => !hiddenCodes.has(w.code)) : stop.warnings;
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
                  ? "border-ink"
                  : mark === "removed"
                    ? "border-dashed border-danger/60 opacity-70"
                    : selected
                      ? "border-ink"
                      : "border-stone"
              }`}
            >
              <span
                aria-hidden="true"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-caption font-semibold text-on-primary"
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
                    <span className="rounded-full border border-warn/40 bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">
                      Provisional
                    </span>
                  )}
                  {mark && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        mark === "removed"
                          ? "border border-danger/50 text-danger"
                          : mark === "added"
                            ? "bg-primary text-on-primary"
                            : "bg-surface-muted text-ink"
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
                {warnings.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-1 text-xs text-warn">
                    {warnings.map((w) => {
                      const wm = warningMark?.(stop.siteId, w);
                      return (
                        <li key={warningKey(w)} className={`flex items-baseline gap-1.5 ${wm === "gone" ? "text-ink-muted line-through" : ""}`}>
                          {wm === "new" ? (
                            <span className="shrink-0 rounded bg-warn-soft px-1.5 py-px text-2xs font-bold uppercase tracking-wide">
                              Nuevo
                            </span>
                          ) : (
                            <span aria-hidden="true">•</span>
                          )}
                          <span>
                            {describeWarning(w, name)}
                            {wm === "gone" && <span className="sr-only"> (desaparece con el cambio)</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {renderActions && <div className="-mb-1 -ml-3 mt-1 flex flex-wrap items-center">{renderActions(stop, i)}</div>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Trip-wide warnings said once above the stops (e.g. "Elige una fecha…"), with an optional action
 * such as opening the date picker.
 */
export function SharedWarnings({
  warnings,
  action,
  className = "",
}: {
  warnings: StopWarning[];
  action?: ReactNode;
  className?: string;
}) {
  if (warnings.length === 0) return null;
  return (
    <div className={`flex flex-col gap-2 rounded-xl border border-warn/40 bg-warn-soft p-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <ul className="flex flex-col gap-1 text-sm text-ink">
        {warnings.map((w) => (
          <li key={w.code} className="flex items-start gap-2">
            <IconInfo width={16} height={16} className="mt-0.5 shrink-0 text-warn" />
            {describeSharedWarning(w)}
          </li>
        ))}
      </ul>
      {action}
    </div>
  );
}

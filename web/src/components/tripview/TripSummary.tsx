"use client";
/** Totals, overall verification status and aggregated warnings for the current trip. */
import type { Trip } from "@/domain/types";
import { getSite } from "@/data/content";
import { formatClock, parseClock } from "@/domain/time";
import { WARN_TRAVEL_ESTIMATE } from "@/domain/warnings";
import { formatDuration } from "@/lib/labels";
import { IconClock, IconInfo } from "@/components/shell/icons";

export function tripTotals(trip: Trip) {
  const stops = trip.stops;
  // Waiting for a site to open is not visit time.
  const visit = stops.reduce((sum, s) => sum + (s.departure - (s.visitStart ?? s.arrival)), 0);
  const travel = stops.reduce((sum, s, i) => sum + (i > 0 ? s.travelMinutesFromPrevious : 0), 0);
  const start = stops[0]?.arrival;
  const end = stops[stops.length - 1]?.departure;
  return { visit, travel, start, end };
}

export function isProvisional(trip: Trip): boolean {
  return trip.stops.some((s) => s.status === "provisional" || s.warnings.length > 0);
}

/**
 * "verified" only when every stop has verified hours and access and is not a demo fixture;
 * otherwise the narrowest honest label.
 */
export function tripVerification(trip: Trip): "provisional" | "verified" | "demo" | "access-unverified" {
  if (isProvisional(trip)) return "provisional";
  const sites = trip.stops.map((s) => getSite(s.siteId));
  if (sites.some((site) => !site || site.hours.status !== "verified")) return "provisional";
  if (sites.some((site) => site!.demo)) return "demo";
  if (sites.some((site) => site!.access.status !== "verified")) return "access-unverified";
  return "verified";
}

export function TripStatus({ trip }: { trip: Trip }) {
  const status = tripVerification(trip);
  if (status === "verified") {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-ok">
        <IconClock width={16} height={16} />
        Plan verificado con horarios confirmados
      </p>
    );
  }
  const label =
    status === "provisional"
      ? "Plan provisional: hay datos sin verificar"
      : status === "demo"
        ? "Plan de demostración"
        : "Horarios verificados; accesibilidad sin verificar";
  return (
    <p className="text-sm font-medium text-warn">{label}</p>
  );
}

export function TripTotals({ trip }: { trip: Trip }) {
  const { visit, travel, start, end } = tripTotals(trip);
  const overEnd = end !== undefined && end > parseClock(trip.context.endTime);
  return (
    <div className="flex flex-col gap-1">
      <p className="text-body text-ink">
        <span className="font-semibold tabular-nums">
          {start !== undefined && end !== undefined ? `${formatClock(start)}–${formatClock(end)}` : "—"}
        </span>
        <span className="text-ink-muted">
          {" · "}
          {trip.stops.length} {trip.stops.length === 1 ? "parada" : "paradas"} · {formatDuration(visit)} de visita · ≈{" "}
          {formatDuration(travel)} de trayectos
        </span>
      </p>
      {overEnd && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <IconInfo width={16} height={16} className="shrink-0" />
          Terminarías después de tu hora de fin ({trip.context.endTime}).
        </p>
      )}
    </div>
  );
}

/** Trip-wide notes only; each stop already shows its own warnings in the timeline. */
export function TripWarnings({ trip }: { trip: Trip }) {
  if (trip.stops.length < 2) return null;
  return <p className="text-xs text-ink-muted">{WARN_TRAVEL_ESTIMATE}</p>;
}

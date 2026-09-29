"use client";
/** Totals, overall verification status and aggregated warnings for the current trip. */
import type { Trip } from "@/domain/types";
import { getSite } from "@/data/catalog";
import { formatClock, parseClock, WARN_TRAVEL_ESTIMATE } from "@/domain/planner";
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

export function tripWarnings(trip: Trip): string[] {
  const out: string[] = [];
  for (const stop of trip.stops) {
    const name = getSite(stop.siteId)?.name ?? stop.siteId;
    for (const w of stop.warnings) out.push(`${name}: ${w}`);
  }
  if (trip.stops.length > 1) out.push(WARN_TRAVEL_ESTIMATE);
  return Array.from(new Set(out));
}

export function isProvisional(trip: Trip): boolean {
  return trip.stops.some((s) => s.status === "provisional" || s.warnings.length > 0);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-xl bg-surface-muted px-3 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="text-base font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
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
      <p className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 text-sm font-semibold text-ok">
        <IconClock width={16} height={16} />
        Plan verificado con horarios confirmados
      </p>
    );
  }
  const label =
    status === "provisional"
      ? "Plan provisional: hay datos sin verificar"
      : status === "demo"
        ? "Plan de demostración: contenido pendiente de validación"
        : "Horarios verificados; accesibilidad sin verificar";
  return (
    <p className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-warn/60 bg-warn-soft px-3 py-1 text-sm font-semibold text-warn">
      <IconInfo width={16} height={16} />
      {label}
    </p>
  );
}

export function TripTotals({ trip }: { trip: Trip }) {
  const { visit, travel, start, end } = tripTotals(trip);
  const overEnd = end !== undefined && end > parseClock(trip.context.endTime);
  return (
    <div className="flex flex-col gap-2">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Paradas" value={String(trip.stops.length)} />
        <Stat label="Visitas" value={formatDuration(visit)} />
        <Stat label="Trayectos" value={`≈ ${formatDuration(travel)}`} />
        <Stat
          label="Horario"
          value={start !== undefined && end !== undefined ? `${formatClock(start)}–${formatClock(end)}` : "—"}
        />
      </dl>
      {overEnd && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <IconInfo width={16} height={16} className="shrink-0" />
          Terminarías después de tu hora de fin ({trip.context.endTime}).
        </p>
      )}
    </div>
  );
}

export function TripWarnings({ trip, headingId }: { trip: Trip; headingId: string }) {
  const warnings = tripWarnings(trip);
  if (warnings.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-warn/40 bg-warn-soft p-4">
      <h2 id={headingId} className="flex items-center gap-1.5 text-sm font-semibold text-warn">
        <IconInfo width={16} height={16} />
        Ten en cuenta
      </h2>
      <ul className="mt-1.5 list-disc pl-5 text-sm text-ink">
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-muted">Confirma horarios y accesos en las fuentes oficiales antes de ir.</p>
    </section>
  );
}

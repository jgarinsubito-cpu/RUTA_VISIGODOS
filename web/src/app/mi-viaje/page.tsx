"use client";
/**
 * Mi viaje: the scheduled trip (timeline + map), its constraints and totals.
 * Every change (context, reorder, remove) is a planner proposal reviewed in ProposalReview.
 */
import Link from "next/link";
import { useId, useState } from "react";
import { getRoute, getSite } from "@/data/content";
import { actions, useAppState } from "@/state/store";
import { formatShortDate } from "@/lib/hours";
import { IconChat, IconHeadphones, IconInfo, IconMap, IconRoute } from "@/components/shell/icons";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { groupWarnings } from "@/domain/warnings";
import { SharedWarnings, TripTimeline } from "@/components/trip/TripTimeline";
import { MapView } from "@/components/map";
import { focusTripDate, TripContextForm } from "@/components/tripview/TripContextForm";
import { StopActions } from "@/components/tripview/StopActions";
import { TripStatus, TripTotals, TripWarnings } from "@/components/tripview/TripSummary";
import { ViewToggle, type ViewMode } from "@/components/tripview/ViewToggle";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/useMediaQuery";

const secondaryBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted";

function EmptyTrip() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-stone bg-surface px-6 py-10 text-center">
      <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-surface-muted text-accent">
        <IconRoute width={28} height={28} />
      </span>
      <h2 className="font-display text-2xl text-ink">Tu viaje está vacío</h2>
      <p className="max-w-md text-sm text-ink-muted">
        Empieza con una ruta propuesta o pide al asistente que te ayude a elegir lugares. Nada se añade sin que lo
        revises antes.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/rutas"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
        >
          <IconRoute width={18} height={18} />
          Ver rutas propuestas
        </Link>
        <Link href="/asistente" className={secondaryBtn}>
          <IconChat width={18} height={18} />
          Planificar con el asistente
        </Link>
      </div>
      <Link href="/guardados" className="min-h-11 content-center text-sm font-semibold text-primary underline-offset-2 hover:underline">
        Añadir desde Guardados
      </Link>
    </section>
  );
}

export default function MiViajePage() {
  const trip = useAppState((s) => s.trip);
  const storedContext = useAppState((s) => s.context);
  const canUndo = useAppState((s) => s.previousTrip !== null);
  const pending = useAppState((s) => s.pendingProposal !== null);
  const selectedSiteId = useAppState((s) => s.selectedSiteId);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [view, setView] = useState<ViewMode>("list");
  const headingId = useId();

  const stopIds = trip.stops.map((s) => s.siteId);
  const tourRoute = trip.sourceRouteId ? getRoute(trip.sourceRouteId) : undefined;
  const hasStops = stopIds.length > 0;
  const showList = isDesktop || view === "list";
  const showMap = isDesktop || view === "map";
  const approximate = stopIds.some((id) => getSite(id)?.coordinates.approximate);
  const formKey = `${JSON.stringify(trip.context)}|${JSON.stringify(storedContext)}`;
  const warningGroups = groupWarnings(trip.stops);
  const needsDate = warningGroups.shared.some((w) => w.code === "no-date");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <header className="flex flex-col gap-2">
        <h1 id={headingId} className="font-display text-3xl leading-tight text-ink md:text-4xl">
          {trip.context.date ? `Tu visita del ${formatShortDate(trip.context.date)}` : "Tu visita a la ruta visigoda"}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {hasStops && <TripStatus trip={trip} />}
          <DemoBadge />
        </div>
      </header>

      <TripContextForm
        key={formKey}
        tripContext={trip.context}
        storedContext={storedContext}
        hasStops={hasStops}
        pending={pending}
      />

      {!hasStops ? (
        <EmptyTrip />
      ) : (
        <>
          <TripTotals trip={trip} />

          <div className="flex items-center justify-between gap-2 lg:hidden">
            <h2 className="text-sm font-semibold text-ink">Paradas</h2>
            <ViewToggle value={view} onChange={setView} label="Ver el viaje como lista o mapa" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {showList && (
              <section aria-label="Itinerario" className="flex min-w-0 flex-col gap-4">
                <h2 className="hidden text-sm font-semibold text-ink lg:block">Paradas</h2>
                <SharedWarnings
                  warnings={warningGroups.shared}
                  action={
                    needsDate ? (
                      <button type="button" onClick={focusTripDate} className={`${secondaryBtn} shrink-0`}>
                        Elegir fecha
                      </button>
                    ) : undefined
                  }
                />
                <TripTimeline
                  hiddenCodes={warningGroups.hiddenCodes}
                  stops={trip.stops}
                  transport={trip.context.transport}
                  selectedSiteId={selectedSiteId}
                  onSelect={(id) => actions.selectSite(selectedSiteId === id ? null : id)}
                  renderActions={(stop, i) => (
                    <StopActions stop={stop} index={i} count={trip.stops.length} disabled={pending} />
                  )}
                  aria-label="Paradas del viaje en orden"
                />
                <TripWarnings trip={trip} />
              </section>
            )}

            {showMap && (
              <section aria-label="Mapa del viaje" className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-6 lg:self-start">
                <div className="h-[60dvh] min-h-72 overflow-hidden rounded-2xl border border-stone bg-surface-muted lg:h-[70dvh]">
                  <MapView
                    siteIds={stopIds}
                    tripSiteIds={stopIds}
                    selectedSiteId={selectedSiteId}
                    onSelect={(id) => actions.selectSite(id)}
                    className="h-full w-full"
                  />
                </div>
                <p className="flex items-start gap-1.5 text-xs text-ink-muted">
                  <IconMap width={14} height={14} className="mt-px shrink-0" />
                  <span>
                    Paradas numeradas en orden de visita. La línea no es una ruta real a pie ni en coche.
                    {approximate && " Algunas ubicaciones son aproximadas."}
                  </span>
                </p>
              </section>
            )}
          </div>
        </>
      )}

      <footer className="flex flex-col gap-3 border-t border-stone pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-ink-muted">
          <IconInfo width={14} height={14} className="shrink-0" />
          Guardado en este dispositivo
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {canUndo && (
            <button type="button" onClick={() => actions.undo()} disabled={pending} className={`${secondaryBtn} disabled:opacity-60`}>
              Deshacer último cambio
            </button>
          )}
          <Link href="/asistente" className={secondaryBtn}>
            <IconChat width={18} height={18} />
            Preguntar al asistente sobre mi viaje
          </Link>
          {hasStops && tourRoute && (
            <Link href={`/rutas/${tourRoute.slug}/recorrido`} className={secondaryBtn}>
              <IconHeadphones width={18} height={18} />
              Recorrido guiado
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}

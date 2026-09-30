"use client";
/**
 * Mapa: every catalog site with filters and a synchronized result list.
 * Desktop (lg+): side column (list, or the PlacePanel of the selected site) + map.
 * Mobile: map/list switch; selecting a site opens PlacePanel in a bottom sheet.
 * No geolocation: the visitor explores the map manually.
 */
import Link from "next/link";
import { useState } from "react";
import type { Site } from "@/domain/types";
import { SITES } from "@/data/content";
import { actions, useAppState } from "@/state/store";
import { IconInfo } from "@/components/shell/icons";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { SiteCard } from "@/components/shared/SiteCard";
import { PlacePanel } from "@/components/place/PlacePanel";
import { MapView } from "@/components/map";
import { PlaceSheet } from "@/components/place/PlaceSheet";
import { ViewToggle, type ViewMode } from "@/components/tripview/ViewToggle";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/useMediaQuery";

type Filter = "all" | "visigothic" | "other" | "trip" | "saved";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "visigothic", label: "Visigodo" },
  { id: "other", label: "Otro patrimonio" },
  { id: "trip", label: "En mi viaje" },
  { id: "saved", label: "Guardados" },
];

const EMPTY_TEXT: Record<Filter, string> = {
  all: "No hay lugares en el catálogo.",
  visigothic: "No hay lugares visigodos en el catálogo.",
  other: "No hay otro patrimonio en el catálogo.",
  trip: "Aún no has añadido lugares a tu viaje.",
  saved: "Aún no has guardado lugares.",
};

function FilterChips({
  value,
  onChange,
  counts,
}: {
  value: Filter;
  onChange: (f: Filter) => void;
  counts: Record<Filter, number>;
}) {
  return (
    <div role="group" aria-label="Filtrar lugares" className="flex flex-wrap gap-2">
      {FILTERS.map((f) => {
        const active = value === f.id;
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(f.id)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm ${
              active
                ? "border-primary bg-primary font-semibold text-on-primary"
                : "border-stone bg-surface font-medium text-ink hover:bg-surface-muted"
            }`}
          >
            {f.label}
            <span className={`text-xs tabular-nums ${active ? "" : "text-ink-muted"}`}>
              <span className="sr-only">, </span>
              {counts[f.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ResultList({
  sites,
  filter,
  selectedSiteId,
  onSelect,
  className = "",
}: {
  sites: Site[];
  filter: Filter;
  selectedSiteId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  if (sites.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone bg-surface p-6 text-center text-sm text-ink-muted">
        <p>{EMPTY_TEXT[filter]}</p>
        {filter === "trip" && (
          <Link href="/rutas" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-2 hover:underline">
            Ver rutas propuestas
          </Link>
        )}
      </div>
    );
  }
  return (
    <ul aria-label="Resultados" className={`grid gap-3 ${className}`}>
      {sites.map((site) => (
        <li key={site.id}>
          <SiteCard site={site} variant="compact" className="w-full" onSelect={onSelect} selected={selectedSiteId === site.id} />
        </li>
      ))}
    </ul>
  );
}

export default function MapaPage() {
  const tripIds = useAppState((s) => s.trip.stops.map((st) => st.siteId).join(","));
  const savedIds = useAppState((s) => s.savedSiteIds);
  const selectedSiteId = useAppState((s) => s.selectedSiteId);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<ViewMode>("map");

  const trip = tripIds ? tripIds.split(",") : [];
  const matches: Record<Filter, (s: Site) => boolean> = {
    all: () => true,
    visigothic: (s) => s.visigothic,
    other: (s) => !s.visigothic,
    trip: (s) => trip.includes(s.id),
    saved: (s) => savedIds.includes(s.id),
  };
  const counts = Object.fromEntries(FILTERS.map((f) => [f.id, SITES.filter(matches[f.id]).length])) as Record<Filter, number>;
  const results =
    filter === "trip"
      ? trip.map((id) => SITES.find((s) => s.id === id)).filter((s): s is Site => s !== undefined)
      : SITES.filter(matches[filter]);
  const resultIds = results.map((s) => s.id);
  // Numbered trip markers only when every stop is visible, so numbers match the trip order.
  const showTripOrder = filter === "all" || filter === "trip";
  const approximate = results.some((s) => s.coordinates.approximate);

  const select = (id: string) => actions.selectSite(id);
  const close = () => actions.selectSite(null);
  const selected = selectedSiteId && SITES.some((s) => s.id === selectedSiteId) ? selectedSiteId : null;

  const resultCount = (
    <p aria-live="polite" className="text-xs text-ink-muted">
      {results.length === 1 ? "1 lugar" : `${results.length} lugares`}
      {approximate && " · algunas ubicaciones son aproximadas"}
    </p>
  );

  const header = (
    <header className="flex flex-col gap-3 px-4 pb-3 pt-5 lg:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl leading-tight text-ink">Mapa</h1>
        <DemoBadge />
      </div>
      <FilterChips value={filter} onChange={setFilter} counts={counts} />
      {isDesktop ? (
        resultCount
      ) : (
        <div className="flex items-center justify-between gap-3">
          {resultCount}
          <ViewToggle value={view} onChange={setView} label="Ver lugares como mapa o lista" />
        </div>
      )}
    </header>
  );

  const map = (
    <MapView
      siteIds={resultIds}
      tripSiteIds={showTripOrder ? trip : []}
      selectedSiteId={selected}
      onSelect={select}
      className="h-full w-full"
    />
  );

  if (isDesktop) {
    return (
      <div className="grid h-dvh grid-cols-[400px_minmax(0,1fr)]">
        <aside aria-label={selected ? "Ficha del lugar" : "Lugares"} className="flex min-h-0 flex-col border-r border-stone bg-ivory">
          {selected ? (
            <PlacePanel key={selected} siteId={selected} variant="panel" onClose={close} />
          ) : (
            <>
              {header}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
                <ResultList sites={results} filter={filter} selectedSiteId={selected} onSelect={select} />
              </div>
            </>
          )}
        </aside>
        <section aria-label="Mapa de lugares" className="relative min-h-0">
          {map}
          <p className="pointer-events-none absolute bottom-3 left-3 z-[500] flex max-w-sm items-start gap-1.5 rounded-xl bg-surface/95 px-3 py-2 text-xs text-ink-muted">
            <IconInfo width={14} height={14} className="mt-px shrink-0" />
            Marcadores cuadrados: patrimonio no visigodo. Números: paradas de tu viaje. Círculos con cifra: varios lugares; tócalos para acercar.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className={view === "map" ? "flex h-[calc(100dvh-var(--mobile-nav)-env(safe-area-inset-bottom))] flex-col md:h-dvh" : "flex flex-col"}>
      {header}
      {view === "map" ? (
        // The map takes the height left, so the legend stays visible above the bottom navigation.
        <section aria-label="Mapa de lugares" className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-3">
          <div className="min-h-64 flex-1 overflow-hidden rounded-2xl border border-stone bg-surface-muted">{map}</div>
          <p className="text-xs text-ink-muted">
            Toca un marcador para ver su ficha. Cuadrados: patrimonio no visigodo. Números: paradas de tu viaje. Círculos con
            cifra: varios lugares juntos.
          </p>
        </section>
      ) : (
        <div className="px-4 pb-6">
          <ResultList sites={results} filter={filter} selectedSiteId={selected} onSelect={select} className="sm:grid-cols-2" />
        </div>
      )}
      {selected && <PlaceSheet key={selected} variant="bottom" siteId={selected} onClose={close} />}
    </div>
  );
}

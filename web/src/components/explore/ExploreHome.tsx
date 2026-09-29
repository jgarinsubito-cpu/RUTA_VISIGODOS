"use client";
/**
 * Explorar home: a curated cultural guide (PLAN.md, "Visual direction") with Mindtrip-like entry
 * points for different readiness levels: explore the places, create a trip, or ask the assistant.
 */
import Link from "next/link";
import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { ROUTES, SITES } from "@/data/catalog";
import { useAppState } from "@/state/store";
import { IconClose, IconInfo, IconPin, IconSearch, IconTrip } from "@/components/shell/icons";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { RouteCard } from "@/components/shared/RouteCard";
import { SiteCard } from "@/components/shared/SiteCard";
import { SiteImage } from "@/components/shared/SiteImage";
import { AskComposer } from "./AskComposer";
import {
  availableThemes,
  EMPTY_FILTERS,
  filterRoutes,
  filterSites,
  isFiltered,
  LOCALITY_OPTIONS,
  type ExploreFilters,
  type LocalityFilter,
} from "./filter";

const HERO_SITE = SITES.find((s) => s.id === "site-san-roman") ?? SITES[0];
const THEMES = availableThemes(SITES);

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function LocalitySelector({ value, onChange }: { value: LocalityFilter; onChange: (v: LocalityFilter) => void }) {
  const name = useId();
  return (
    <fieldset className="flex min-w-0 items-center gap-2">
      <legend className="sr-only">Zona</legend>
      <IconPin className="shrink-0 text-gold" />
      <div className="flex rounded-full border border-stone bg-surface p-0.5">
        {LOCALITY_OPTIONS.map((opt) => (
          <label
            key={opt}
            className="relative flex min-h-11 cursor-pointer items-center gap-1 rounded-full px-3 text-sm font-medium text-ink-muted has-[:checked]:bg-olive has-[:checked]:font-semibold has-[:checked]:text-on-olive has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold"
          >
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="peer sr-only"
            />
            <span aria-hidden="true" className="hidden peer-checked:inline">
              ✓
            </span>
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ExploreHome() {
  const [filters, setFilters] = useState<ExploreFilters>(EMPTY_FILTERS);
  const placesHeadingRef = useRef<HTMLHeadingElement>(null);
  const searchId = useId();
  const stopCount = useAppState((s) => s.trip.stops.length);

  const sites = useMemo(() => filterSites(SITES, filters), [filters]);
  const routes = useMemo(() => filterRoutes(ROUTES, SITES, filters), [filters]);
  const filtered = isFiltered(filters);
  const nothing = sites.length === 0 && routes.length === 0;

  const update = (patch: Partial<ExploreFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const reset = () => setFilters(EMPTY_FILTERS);

  function scrollToPlaces() {
    const heading = placesHeadingRef.current;
    if (!heading) {
      // Filters hid every result: clear them so the full list is there to explore.
      reset();
      return;
    }
    heading.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    heading.focus({ preventScroll: true });
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    scrollToPlaces();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-12 pt-4 md:gap-10 md:px-8 md:pt-8">
      {/* Location + search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <LocalitySelector value={filters.locality} onChange={(locality) => update({ locality })} />
        <form role="search" onSubmit={onSearchSubmit} className="relative w-full md:max-w-sm">
          <label htmlFor={searchId} className="sr-only">
            Buscar lugares por nombre o tema
          </label>
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            id={searchId}
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Buscar lugares, temas…"
            autoComplete="off"
            enterKeyHint="search"
            className="min-h-11 w-full rounded-full border border-stone bg-surface pl-11 pr-12 text-base text-ink shadow-sm placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => update({ query: "" })}
              aria-label="Borrar búsqueda"
              className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-ink-muted hover:text-ink"
            >
              <IconClose width={18} height={18} />
            </button>
          )}
        </form>
      </div>

      {/* Hero: restrained, modest height */}
      <section aria-labelledby="explore-hero" className="grid items-center gap-5 md:grid-cols-[1.1fr_1fr] md:gap-8">
        <div className="flex flex-col gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Toledo · Guadamur</p>
          <h1 id="explore-hero" className="font-display text-3xl leading-tight text-ink md:text-5xl">
            La ruta de la Toledo visigoda
          </h1>
          <p className="max-w-prose text-base leading-relaxed text-ink-muted">
            Descubre la ciudad que fue sede regia del reino visigodo y el territorio del Tesoro de Guarrazar. Explora a
            tu ritmo, crea un viaje que encaje en tu día o pregunta al asistente.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/rutas"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-olive px-5 text-sm font-semibold text-on-olive shadow-sm hover:bg-olive-hover"
            >
              <IconTrip width={18} height={18} />
              Crear mi viaje
            </Link>
            <button
              type="button"
              onClick={scrollToPlaces}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-muted"
            >
              Explorar la ruta
            </button>
          </div>
          {stopCount > 0 && (
            <p className="text-sm text-ink-muted">
              Tienes {stopCount} {stopCount === 1 ? "parada" : "paradas"} en tu viaje en este dispositivo.{" "}
              <Link href="/mi-viaje" className="font-semibold text-olive underline underline-offset-2">
                Ver Mi viaje
              </Link>
            </p>
          )}
        </div>
        <SiteImage site={HERO_SITE} aspect="aspect-[16/9] md:aspect-[4/3]" rounded="rounded-2xl" className="shadow-sm" />
      </section>

      <AskComposer />

      <p className="flex items-start gap-2 rounded-xl border border-dashed border-warn/60 bg-warn-soft px-4 py-3 text-sm text-ink">
        <IconInfo className="mt-0.5 shrink-0 text-warn" />
        <span>
          <strong className="font-semibold">Versión de demostración.</strong> Los lugares, rutas y datos históricos son
          fichas de ejemplo pendientes de validación por Urbs Regia. Los horarios son de ejemplo y no están verificados, y
          las coordenadas son aproximadas. Tu viaje y tus guardados se quedan en este dispositivo.
        </span>
      </p>

      {/* Theme chips */}
      <section aria-labelledby="explore-themes" className="flex flex-col gap-3">
        <h2 id="explore-themes" className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
          Temas
        </h2>
        <ul className="flex flex-wrap gap-2">
          {[null, ...THEMES].map((theme) => {
            const active = filters.theme === theme;
            return (
              <li key={theme ?? "all"}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ theme })}
                  className={`inline-flex min-h-11 items-center gap-1 rounded-full border px-4 text-sm font-medium ${
                    active
                      ? "border-olive bg-olive font-semibold text-on-olive"
                      : "border-stone bg-surface text-ink hover:bg-surface-muted"
                  }`}
                >
                  {active && <span aria-hidden="true">✓</span>}
                  {theme ? capitalize(theme) : "Todos los temas"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <p aria-live="polite" className="sr-only">
        {filtered ? `${sites.length} lugares y ${routes.length} rutas coinciden` : ""}
      </p>

      {nothing ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone bg-surface px-6 py-10 text-center">
          <IconSearch width={28} height={28} className="text-ink-muted" />
          <p className="text-base text-ink">
            {filters.query.trim()
              ? `No hay resultados para «${filters.query.trim()}».`
              : "No hay resultados con estos filtros."}
          </p>
          <p className="text-sm text-ink-muted">Prueba otra palabra, otra zona u otro tema.</p>
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-full bg-olive px-5 text-sm font-semibold text-on-olive hover:bg-olive-hover"
          >
            Borrar filtros
          </button>
        </div>
      ) : (
        <>
          <section aria-labelledby="explore-routes" className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2 id="explore-routes" className="font-display text-2xl text-ink">
                Rutas
              </h2>
              <Link href="/rutas" className="inline-flex min-h-11 items-center text-sm font-semibold text-olive underline-offset-2 hover:underline">
                Ver todas
              </Link>
            </div>
            {routes.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {routes.map((r) => (
                  <li key={r.id} className="flex">
                    <RouteCard route={r} className="w-full" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">Ninguna ruta coincide con estos filtros.</p>
            )}
          </section>

          <section aria-labelledby="lugares" className="flex scroll-mt-4 flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <h2 id="lugares" ref={placesHeadingRef} tabIndex={-1} className="scroll-mt-4 font-display text-2xl text-ink">
                Lugares
              </h2>
              <span className="flex items-center gap-3 text-sm text-ink-muted">
                {filtered ? `${sites.length} de ${SITES.length}` : `${SITES.length} lugares`}
                {filtered && (
                  <button
                    type="button"
                    onClick={reset}
                    className="min-h-11 font-semibold text-olive underline-offset-2 hover:underline"
                  >
                    Borrar filtros
                  </button>
                )}
              </span>
            </div>
            {sites.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sites.map((s) => (
                  <li key={s.id} className="flex">
                    <SiteCard site={s} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">Ningún lugar coincide con estos filtros.</p>
            )}
            <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <DemoBadge /> Fichas de demostración: horarios de ejemplo y coordenadas aproximadas.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

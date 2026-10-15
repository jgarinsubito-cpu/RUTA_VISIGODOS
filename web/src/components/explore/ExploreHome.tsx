"use client";
/**
 * Explorar home: a curated cultural guide (PLAN.md, "Visual direction") with Mindtrip-like entry
 * points for different readiness levels: explore the places, create a trip, or ask the assistant.
 */
import Link from "next/link";
import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { getSite, localities, routes as allRoutes, showcase, sites as allSites } from "@/data/content";
import { useAppState } from "@/state/store";
import { rankSites, routeInterestScore } from "@/domain/recommend";
import { themeLabel } from "@/lib/labels";
import { prefersReducedMotion } from "@/lib/motion";
import { IconClose, IconSearch, IconUser } from "@/components/shell/icons";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { SiteImage } from "@/components/shared/SiteImage";
import { RouteCard } from "@/components/shared/RouteCard";
import { SiteCard } from "@/components/shared/SiteCard";
import type { Site } from "@/domain/types";
import { AskComposer } from "./AskComposer";
import {
  availableThemes,
  EMPTY_FILTERS,
  filterRoutes,
  filterSites,
  isFiltered,
  localityOptions,
  type ExploreFilters,
  type LocalityFilter,
} from "./filter";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function LocalitySelector({ value, onChange }: { value: LocalityFilter; onChange: (v: LocalityFilter) => void }) {
  const name = useId();
  return (
    <fieldset className="flex min-w-0 items-center">
      <legend className="sr-only">Zona</legend>
      <div className="flex rounded-full bg-surface-muted p-1">
        {localityOptions(localities()).map((opt) => (
          <label
            key={opt}
            className="relative flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm text-ink-muted transition-colors duration-150 hover:text-ink has-[:checked]:bg-surface has-[:checked]:font-semibold has-[:checked]:text-ink has-[:checked]:shadow-[0_1px_3px_var(--shadow)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
          >
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="peer sr-only"
            />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PlaceGroup({ title, intro, sites }: { title: string; intro: string; sites: Site[] }) {
  const headingId = useId();
  if (sites.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="font-display text-xl text-ink">
          {title} <span className="font-sans text-sm font-normal text-ink-muted">· {sites.length}</span>
        </h3>
        <p className="text-sm text-ink-muted">{intro}</p>
      </div>
      <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sites.map((s, i) => (
          <li key={s.id} className="rise flex" style={{ ["--i" as string]: i }}>
            <SiteCard site={s} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ExploreHome() {
  const [filters, setFilters] = useState<ExploreFilters>(EMPTY_FILTERS);
  const placesHeadingRef = useRef<HTMLHeadingElement>(null);
  const searchId = useId();
  const stopCount = useAppState((s) => s.trip.stops.length);

  const preferences = useAppState((s) => s.preferences);
  const copy = showcase();
  const heroSite = getSite(copy.heroSiteId) ?? allSites()[0];
  const themes = availableThemes(allSites(), copy.themes);
  // Interests reorder (never hide): matching places and routes come first.
  const sites = useMemo(() => rankSites(filterSites(allSites(), filters), preferences), [filters, preferences]);
  const routes = useMemo(
    () =>
      filterRoutes(allRoutes(), allSites(), filters)
        .map((r, i) => ({ r, i, score: routeInterestScore(r, getSite, preferences) }))
        .sort((a, b) => b.score - a.score || a.i - b.i)
        .map((x) => x.r),
    [filters, preferences],
  );
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-4 md:gap-14 md:px-10 md:pt-8">
      {/* Location + search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-2">
          <LocalitySelector value={filters.locality} onChange={(locality) => update({ locality })} />
          {/* Mobile has no rail: the account lives here (PLAN.md: profile in a utility entry). */}
          <Link
            href="/cuenta"
            aria-label="Tu cuenta y preferencias"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-stone bg-surface text-ink hover:bg-surface-muted md:hidden"
          >
            <IconUser />
          </Link>
        </div>
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
            className="min-h-11 w-full rounded-full border border-stone bg-surface pl-11 pr-12 text-base text-ink transition-colors placeholder:text-ink-muted focus:border-ink focus:outline-none [&::-webkit-search-cancel-button]:hidden"
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

      {/* Hero: headline and one photo, nothing else */}
      <section aria-labelledby="explore-hero" className="grid items-center gap-10 md:grid-cols-[1.25fr_1fr] md:gap-16">
        <div className="flex flex-col gap-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
            {localities().join(" · ")} · <DemoBadge />
          </p>
          <h1 id="explore-hero" className="font-display text-display text-ink md:text-display-lg">
            {copy.heroTitle}
          </h1>
          <p className="max-w-xl text-lead leading-relaxed text-ink-muted">
            {copy.heroIntro} Explora a tu ritmo, crea un viaje que encaje en tu día o pregunta al asistente.
          </p>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Link
              href="/rutas"
              className="btn-primary inline-flex min-h-12 items-center justify-center rounded-full px-6 text-body font-semibold"
            >
              Crear mi viaje
            </Link>
            <button
              type="button"
              onClick={scrollToPlaces}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-stone px-6 text-body font-semibold text-ink transition-colors hover:bg-surface-muted"
            >
              Explorar la ruta
            </button>
          </div>
          {stopCount > 0 && (
            <p className="text-sm text-ink-muted">
              Tienes {stopCount} {stopCount === 1 ? "parada" : "paradas"} en tu viaje en este dispositivo.{" "}
              <Link href="/mi-viaje" className="font-semibold text-ink underline underline-offset-4">
                Ver Mi viaje
              </Link>
            </p>
          )}
        </div>
        <figure className="w-full">
          <SiteImage site={heroSite} aspect="aspect-[4/5]" rounded="rounded-3xl" priority sizes="(min-width: 768px) 420px, 100vw" />
          {heroSite.image && (
            <figcaption className="mt-3 text-xs text-ink-muted">
              {heroSite.name} · Foto: {heroSite.image.author}, {heroSite.image.license}
            </figcaption>
          )}
        </figure>
      </section>

      <AskComposer />

      {/* Theme chips */}
      <section aria-labelledby="explore-themes" className="flex flex-col gap-3">
        <h2 id="explore-themes" className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Temas
        </h2>
        <ul className="flex flex-wrap gap-2">
          {[null, ...themes].map((theme) => {
            const active = filters.theme === theme;
            return (
              <li key={theme ?? "all"}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ theme })}
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors duration-150 ${
                    active
                      ? "border-primary bg-primary font-semibold text-on-primary"
                      : "border-stone text-ink hover:bg-surface-muted"
                  }`}
                >
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
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-stone px-6 py-12 text-center">
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
            className="btn-primary min-h-11 rounded-full px-5 text-sm font-semibold"
          >
            Borrar filtros
          </button>
        </div>
      ) : (
        <>
          <section aria-labelledby="explore-routes" className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2 id="explore-routes" className="font-display text-3xl text-ink">
                Rutas
              </h2>
              <Link href="/rutas" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline-offset-4 hover:underline">
                Ver todas
              </Link>
            </div>
            {routes.length > 0 ? (
              <ul className="grid gap-5 sm:grid-cols-2">
                {routes.map((r, i) => (
                  <li key={r.id} className="rise flex" style={{ ["--i" as string]: i }}>
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
              <h2 id="lugares" ref={placesHeadingRef} tabIndex={-1} className="scroll-mt-4 font-display text-3xl text-ink">
                Lugares
              </h2>
              <span className="flex items-center gap-3 text-sm text-ink-muted">
                {filtered ? `${sites.length} de ${allSites().length}` : `${allSites().length} lugares`}
                {filtered && (
                  <button
                    type="button"
                    onClick={reset}
                    className="min-h-11 font-semibold text-ink underline-offset-4 hover:underline"
                  >
                    Borrar filtros
                  </button>
                )}
              </span>
            </div>
            <p className="text-sm text-ink-muted">
              {preferences.interests.length > 0 ? (
                <>
                  Primero lo que te interesa: {preferences.interests.map(themeLabel).join(", ")}.{" "}
                  <Link href="/cuenta" className="font-semibold text-ink underline underline-offset-4">
                    Cambiar
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/cuenta" className="font-semibold text-ink underline underline-offset-4">
                    Dinos qué te interesa
                  </Link>{" "}
                  y ordenaremos los lugares para ti.
                </>
              )}
            </p>
            {sites.length > 0 ? (
              <div className="flex flex-col gap-10">
                <PlaceGroup
                  title={copy.placeGroups.visigothic.title}
                  intro={copy.placeGroups.visigothic.intro}
                  sites={sites.filter((s) => s.visigothic)}
                />
                <PlaceGroup
                  title={copy.placeGroups.other.title}
                  intro={`${copy.placeGroups.other.intro} Cada ficha lo indica como patrimonio no visigodo.`}
                  sites={sites.filter((s) => !s.visigothic)}
                />
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Ningún lugar coincide con estos filtros.</p>
            )}
            <p className="text-xs text-ink-muted">Autoría y licencia de cada foto en su ficha.</p>
          </section>
        </>
      )}
    </div>
  );
}

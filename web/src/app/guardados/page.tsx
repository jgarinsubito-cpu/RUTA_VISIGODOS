"use client";
/** Guardados: saved ideas (not scheduled). Adding one to the trip goes through a planner proposal. */
import Link from "next/link";
import { useRef } from "react";
import type { Site } from "@/domain/types";
import { getSite } from "@/data/content";
import { useAppState } from "@/state/store";
import { IconHeart, IconInfo, IconMap } from "@/components/shell/icons";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { SavedSiteItem } from "@/components/tripview/SavedSiteItem";

export default function GuardadosPage() {
  const savedIds = useAppState((s) => s.savedSiteIds);
  const tripIds = useAppState((s) => s.trip.stops.map((st) => st.siteId).join(","));
  const headingRef = useRef<HTMLHeadingElement>(null);

  const sites = savedIds.map((id) => getSite(id)).filter((s): s is Site => s !== undefined);
  const inTrip = sites.filter((s) => tripIds.split(",").includes(s.id)).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <header className="flex flex-col gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wider text-accent">Tus ideas</p>
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl leading-tight text-ink md:text-4xl">
          Guardados
        </h1>
        <p className="flex max-w-2xl items-start gap-2 text-sm text-ink-muted">
          <IconInfo width={16} height={16} className="mt-0.5 shrink-0" />
          <span>
            Guardar no lo programa en tu viaje: usa «Añadir a mi viaje» para colocarlo en el horario.
          </span>
        </p>
        {sites.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <p aria-live="polite" className="text-sm font-medium text-ink">
              {sites.length === 1 ? "1 lugar guardado" : `${sites.length} lugares guardados`}
              {` · ${inTrip === 1 ? "1 ya está" : `${inTrip} ya están`} en tu viaje`}
            </p>
            <DemoBadge />
          </div>
        )}
      </header>

      {sites.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-stone bg-surface px-6 py-10 text-center">
          <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-surface-muted text-accent">
            <IconHeart width={28} height={28} />
          </span>
          <h2 className="font-display text-2xl text-ink">Aún no has guardado lugares</h2>
          <p className="max-w-md text-sm text-ink-muted">
            Pulsa «Guardar» en la ficha de un lugar para tenerlo a mano mientras decides tu visita.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
            >
              Explorar lugares
            </Link>
            <Link
              href="/mapa"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
            >
              <IconMap width={18} height={18} />
              Ver el mapa
            </Link>
          </div>
        </section>
      ) : (
        <ul aria-label="Lugares guardados" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => (
            <SavedSiteItem key={site.id} site={site} onRemoved={() => headingRef.current?.focus()} />
          ))}
        </ul>
      )}
    </div>
  );
}

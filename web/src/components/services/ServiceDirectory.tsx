"use client";
/**
 * /servicios: every service of the network, filtered by type and town, and how the planner orders
 * them (public criteria, Reglamento (UE) 2019/1150). Heritage content is never sponsored.
 */
import Link from "next/link";
import { useId, useState } from "react";
import { localities, services } from "@/data/content";
import { RANKING_CRITERIA } from "@/domain/services";
import type { ServiceCategory } from "@/domain/types";
import { LEGAL } from "@/data/legal";
import { SERVICE_CATEGORY_PLURAL } from "@/lib/labels";
import { Val } from "@/components/legal/LegalPage";
import { ServiceCard } from "./ServiceCard";

const ORDER: ServiceCategory[] = ["restaurant", "cafe", "lodging", "car-rental", "guided-visit", "experience", "transport", "parking", "shop", "tourist-office"];
const chip =
  "relative inline-flex min-h-11 cursor-pointer items-center rounded-full border border-stone px-4 text-sm text-ink hover:border-ink/40 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:font-semibold has-[:checked]:text-on-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink";

export function ServiceDirectory() {
  const id = useId();
  const all = services();
  const towns = localities();
  const [category, setCategory] = useState<ServiceCategory | "all">("all");
  const [town, setTown] = useState<string>("all");
  const present = ORDER.filter((c) => all.some((s) => s.category === c));
  const shown = all.filter((s) => (category === "all" || s.category === category) && (town === "all" || s.locality === town));
  const groups = present.map((c) => ({ c, list: shown.filter((s) => s.category === c).sort((a, b) => a.name.localeCompare(b.name, "es")) })).filter((g) => g.list.length);
  const examples = all.some((s) => s.demo);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
      <header className="flex flex-col gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wider text-accent">Servicios</p>
        <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">Comer, dormir y moverse por la ruta</h1>
        <p className="max-w-2xl text-lead leading-relaxed text-ink-muted">
          Empresas de la red en Toledo y su territorio. Para añadirlas a tu viaje en el momento adecuado, organiza tu recorrido y elígelas día a día en{" "}
          <Link href="/mi-viaje" className="font-semibold text-ink underline underline-offset-4">
            Mi viaje
          </Link>
          .
        </p>
        {examples && (
          <p className="rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm text-ink">
            Los servicios marcados como «Ejemplo» sirven para probar el planificador: no son empresas reales. Se sustituirán por las empresas que se adhieran a la red.
          </p>
        )}
      </header>

      {all.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone p-6 text-sm text-ink-muted">Todavía no hay empresas adheridas en la red.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <fieldset className="flex flex-col">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">Tipo</legend>
              <div className="flex flex-wrap gap-2">
                <label className={chip}>
                  <input type="radio" name={`${id}-cat`} checked={category === "all"} onChange={() => setCategory("all")} className="sr-only" />
                  Todos
                </label>
                {present.map((c) => (
                  <label key={c} className={chip}>
                    <input type="radio" name={`${id}-cat`} checked={category === c} onChange={() => setCategory(c)} className="sr-only" />
                    {SERVICE_CATEGORY_PLURAL[c]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex max-w-xs flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Localidad</span>
              <select value={town} onChange={(e) => setTown(e.target.value)} className="min-h-11 rounded-xl border border-stone bg-surface px-3 text-sm text-ink">
                <option value="all">Todas</option>
                {towns.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div aria-live="polite" className="flex flex-col gap-8">
            {groups.length === 0 && <p className="text-sm text-ink-muted">No hay servicios de ese tipo en esa localidad.</p>}
            {groups.map(({ c, list }) => (
              <section key={c} aria-labelledby={`${id}-${c}`} className="flex flex-col gap-3">
                <h2 id={`${id}-${c}`} className="font-display text-2xl text-ink">
                  {SERVICE_CATEGORY_PLURAL[c]}
                </h2>
                <ul className="grid gap-3 md:grid-cols-2">
                  {list.map((s) => (
                    <li key={s.id}>
                      <ServiceCard service={s} id={s.slug} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <section id="como-ordenamos" aria-labelledby={`${id}-orden`} className="flex scroll-mt-6 flex-col gap-2 rounded-2xl border border-stone bg-surface p-4 md:p-5">
        <h2 id={`${id}-orden`} className="font-display text-2xl text-ink">
          Cómo ordenamos los servicios
        </h2>
        <p className="text-sm text-ink-muted">Cuando el planificador te propone dónde comer, dormir o qué visita guiada hacer, sigue estos criterios, en este orden:</p>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink">
          {RANKING_CRITERIA.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
        <p className="text-sm text-ink-muted">
          Los contenidos sobre el patrimonio (relatos, fichas, audios y respuestas del asistente) nunca se patrocinan. Los datos de cada empresa llevan la fecha en que se comprobaron con ella; la app no
          reserva ni cobra: reservas directamente con cada empresa.
        </p>
        <p className="text-sm text-ink-muted">
          ¿Tienes una empresa en la ruta y quieres aparecer? Cualquier empresa que cumpla las condiciones puede adherirse: escribe a <Val>{LEGAL.owner.email}</Val>.
        </p>
      </section>
    </div>
  );
}

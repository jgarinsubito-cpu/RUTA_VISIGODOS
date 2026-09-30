import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/data/content";
import { RouteCard } from "@/components/shared/RouteCard";
import { DemoBadge } from "@/components/shared/DemoBadge";

export const metadata: Metadata = {
  title: "Rutas",
  description: "Rutas temáticas por la Toledo visigoda y Guadamur, listas para adaptar a tu día.",
};

export default function RoutesPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 pt-6 md:px-8 md:pt-10">
      <header className="flex flex-col gap-3">
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-accent">Crear mi viaje</p>
        <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">Elige una ruta para empezar</h1>
        <p className="max-w-prose text-base leading-relaxed text-ink-muted">
          Cada ruta es un punto de partida. Al adaptarla, calculamos horarios con tu fecha y hora de inicio, y te
          mostramos el resultado antes de cambiar nada en tu viaje.
        </p>
        <DemoBadge className="self-start" />
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {ROUTES.map((r) => (
          <li key={r.id} className="flex">
            <RouteCard route={r} className="w-full" />
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-muted">
        ¿Prefieres elegir lugares uno a uno? Añádelos desde su ficha en{" "}
        <Link href="/#lugares" className="font-semibold text-primary underline underline-offset-2">
          Explorar
        </Link>
        .
      </p>
    </div>
  );
}

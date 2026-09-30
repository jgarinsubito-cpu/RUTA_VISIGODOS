/** Curated route card linking to /rutas/[slug]: the stops as small photos, then the essentials. */
import Link from "next/link";
import type { Route } from "@/domain/types";
import { getSite } from "@/data/content";
import { routeMinutes } from "@/domain/planner";
import { formatDuration, TRANSPORT_LABEL } from "@/lib/labels";
import { SiteImage } from "./SiteImage";

export function RouteCard({ route, className = "" }: { route: Route; className?: string }) {
  const stops = route.stopIds.map((id) => getSite(id)).filter((s) => s !== undefined);
  return (
    <Link
      href={`/rutas/${route.slug}`}
      className={`group flex h-full flex-col gap-5 rounded-3xl border border-stone bg-surface p-5 transition-colors duration-150 hover:bg-surface-muted md:p-6 ${className}`}
    >
      <span aria-hidden="true" className="grid grid-cols-3 gap-1.5">
        {stops.map((s) => (
          <SiteImage key={s.id} site={s} aspect="aspect-square" rounded="rounded-xl" sizes="120px" />
        ))}
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-muted">
          {TRANSPORT_LABEL[route.transport]} · Aprox. {formatDuration(routeMinutes(route))} · {route.stopIds.length} paradas
        </span>
        <span className="font-display text-2xl leading-tight text-ink">{route.name}</span>
        <span className="line-clamp-2 text-sm leading-relaxed text-ink-muted">{stops.map((s) => s.name).join(" → ")}</span>
      </span>
      <span className="mt-auto text-right text-sm font-semibold text-ink underline-offset-4 group-hover:underline">Ver ruta</span>
    </Link>
  );
}

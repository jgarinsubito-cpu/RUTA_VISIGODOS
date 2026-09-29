/** Curated route card linking to /rutas/[slug]. */
import Link from "next/link";
import type { Route } from "@/domain/types";
import { getSite } from "@/data/catalog";
import { formatDuration, TRANSPORT_LABEL } from "@/lib/labels";
import { IconClock, IconPin, IconRoute } from "@/components/shell/icons";
import { DemoBadge } from "./DemoBadge";

export function RouteCard({ route, className = "" }: { route: Route; className?: string }) {
  const stops = route.stopIds.map((id) => getSite(id)).filter((s) => s !== undefined);
  return (
    <Link
      href={`/rutas/${route.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-stone bg-surface shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      <span aria-hidden="true" className="flex h-20 w-full">
        {stops.map((s) => (
          <span key={s.id} className="h-full flex-1" style={{ backgroundImage: s.imageTone }} />
        ))}
      </span>
      <span className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gold">Ruta</span>
        <span className="font-display text-lg leading-snug text-ink">{route.name}</span>
        <span className="text-sm text-ink-muted">{route.theme}</span>
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <IconPin width={14} height={14} />
            {route.stopIds.length} paradas
          </span>
          <span className="inline-flex items-center gap-1">
            <IconClock width={14} height={14} />
            Aprox. {formatDuration(route.estimatedMinutes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <IconRoute width={14} height={14} />
            {TRANSPORT_LABEL[route.transport]}
          </span>
        </span>
        {stops.length > 0 && (
          <span className="line-clamp-2 text-xs text-ink-muted">{stops.map((s) => s.name).join(" → ")}</span>
        )}
        {route.demo && (
          <span className="mt-auto pt-1">
            <DemoBadge />
          </span>
        )}
      </span>
    </Link>
  );
}

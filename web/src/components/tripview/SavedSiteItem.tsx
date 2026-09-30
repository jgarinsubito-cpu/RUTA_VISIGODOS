"use client";
/** One saved idea: the SiteCard plus "Añadir a mi viaje" (proposal flow) and "Quitar" (unsave). */
import Link from "next/link";
import type { Site } from "@/domain/types";
import { formatClock } from "@/domain/planner";
import { actions, useAppState } from "@/state/store";
import { IconClose, IconPlus, IconTrip } from "@/components/shell/icons";
import { SiteCard } from "@/components/shared/SiteCard";
import { requestAdd } from "./proposals";

export function SavedSiteItem({ site, onRemoved }: { site: Site; onRemoved?: () => void }) {
  const stop = useAppState((s) => s.trip.stops.find((st) => st.siteId === site.id));
  const pending = useAppState((s) => s.pendingProposal !== null);

  return (
    <li className="flex flex-col gap-2">
      <SiteCard site={site} />
      <div className="flex flex-wrap items-center gap-2">
        {stop ? (
          <>
            <p className="inline-flex min-h-11 flex-1 items-center gap-1.5 text-sm font-semibold text-ok">
              <IconTrip width={18} height={18} />
              Ya en tu viaje · {formatClock(stop.visitStart ?? stop.arrival)}
              {stop.status === "provisional" && <span className="font-medium text-warn">(provisional)</span>}
            </p>
            <Link
              href="/mi-viaje"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-primary underline-offset-2 hover:underline"
            >
              Ver en Mi viaje
            </Link>
          </>
        ) : (
          <button
            type="button"
            onClick={() => requestAdd(site.id)}
            disabled={pending}
            aria-label={`Añadir ${site.name} a mi viaje`}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60"
          >
            <IconPlus width={18} height={18} />
            Añadir a mi viaje
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            actions.toggleSaved(site.id);
            onRemoved?.();
          }}
          aria-label={`Quitar ${site.name} de Guardados`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-stone bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
        >
          <IconClose width={16} height={16} />
          Quitar
        </button>
      </div>
    </li>
  );
}

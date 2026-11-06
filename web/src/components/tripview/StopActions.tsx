"use client";
/** Per-stop controls on /mi-viaje: reorder, open the place page, remove. Each goes through a proposal. */
import Link from "next/link";
import type { TripStop } from "@/domain/types";
import { getSite } from "@/data/content";
import { IconChevronLeft, IconClose, IconInfo } from "@/components/shell/icons";
import { requestMove, requestMoveToDay, requestRemove } from "./proposals";

const btn =
  "grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent";

export function StopActions({
  stop,
  index,
  count,
  disabled,
  days = 1,
}: {
  stop: TripStop;
  index: number;
  count: number;
  disabled: boolean;
  /** Days of the trip: with more than one, the stop can move to another day. */
  days?: number;
}) {
  const site = getSite(stop.siteId);
  const name = site?.name ?? stop.siteId;
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={`Acciones para ${name}`}>
      <button
        type="button"
        className={btn}
        disabled={disabled || index === 0}
        onClick={() => requestMove(stop.siteId, index - 1)}
        aria-label={`Subir ${name}`}
        title="Subir"
      >
        <IconChevronLeft className="rotate-90" />
      </button>
      <button
        type="button"
        className={btn}
        disabled={disabled || index === count - 1}
        onClick={() => requestMove(stop.siteId, index + 1)}
        aria-label={`Bajar ${name}`}
        title="Bajar"
      >
        <IconChevronLeft className="-rotate-90" />
      </button>
      {site ? (
        <Link href={`/lugares/${site.slug}`} className={btn} aria-label={`Ver ficha de ${name}`} title="Ver">
          <IconInfo />
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      {days > 1 && (
        <label className="relative ml-1 inline-flex min-h-11 items-center">
          <span className="sr-only">Pasar {name} a otro día</span>
          <select
            value={stop.day ?? 0}
            disabled={disabled}
            onChange={(e) => requestMoveToDay(stop.siteId, Number(e.target.value))}
            className="min-h-11 rounded-full border border-stone bg-surface px-3 text-sm text-ink disabled:opacity-40"
          >
            {Array.from({ length: days }, (_, d) => (
              <option key={d} value={d}>
                Día {d + 1}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        type="button"
        className={`${btn} hover:text-danger`}
        disabled={disabled}
        onClick={() => requestRemove(stop.siteId)}
        aria-label={`Quitar ${name} del viaje`}
        title="Quitar"
      >
        <IconClose />
      </button>
    </div>
  );
}

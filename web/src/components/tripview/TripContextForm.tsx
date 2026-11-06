"use client";
/**
 * Editable trip constraints for /mi-viaje (date, start/end time, transport, step-free access).
 * Edits stay in a local draft; "Aplicar" records them (setContext) and asks the planner to
 * reschedule, which the visitor reviews before anything in the trip changes.
 */
import { useId, useState } from "react";
import type { TransportMode, TripContext } from "@/domain/types";
import { parseClock } from "@/domain/time";
import { formatShortDate } from "@/lib/hours";
import { TRANSPORT_LABEL } from "@/lib/labels";
import { actions } from "@/state/store";
import { IconInfo } from "@/components/shell/icons";
import { DayPicker, TimeSelect } from "@/components/shared/DateTimeFields";
import { requestContextChange, sameContext } from "./proposals";

export function contextSummary(ctx: TripContext): string {
  return [
    ctx.area,
    ctx.date ? formatShortDate(ctx.date) : "Sin fecha",
    (ctx.days ?? 1) > 1 ? `${ctx.days} días` : null,
    `${ctx.startTime}–${ctx.endTime}`,
    TRANSPORT_LABEL[ctx.transport],
    ctx.stepFreeRequired ? "Sin escalones" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

const TIME_RE = /^\d{2}:\d{2}$/;

/** One form per page: stable ids so other controls (e.g. "Elegir fecha") can open it. */
const FORM_ID = "tu-dia";
const DATE_ID = "tu-dia-fecha";

/** Open the "Tu día" form and move focus to its date choice. */
export function focusTripDate() {
  const details = document.getElementById(FORM_ID);
  if (details instanceof HTMLDetailsElement) details.open = true;
  requestAnimationFrame(() => {
    const input = document.getElementById(DATE_ID);
    input?.closest("fieldset")?.scrollIntoView({ block: "center" });
    input?.focus({ preventScroll: true });
  });
}

function validate(d: TripContext): string | null {
  if (!TIME_RE.test(d.startTime) || !TIME_RE.test(d.endTime)) return "Indica la hora de inicio y la de fin.";
  if (parseClock(d.endTime) <= parseClock(d.startTime)) return "La hora de fin debe ser posterior a la de inicio.";
  return null;
}

const label = "text-xs font-semibold uppercase tracking-wider text-ink-muted";

export interface TripContextFormProps {
  /** Constraints the current trip was scheduled with. */
  tripContext: TripContext;
  /** Constraints recorded in the store (may differ if a reschedule was not accepted). */
  storedContext: TripContext;
  hasStops: boolean;
  pending: boolean;
}

/** Remount with `key` when storedContext changes so the draft resets. */
export function TripContextForm({ tripContext, storedContext, hasStops, pending }: TripContextFormProps) {
  const [draft, setDraft] = useState<TripContext>(storedContext);
  const id = useId();
  const diverged = !sameContext(storedContext, tripContext);
  const changed = !sameContext(draft, tripContext);
  const error = validate(draft);

  function patch(p: Partial<TripContext>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  return (
    <details
      id={FORM_ID}
      open={diverged || undefined}
      className="group rounded-2xl border border-stone bg-surface [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-2.5">
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">{(tripContext.days ?? 1) > 1 ? "Tu viaje" : "Tu día"}</span>
          <span className="block text-sm font-medium text-ink">{contextSummary(tripContext)}</span>
        </span>
        <span className="shrink-0 rounded-full border border-stone px-3 py-1 text-sm font-semibold text-primary">
          <span className="group-open:hidden">Ajustar</span>
          <span className="hidden group-open:inline">Ocultar</span>
        </span>
      </summary>

      <form
        className="flex flex-col gap-4 border-t border-stone px-4 pb-4 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!error && changed && !pending) requestContextChange(draft);
        }}
      >
        {diverged && (
          <div role="status" className="flex gap-2 rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm text-ink">
            <IconInfo width={18} height={18} className="mt-0.5 shrink-0 text-warn" />
            <div className="flex flex-col gap-2">
              <p>Estos ajustes aún no se aplican a tu viaje: el cambio no se aceptó.</p>
              <button
                type="button"
                onClick={() => actions.setContext(tripContext)}
                className="min-h-11 self-start rounded-full border border-stone bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
              >
                Volver a los ajustes del viaje
              </button>
            </div>
          </div>
        )}

        <DayPicker value={draft.date} onChange={(date) => patch({ date })} focusId={DATE_ID} />
        <p className="-mt-2 text-xs text-ink-muted">Con fecha comprobamos los horarios de cada parada. Si el viaje dura varios días, es la fecha del primero.</p>

        <fieldset className="flex flex-col gap-1">
          <legend className={`${label} mb-1`}>Días</legend>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((n) => (
              <label
                key={n}
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-stone px-4 text-sm text-ink hover:border-ink/40 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:font-semibold has-[:checked]:text-on-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
              >
                <input type="radio" name={`${id}-days`} value={n} checked={(draft.days ?? 1) === n} onChange={() => patch({ days: n })} className="sr-only" />
                {n === 1 ? "1 día" : `${n} días`}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={Boolean(draft.lunchBreak)} onChange={(e) => patch({ lunchBreak: e.target.checked || undefined })} className="h-5 w-5 accent-primary" />
          Reservar una hora para comer (entre las 13:00 y las 15:00)
        </label>

        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-start`} className={label}>
              Desde
            </label>
            <TimeSelect id={`${id}-start`} value={draft.startTime} onChange={(startTime) => patch({ startTime })} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-end`} className={label}>
              Hasta
            </label>
            <TimeSelect
              id={`${id}-end`}
              value={draft.endTime}
              onChange={(endTime) => patch({ endTime })}
              invalid={Boolean(error)}
              describedBy={error ? `${id}-error` : undefined}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <fieldset className="flex flex-col gap-1">
            <legend className={`${label} mb-1`}>Transporte</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TRANSPORT_LABEL) as TransportMode[]).map((mode) => (
                <label
                  key={mode}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-stone px-4 text-sm text-ink hover:border-ink/40 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:font-semibold has-[:checked]:text-on-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
                >
                  <input
                    type="radio"
                    name={`${id}-transport`}
                    value={mode}
                    checked={draft.transport === mode}
                    onChange={() => patch({ transport: mode })}
                    className="sr-only"
                  />
                  {TRANSPORT_LABEL[mode]}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={draft.stepFreeRequired}
              onChange={(e) => patch({ stepFreeRequired: e.target.checked })}
              className="h-5 w-5 accent-primary"
            />
            Necesito acceso sin escalones
          </label>
        </div>

        {error && (
          <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm text-danger">
            <IconInfo width={16} height={16} className="shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-muted">
            {hasStops
              ? "Al aplicar, revisarás cómo cambian las horas antes de aceptar."
              : "Se usarán al añadir lugares a tu viaje."}
          </p>
          <div className="flex flex-wrap gap-2">
            {changed && (
              <button
                type="button"
                onClick={() => setDraft(tripContext)}
                className="min-h-11 rounded-full border border-stone px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
              >
                Descartar
              </button>
            )}
            <button
              type="submit"
              disabled={!changed || !!error || pending}
              className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60"
            >
              {hasStops ? "Aplicar y revisar" : "Aplicar"}
            </button>
          </div>
        </div>
      </form>
    </details>
  );
}

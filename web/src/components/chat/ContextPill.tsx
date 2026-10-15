"use client";
/**
 * Segmented trip-context pill (Mindtrip "Dónde | Cuándo | Quién | Presupuesto", adapted to
 * Dónde | Cuándo | Quién | Transporte). Each segment opens a non-modal popover that edits the
 * stored context through actions.setContext. The parent decides what happens on close.
 * Below `sm` the four segments collapse into a one-line summary that expands on demand, so the
 * conversation keeps the screen.
 */
import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { showcase, tripAreas } from "@/data/content";
import type { TransportMode, TripContext, VisitorProfile } from "@/domain/types";
import { parseClock } from "@/domain/time";
import { TRANSPORT_LABEL } from "@/lib/labels";
import { actions } from "@/state/store";
import { IconChevronDown, IconInfo } from "@/components/shell/icons";
import { DayPicker, TimeSelect } from "@/components/shared/DateTimeFields";
import { contextLine, PROFILE_HINT, PROFILE_LABEL, whenLabel, whoLabel } from "./format";
import { usePopover } from "./usePopover";

export type Segment = "where" | "when" | "who" | "transport";

const SEGMENT_LABEL: Record<Segment, string> = {
  where: "Dónde",
  when: "Cuándo",
  who: "Quién",
  transport: "Transporte",
};

const TIME_RE = /^\d{2}:\d{2}$/;
const fieldLabel = "text-xs font-semibold uppercase tracking-wider text-ink-muted";
const optionRow =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-stone px-3 py-2.5 text-sm text-ink has-[:checked]:border-primary has-[:checked]:bg-surface-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent";

function Options<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${fieldLabel} mb-1`}>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={optionRow}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="flex flex-col">
            <span className="font-semibold">{o.label}</span>
            {o.hint && <span className="text-xs text-ink-muted">{o.hint}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function WhenFields({ context }: { context: TripContext }) {
  const id = useId();
  const [start, setStart] = useState(context.startTime);
  const [end, setEnd] = useState(context.endTime);
  const invalid = !TIME_RE.test(start) || !TIME_RE.test(end);
  const error = invalid
    ? "Indica la hora de inicio y la de fin."
    : parseClock(end) <= parseClock(start)
      ? "La hora de fin debe ser posterior a la de inicio."
      : null;

  function commit(nextStart: string, nextEnd: string) {
    if (TIME_RE.test(nextStart) && TIME_RE.test(nextEnd) && parseClock(nextEnd) > parseClock(nextStart)) {
      actions.setContext({ startTime: nextStart, endTime: nextEnd });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <DayPicker value={context.date} onChange={(date) => actions.setContext({ date })} legend="Fecha de la visita" />
      <p className="-mt-2 text-xs text-ink-muted">Sin fecha no se pueden comprobar horarios.</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-start`} className={fieldLabel}>
            Desde
          </label>
          <TimeSelect
            id={`${id}-start`}
            value={start}
            onChange={(v) => {
              setStart(v);
              commit(v, end);
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-end`} className={fieldLabel}>
            Hasta
          </label>
          <TimeSelect
            id={`${id}-end`}
            value={end}
            onChange={(v) => {
              setEnd(v);
              commit(start, v);
            }}
            invalid={Boolean(error)}
            describedBy={error ? `${id}-error` : undefined}
          />
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm text-danger">
          <IconInfo width={16} height={16} className="shrink-0" />
          {error} Se mantiene {context.startTime}–{context.endTime}.
        </p>
      )}
    </div>
  );
}

function SegmentBody({ segment, context }: { segment: Segment; context: TripContext }) {
  const name = useId();
  switch (segment) {
    case "where":
      return (
        <Options
          legend="Zona de la visita"
          name={name}
          value={context.area}
          options={tripAreas().map((a) => ({ value: a, label: a, hint: showcase().areaHints[a] }))}
          onChange={(area) => actions.setContext({ area })}
        />
      );
    case "when":
      return <WhenFields context={context} />;
    case "who":
      return (
        <div className="flex flex-col gap-3">
          <Options<VisitorProfile>
            legend="Cómo quieres que te explique"
            name={name}
            value={context.profile}
            options={(Object.keys(PROFILE_LABEL) as VisitorProfile[]).map((p) => ({
              value: p,
              label: PROFILE_LABEL[p],
              hint: PROFILE_HINT[p],
            }))}
            onChange={(profile) => actions.setContext({ profile })}
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={context.stepFreeRequired}
              onChange={(e) => actions.setContext({ stepFreeRequired: e.target.checked })}
              className="h-5 w-5 shrink-0 accent-primary"
            />
            Necesito acceso sin escalones
          </label>
          <p className="text-xs text-ink-muted">
            La accesibilidad de la mayoría de lugares aún está sin verificar; te lo indicaremos en cada parada.
          </p>
        </div>
      );
    default:
      return (
        <Options<TransportMode>
          legend="Cómo te desplazas"
          name={name}
          value={context.transport}
          options={(Object.keys(TRANSPORT_LABEL) as TransportMode[]).map((t) => ({
            value: t,
            label: TRANSPORT_LABEL[t],
            hint: showcase().transportHints[t],
          }))}
          onChange={(transport) => actions.setContext({ transport })}
        />
      );
  }
}

function segmentValue(segment: Segment, ctx: TripContext): string {
  switch (segment) {
    case "where":
      return ctx.area;
    case "when":
      return whenLabel(ctx);
    case "who":
      return whoLabel(ctx);
    default:
      return TRANSPORT_LABEL[ctx.transport];
  }
}

function Popover({
  segment,
  context,
  triggerRef,
  onClose,
  id,
}: {
  segment: Segment;
  context: TripContext;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  id: string;
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  usePopover(true, ref, triggerRef, onClose);
  return (
    <div
      ref={ref}
      id={id}
      role="dialog"
      aria-label={SEGMENT_LABEL[segment]}
      tabIndex={-1}
      className="absolute inset-x-0 top-full z-30 mt-2 flex max-h-[min(70dvh,34rem)] flex-col gap-4 overflow-y-auto rounded-2xl border border-stone bg-surface p-4 shadow-lg sm:left-1/2 sm:right-auto sm:w-[22rem] sm:-translate-x-1/2"
    >
      <h2 className="font-display text-lg text-ink">{SEGMENT_LABEL[segment]}</h2>
      <SegmentBody segment={segment} context={context} />
      <div className="flex items-center justify-between gap-3 border-t border-stone pt-3">
        <p className="text-xs text-ink-muted">Se guarda en este dispositivo.</p>
        <button
          type="button"
          onClick={() => {
            onClose();
            triggerRef.current?.focus();
          }}
          className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
        >
          Listo
        </button>
      </div>
    </div>
  );
}

export function ContextPill({
  context,
  open,
  onOpenChange,
  className = "",
}: {
  context: TripContext;
  open: Segment | null;
  onOpenChange: (segment: Segment | null) => void;
  className?: string;
}) {
  const baseId = useId();
  const where = useRef<HTMLButtonElement>(null);
  const when = useRef<HTMLButtonElement>(null);
  const who = useRef<HTMLButtonElement>(null);
  const transport = useRef<HTMLButtonElement>(null);
  const refs: Record<Segment, RefObject<HTMLButtonElement | null>> = { where, when, who, transport };
  const segments = Object.keys(SEGMENT_LABEL) as Segment[];
  const [expanded, setExpanded] = useState(false);
  // An open segment always needs its trigger on screen (the popover is anchored below it).
  const showSegments = expanded || open !== null;
  const gridId = `${baseId}-segments`;

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        aria-expanded={showSegments}
        aria-controls={gridId}
        onClick={() => {
          if (showSegments) onOpenChange(null);
          setExpanded(!showSegments);
        }}
        className={`flex min-h-11 w-full items-center gap-2 rounded-full border border-stone bg-surface px-4 text-left sm:hidden ${
          showSegments ? "mb-2" : ""
        }`}
      >
        <span className="min-w-0 flex-1 truncate text-sm text-ink">
          <span className="sr-only">Preferencias de tu visita: </span>
          {contextLine(context)}
        </span>
        <span className="shrink-0 text-xs font-semibold text-ink-muted">{showSegments ? "Ocultar" : "Cambiar"}</span>
        <IconChevronDown
          width={16}
          height={16}
          aria-hidden="true"
          className={`shrink-0 text-ink-muted motion-safe:transition-transform ${showSegments ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={gridId}
        role="group"
        aria-label="Preferencias de tu visita"
        className={`${showSegments ? "grid" : "hidden"} grid-cols-2 gap-px overflow-hidden rounded-2xl border border-stone bg-stone sm:flex sm:gap-0 sm:overflow-x-auto sm:rounded-full sm:bg-surface [scrollbar-width:none]`}
      >
        {segments.map((segment, i) => {
          const value = segmentValue(segment, context);
          const expanded = open === segment;
          return (
            <button
              key={segment}
              ref={refs[segment]}
              type="button"
              aria-expanded={expanded}
              aria-controls={expanded ? `${baseId}-${segment}` : undefined}
              aria-label={`${SEGMENT_LABEL[segment]}: ${value}. Cambiar`}
              onClick={() => onOpenChange(expanded ? null : segment)}
              className={`flex min-h-11 min-w-0 flex-col justify-center px-4 py-1 text-left leading-tight focus-visible:outline-offset-[-2px] sm:shrink-0 ${
                i > 0 ? "sm:border-l sm:border-stone" : ""
              } ${i === 0 ? "sm:rounded-l-full" : ""} ${i === segments.length - 1 ? "sm:rounded-r-full" : ""} ${
                expanded ? "bg-surface-muted" : "bg-surface hover:bg-surface-muted"
              }`}
            >
              <span className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">{SEGMENT_LABEL[segment]}</span>
              <span className="truncate text-sm font-medium text-ink sm:overflow-visible sm:whitespace-nowrap">{value}</span>
            </button>
          );
        })}
      </div>
      {open && (
        <Popover
          key={open}
          id={`${baseId}-${open}`}
          segment={open}
          context={context}
          triggerRef={refs[open]}
          onClose={() => onOpenChange(null)}
        />
      )}
    </div>
  );
}

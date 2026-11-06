"use client";
/**
 * Review dialog for state.pendingProposal (PLAN.md: before/after, apply only on acceptance).
 * Bottom sheet on mobile, centered dialog from md. Focus trapped; Escape cancels; focus returns.
 */
import { useId, useRef } from "react";
import type { ItineraryProposal, SiteId, StopWarning, TripBreak, TripContext, TripService, TripStop } from "@/domain/types";
import { getService, getSite } from "@/data/content";
import { describeSharedWarning, groupWarnings, warningKey } from "@/domain/warnings";
import { TRANSPORT_LABEL } from "@/lib/labels";
import { actions, useAppState } from "@/state/store";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { IconClose, IconInfo } from "@/components/shell/icons";
import { TripTimeline, type StopMark, type TripTimelineProps, type WarningMark } from "./TripTimeline";

const SLOT_LABEL: Record<TripService["slot"], string> = { lunch: "comida", overnight: "alojamiento", car: "coche", activity: "actividad" };

/** Services chosen or removed by the proposal, in words. */
function serviceChanges(before: readonly TripService[], after: readonly TripService[] | undefined, multi: boolean): string[] {
  if (!after) return [];
  const key = (s: TripService) => `${s.day}|${s.slot}|${s.serviceId}`;
  const was = new Set(before.map(key));
  const now = new Set(after.map(key));
  const text = (s: TripService) => {
    const name = getService(s.serviceId)?.name ?? s.serviceId;
    const when = multi ? (s.slot === "overnight" ? `, noche del día ${s.day + 1}` : `, día ${s.day + 1}`) : "";
    return `${name} (${SLOT_LABEL[s.slot]}${when})`;
  };
  return [
    ...after.filter((s) => !was.has(key(s))).map((s) => `Se elige: ${text(s)}`),
    ...before.filter((s) => !now.has(key(s))).map((s) => `Se quita: ${text(s)}`),
  ];
}

/** The timeline split by day when the trip has more than one. */
function DayTimelines({ stops, breaks = [], days, ...rest }: Omit<TripTimelineProps, "stops" | "breaks"> & { stops: TripStop[]; breaks?: readonly TripBreak[]; days: number }) {
  if (days <= 1) return <TripTimeline stops={stops} breaks={breaks} {...rest} />;
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: days }, (_, d) => {
        const dayStops = stops.filter((s) => (s.day ?? 0) === d);
        if (dayStops.length === 0) return null;
        return (
          <div key={d} className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-ink">Día {d + 1}</p>
            <TripTimeline {...rest} stops={dayStops} breaks={breaks.filter((b) => b.day === d)} startNumber={stops.indexOf(dayStops[0]) + 1} />
          </div>
        );
      })}
    </div>
  );
}

function siteNames(ids: SiteId[]) {
  return ids.map((id) => getSite(id)?.name ?? id).join(", ");
}

function marksFor(p: ItineraryProposal) {
  const beforeArrival = new Map(p.before.map((s) => [s.siteId, s.arrival]));
  const before: Partial<Record<SiteId, StopMark>> = {};
  const after: Partial<Record<SiteId, StopMark>> = {};
  for (const id of p.removed) before[id] = "removed";
  for (const s of p.after) {
    if (p.added.includes(s.siteId)) after[s.siteId] = "added";
    else if (beforeArrival.has(s.siteId) && beforeArrival.get(s.siteId) !== s.arrival) after[s.siteId] = "changed";
  }
  return { before, after };
}

/** Warnings that appear or disappear for stops present on both sides. */
function warningMarks(p: ItineraryProposal) {
  const keys = (warnings: StopWarning[]) => new Set(warnings.map(warningKey));
  const before = new Map(p.before.map((s) => [s.siteId, keys(s.warnings)]));
  const after = new Map(p.after.map((s) => [s.siteId, keys(s.warnings)]));
  return {
    before: (id: SiteId, w: StopWarning): WarningMark | undefined =>
      after.has(id) && !after.get(id)!.has(warningKey(w)) ? "gone" : undefined,
    after: (id: SiteId, w: StopWarning): WarningMark | undefined =>
      before.has(id) && !before.get(id)!.has(warningKey(w)) ? "new" : undefined,
  };
}

/** Same stops in the same order at the same times: only settings or warnings differ. */
function sameStops(p: ItineraryProposal): boolean {
  return (
    p.before.length === p.after.length &&
    p.after.every((s, i) => {
      const b = p.before[i];
      return b.siteId === s.siteId && b.arrival === s.arrival && b.departure === s.departure;
    })
  );
}

const PROFILE_LABEL: Record<TripContext["profile"], string> = {
  general: "General",
  family: "En familia",
  expert: "Experto",
};

/** Human-readable settings that the proposal changes (date, times, transport…). */
function contextChanges(before: TripContext, after: TripContext): string[] {
  const out: string[] = [];
  if (before.date !== after.date) out.push(`Fecha: ${after.date ?? "sin fecha"}`);
  if (before.startTime !== after.startTime || before.endTime !== after.endTime) {
    out.push(`Horario: ${after.startTime}–${after.endTime}`);
  }
  if (before.transport !== after.transport) out.push(`Transporte: ${TRANSPORT_LABEL[after.transport].toLowerCase()}`);
  if (before.stepFreeRequired !== after.stepFreeRequired) {
    out.push(after.stepFreeRequired ? "Necesito acceso sin escalones" : "Sin requisito de acceso sin escalones");
  }
  if (before.profile !== after.profile) out.push(`Perfil: ${PROFILE_LABEL[after.profile] ?? after.profile}`);
  if (before.area !== after.area) out.push(`Zona: ${after.area}`);
  if ((before.days ?? 1) !== (after.days ?? 1)) out.push(`Días: ${after.days ?? 1}`);
  if (Boolean(before.lunchBreak) !== Boolean(after.lunchBreak)) out.push(after.lunchBreak ? "Con hora para comer" : "Sin hora para comer");
  return out;
}

function accept() {
  try {
    actions.acceptProposal();
  } catch {
    actions.dismissProposal();
    actions.notify("No se pudo aplicar el cambio. Tu viaje sigue igual.");
  }
}

export function ProposalReview() {
  const proposal = useAppState((s) => s.pendingProposal);
  const tripContext = useAppState((s) => s.trip.context);
  const tripServices = useAppState((s) => s.trip.services);
  const tripBreaks = useAppState((s) => s.trip.breaks);
  const savedSiteIds = useAppState((s) => s.savedSiteIds);
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const open = proposal !== null;
  useFocusTrap(ref, open, () => actions.dismissProposal());

  if (!proposal) return null;

  const single = proposal.added.length === 1 ? proposal.added[0] : undefined;
  const canSaveForLater = !proposal.ok && single !== undefined && !savedSiteIds.includes(single);
  const marks = marksFor(proposal);
  const wMarks = warningMarks(proposal);
  const unchangedStops = sameStops(proposal);
  const nextContext = proposal.context;
  const settingChanges = contextChanges(tripContext, nextContext);
  // Trip-wide warnings are listed once under "Ten en cuenta" instead of on every stop.
  const beforeGroups = groupWarnings(proposal.before);
  const afterGroups = groupWarnings(proposal.after);
  const notes = [...proposal.warnings, ...afterGroups.shared.map(describeSharedWarning)];
  const daysBefore = tripContext.days ?? 1;
  const daysAfter = nextContext.days ?? 1;
  const servicesChanged = serviceChanges(tripServices ?? [], proposal.services, daysAfter > 1);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div aria-hidden="true" className="absolute inset-0 bg-scrim" onClick={() => actions.dismissProposal()} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-xl md:max-w-2xl md:rounded-2xl"
      >
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-stone md:hidden" />
        <header className="flex items-start gap-3 border-b border-stone px-5 pb-3 pt-3 md:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} tabIndex={-1} data-autofocus={proposal.ok ? "" : undefined} className="rounded-sm font-display text-xl text-ink">
              Revisar cambio en tu viaje
            </h2>
            <p id={descId} className="mt-1 text-sm text-ink-muted">
              {proposal.ok
                ? "Nada cambia hasta que aceptes. Revisa el antes y el después."
                : "Este cambio no se puede aplicar tal como está."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => actions.dismissProposal()}
            aria-label="Cerrar sin cambiar el viaje"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-muted"
          >
            <IconClose />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!proposal.ok ? (
            <div className="flex gap-3 rounded-xl border border-warn/40 bg-warn-soft p-4 text-sm text-ink">
              <IconInfo className="mt-0.5 shrink-0 text-warn" />
              <div>
                {single && <p className="font-semibold">{getSite(single)?.name ?? single}</p>}
                <p>{proposal.reason ?? "No es posible encajar este cambio en el tiempo disponible."}</p>
                {canSaveForLater && (
                  <p className="mt-2 text-ink-muted">Puedes guardarlo para más tarde y probar con otro horario.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {(proposal.added.length > 0 || proposal.removed.length > 0 || settingChanges.length > 0 || servicesChanged.length > 0) && (
                <ul className="flex flex-col gap-1 text-sm">
                  {settingChanges.length > 0 && (
                    <li>
                      <span className="font-semibold">Ajustes del día:</span> {settingChanges.join(" · ")}
                    </li>
                  )}
                  {proposal.added.length > 0 && (
                    <li>
                      <span className="font-semibold">Se añade:</span> {siteNames(proposal.added)}
                    </li>
                  )}
                  {proposal.removed.length > 0 && (
                    <li>
                      <span className="font-semibold">Se quita:</span> {siteNames(proposal.removed)}
                    </li>
                  )}
                  {servicesChanged.map((line) => (
                    <li key={line}>
                      <span className="font-semibold">{line.slice(0, line.indexOf(":") + 1)}</span>
                      {line.slice(line.indexOf(":") + 1)}
                    </li>
                  ))}
                  {unchangedStops && proposal.before.length > 0 && servicesChanged.length === 0 && (
                    <li>
                      <span className="font-semibold">Paradas:</span> sin cambios de orden ni de hora. Cambian solo los avisos
                      marcados como <span className="font-semibold text-warn">Nuevo</span>.
                    </li>
                  )}
                </ul>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <section aria-labelledby={`${titleId}-before`}>
                  <h3 id={`${titleId}-before`} className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Antes
                  </h3>
                  {proposal.before.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-stone p-4 text-sm text-ink-muted">Tu viaje está vacío.</p>
                  ) : (
                    <DayTimelines
                      days={daysBefore}
                      stops={proposal.before}
                      breaks={tripBreaks}
                      transport={tripContext.transport}
                      marks={marks.before}
                      warningMark={wMarks.before}
                      hiddenCodes={beforeGroups.hiddenCodes}
                      compact
                      aria-label="Viaje antes del cambio"
                    />
                  )}
                </section>
                <section aria-labelledby={`${titleId}-after`}>
                  <h3 id={`${titleId}-after`} className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink">
                    Después
                  </h3>
                  {proposal.after.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-stone p-4 text-sm text-ink-muted">
                      El viaje quedará vacío.
                    </p>
                  ) : (
                    <DayTimelines
                      days={daysAfter}
                      stops={proposal.after}
                      breaks={proposal.breaks ?? tripBreaks}
                      transport={nextContext.transport}
                      marks={marks.after}
                      warningMark={wMarks.after}
                      hiddenCodes={afterGroups.hiddenCodes}
                      compact
                      aria-label="Viaje después del cambio"
                    />
                  )}
                </section>
              </div>

              {notes.length > 0 && (
                <section aria-labelledby={`${titleId}-warn`} className="rounded-xl border border-warn/40 bg-warn-soft p-4">
                  <h3 id={`${titleId}-warn`} className="flex items-center gap-1.5 text-sm font-semibold text-warn">
                    <IconInfo width={16} height={16} />
                    Ten en cuenta
                  </h3>
                  <ul className="mt-1.5 list-disc pl-5 text-sm text-ink">
                    {notes.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-stone px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:justify-end md:pb-4">
          {proposal.ok ? (
            <>
              <button
                type="button"
                onClick={() => actions.dismissProposal()}
                className="min-h-11 rounded-full border border-stone px-5 text-sm font-semibold text-ink hover:bg-surface-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={accept}
                className="btn-primary min-h-11 rounded-full px-5 text-sm font-semibold"
              >
                Aceptar cambio
              </button>
            </>
          ) : (
            <>
              {canSaveForLater && single && (
                <button
                  type="button"
                  onClick={() => {
                    actions.toggleSaved(single);
                    actions.dismissProposal();
                  }}
                  className="min-h-11 rounded-full border border-stone px-5 text-sm font-semibold text-ink hover:bg-surface-muted"
                >
                  Guardar para más tarde
                </button>
              )}
              <button
                type="button"
                data-autofocus
                onClick={() => actions.dismissProposal()}
                className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
              >
                Entendido
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

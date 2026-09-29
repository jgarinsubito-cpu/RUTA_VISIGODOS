"use client";
/**
 * Review dialog for state.pendingProposal (PLAN.md: before/after, apply only on acceptance).
 * Bottom sheet on mobile, centered dialog from md. Focus trapped; Escape cancels; focus returns.
 */
import { useId, useRef } from "react";
import type { ItineraryProposal, SiteId, TripContext } from "@/domain/types";
import type { PlannerProposal } from "@/domain/planner";
import { getSite } from "@/data/catalog";
import { TRANSPORT_LABEL } from "@/lib/labels";
import { actions, useAppState } from "@/state/store";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { IconClose, IconInfo } from "@/components/shell/icons";
import { TripTimeline, type StopMark } from "./TripTimeline";

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
  return out;
}

function proposalContext(p: ItineraryProposal, fallback: TripContext): TripContext {
  return (p as Partial<PlannerProposal>).context ?? fallback;
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
  const nextContext = proposalContext(proposal, tripContext);
  const settingChanges = contextChanges(tripContext, nextContext);

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
              {(proposal.added.length > 0 || proposal.removed.length > 0 || settingChanges.length > 0) && (
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
                    <TripTimeline
                      stops={proposal.before}
                      transport={tripContext.transport}
                      marks={marks.before}
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
                    <TripTimeline
                      stops={proposal.after}
                      transport={nextContext.transport}
                      marks={marks.after}
                      compact
                      aria-label="Viaje después del cambio"
                    />
                  )}
                </section>
              </div>

              {proposal.warnings.length > 0 && (
                <section aria-labelledby={`${titleId}-warn`} className="rounded-xl border border-warn/40 bg-warn-soft p-4">
                  <h3 id={`${titleId}-warn`} className="flex items-center gap-1.5 text-sm font-semibold text-warn">
                    <IconInfo width={16} height={16} />
                    Ten en cuenta
                  </h3>
                  <ul className="mt-1.5 list-disc pl-5 text-sm text-ink">
                    {proposal.warnings.map((w) => (
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
                className="min-h-11 rounded-full bg-olive px-5 text-sm font-semibold text-on-olive hover:bg-olive-hover"
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
                className="min-h-11 rounded-full bg-olive px-5 text-sm font-semibold text-on-olive hover:bg-olive-hover"
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

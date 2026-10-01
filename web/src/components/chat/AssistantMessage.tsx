"use client";
/**
 * One assistant turn: text with inline place chips, a carousel of mentioned places, the sources
 * drawer, an explicit (never automatic) trip suggestion and follow-up prompts.
 */
import Link from "next/link";
import type { AssistantAnswer, Citation, SiteId } from "@/domain/types";
import { getPublishedClaim, getRoute, getSite } from "@/data/content";
import { proposeAdd, proposeFromRoute, routeMinutes } from "@/domain/planner";
import { formatClock } from "@/domain/time";
import { formatDuration, TRANSPORT_LABEL } from "@/lib/labels";
import { actions, getAppState, useAppState } from "@/state/store";
import { IconInfo, IconPlus, IconRoute, IconTrip } from "@/components/shell/icons";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { Carousel } from "@/components/shared/Carousel";
import { ClaimBody } from "@/components/shared/Claim";
import { SiteCard } from "@/components/shared/SiteCard";
import { mergePlaceNames, paragraphs, parseInline } from "./format";

const FAILED = "No se pudo calcular el cambio en tu viaje. Inténtalo de nuevo.";

function proposeSafely(make: () => ReturnType<typeof proposeAdd>) {
  if (getAppState().pendingProposal) return;
  try {
    actions.propose(make());
  } catch {
    actions.notify(FAILED);
  }
}

function PlaceChip({ siteId, selected }: { siteId: SiteId; selected: boolean }) {
  const site = getSite(siteId);
  if (!site) return null;
  return (
    <button
      type="button"
      onClick={() => actions.selectSite(siteId)}
      aria-pressed={selected}
      className={`inline font-semibold text-ink underline decoration-1 underline-offset-4 hover:decoration-2 ${
        selected ? "decoration-ink decoration-2" : "decoration-ink/40"
      }`}
    >
      {site.name}
      <span className="sr-only"> (ver ficha del lugar)</span>
    </button>
  );
}

function AnswerText({ text, selectedSiteId }: { text: string; selectedSiteId: SiteId | null }) {
  return (
    <div className="flex flex-col gap-3 text-body leading-relaxed text-ink">
      {paragraphs(text).map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {mergePlaceNames(parseInline(p), (id) => getSite(id)?.name).map((part, j) =>
            part.type === "text" ? (
              <span key={j}>{part.value}</span>
            ) : (
              <PlaceChip key={j} siteId={part.siteId} selected={part.siteId === selectedSiteId} />
            ),
          )}
        </p>
      ))}
    </div>
  );
}

/**
 * Citations are re-read from the live catalog: saved chats keep only what is still published, with
 * its current evidence level and source, and say when a source was withdrawn.
 */
function Sources({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  const live = citations.map((c) => getPublishedClaim(c.claimId)).filter((c) => c !== undefined);
  const withdrawn = citations.length - live.length;
  return (
    <>
      {withdrawn > 0 && (
        <p className="flex items-start gap-1.5 rounded-lg border border-dashed border-warn/50 bg-warn-soft px-3 py-2 text-xs text-ink">
          <IconInfo width={14} height={14} className="mt-0.5 shrink-0 text-warn" />
          Fuente retirada: {withdrawn === 1 ? "una fuente" : `${withdrawn} fuentes`} de esta respuesta ya no{" "}
          {withdrawn === 1 ? "está publicada" : "están publicadas"}. Parte del texto puede no estar vigente.
        </p>
      )}
      {live.length > 0 && (
        <details className="group rounded-xl border border-stone bg-surface [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 text-sm font-semibold text-ink">
            <span>
              Fuentes ({live.length})
              <span className="ml-2 font-normal text-ink-muted">con nivel de evidencia</span>
            </span>
            <span aria-hidden="true" className="inline-block text-ink-muted group-open:rotate-180 motion-safe:transition-transform">
              ▾
            </span>
          </summary>
          <ol className="flex flex-col gap-2 border-t border-stone px-4 py-3">
            {live.map((claim) => (
              <li key={claim.id} className="flex flex-col gap-1 rounded-lg bg-surface-muted p-3">
                <ClaimBody claim={claim} />
              </li>
            ))}
          </ol>
        </details>
      )}
    </>
  );
}

function SuggestedAction({ action }: { action: NonNullable<AssistantAnswer["suggestedAction"]> }) {
  const stops = useAppState((s) => s.trip.stops);
  const sourceRouteId = useAppState((s) => s.trip.sourceRouteId);
  const pending = useAppState((s) => s.pendingProposal !== null);
  const box = "flex flex-col gap-2 rounded-xl border border-stone bg-surface p-3 sm:flex-row sm:items-center sm:justify-between";
  const primary =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60";

  if (action.type === "add-stop") {
    const site = getSite(action.siteId);
    if (!site) return null;
    const stop = stops.find((s) => s.siteId === site.id);
    if (stop) {
      return (
        <div className={box}>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ok">
            <IconTrip width={18} height={18} />
            {site.name} ya está en tu viaje · {formatClock(stop.visitStart ?? stop.arrival)}
          </p>
          <Link href="/mi-viaje" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-2 hover:underline">
            Ver en Mi viaje
          </Link>
        </div>
      );
    }
    return (
      <div className={box}>
        <p className="text-sm text-ink-muted">Revisarás las horas antes de que cambie nada.</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => proposeSafely(() => proposeAdd(getAppState().trip, site.id))}
          className={primary}
        >
          <IconPlus width={18} height={18} />
          Añadir {site.name} a mi viaje
        </button>
      </div>
    );
  }

  const route = getRoute(action.routeId);
  if (!route) return null;
  const followsRoute =
    sourceRouteId === route.id &&
    stops.length === route.stopIds.length &&
    stops.every((s, i) => s.siteId === route.stopIds[i]);
  if (followsRoute) {
    return (
      <div className={box}>
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ok">
          <IconTrip width={18} height={18} className="shrink-0" />
          Tu viaje ya sigue la ruta «{route.name}»
        </p>
        <Link href="/mi-viaje" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-2 hover:underline">
          Ver en Mi viaje
        </Link>
      </div>
    );
  }
  return (
    <div className={box}>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
          <IconRoute width={18} height={18} className="shrink-0 text-accent" />
          Ruta «{route.name}»
        </p>
        <p className="text-xs text-ink-muted">
          {route.stopIds.length} paradas · unas {formatDuration(routeMinutes(route))} · {TRANSPORT_LABEL[route.transport]}
          {stops.length > 0 ? " · sustituye las paradas actuales" : ""}
        </p>
        {route.demo && <DemoBadge className="self-start" />}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => proposeSafely(() => proposeFromRoute(getAppState().trip, route))}
        className={primary}
      >
        <IconTrip width={18} height={18} />
        Proponer esta ruta en mi viaje
      </button>
    </div>
  );
}

export function AssistantMessage({
  answer,
  text,
  latest,
  sending,
  onPrompt,
}: {
  answer?: AssistantAnswer;
  text: string;
  latest: boolean;
  sending: boolean;
  onPrompt: (text: string) => void;
}) {
  const selectedSiteId = useAppState((s) => s.selectedSiteId);
  const sites = (answer?.placeIds ?? []).filter((id, i, all) => all.indexOf(id) === i).map(getSite).filter((s) => s !== undefined);

  return (
    <div className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-display text-xs text-on-primary"
      >
        RV
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="sr-only">El asistente dice:</p>
        {answer?.abstained ? (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-warn/50 bg-warn-soft p-4">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-warn">
              <IconInfo width={16} height={16} />
              No consta en las fuentes
            </p>
            <AnswerText text={text} selectedSiteId={selectedSiteId} />
          </div>
        ) : (
          <AnswerText text={text} selectedSiteId={selectedSiteId} />
        )}
        {answer?.generalKnowledge && !answer.abstained && (
          <p className="inline-flex items-start gap-1.5 rounded-lg border border-dashed border-warn/50 bg-warn-soft px-3 py-2 text-xs text-ink">
            <IconInfo width={16} height={16} className="mt-px shrink-0 text-warn" aria-hidden="true" />
            Incluye contexto general del modo abierto, no verificado en las fuentes de la ruta. Solo lo citado abajo
            procede de fichas aprobadas.
          </p>
        )}

        {sites.length > 0 && (
          <Carousel label="Lugares mencionados">
            {sites.map((site) => (
              <li key={site.id} className="shrink-0 snap-start">
                <SiteCard
                  site={site}
                  variant="compact"
                  selected={site.id === selectedSiteId}
                  onSelect={(id) => actions.selectSite(id)}
                />
              </li>
            ))}
          </Carousel>
        )}

        {answer && <Sources citations={answer.citations} />}
        {answer?.suggestedAction && <SuggestedAction action={answer.suggestedAction} />}


        {latest && answer && answer.suggestedPrompts.length > 0 && (
          <div>
            <h3 className="sr-only">Preguntas sugeridas</h3>
            <ul className="flex flex-wrap gap-2">
              {answer.suggestedPrompts.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => onPrompt(p)}
                    className="min-h-11 rounded-full border border-stone bg-surface px-4 text-left text-sm text-ink hover:border-ink/40 hover:bg-surface-muted disabled:opacity-60"
                  >
                    {p}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

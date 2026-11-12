"use client";
/**
 * "Avisos del asistente" in Mi viaje: rain, storms, heat, frost, gusts and traffic incidents for the
 * trip's places and days, each with its source and time. When a different order keeps the outdoor
 * places drier, the assistant offers it as a proposal to review (never applied by itself).
 */
import { formatShortDate } from "@/lib/hours";
import { useTripConditions } from "@/lib/useTripConditions";
import type { Advisory } from "@/domain/conditions";
import type { Trip } from "@/domain/types";
import { actions, useAppState } from "@/state/store";
import { IconInfo } from "@/components/shell/icons";

const KIND_LABEL: Record<Advisory["kind"], string> = {
  rain: "Lluvia",
  storm: "Tormenta",
  heat: "Calor",
  frost: "Helada",
  wind: "Viento",
  traffic: "Tráfico",
};

export function AdvisoryItem({ advisory, multiDay }: { advisory: Advisory; multiDay: boolean }) {
  const warning = advisory.severity === "warning";
  return (
    <li className={`flex flex-col gap-1 rounded-xl border p-3 ${warning ? "border-warn/40 bg-warn-soft" : "border-stone bg-surface"}`}>
      <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-muted">
        <span className={warning ? "text-warn" : ""}>{warning ? "Aviso" : "A tener en cuenta"}</span>
        <span aria-hidden="true">·</span>
        <span>{KIND_LABEL[advisory.kind]}</span>
        <span aria-hidden="true">·</span>
        <span>{multiDay ? `Día ${advisory.day + 1}, ` : ""}{formatShortDate(advisory.date)}</span>
      </p>
      <p className="font-semibold text-ink">{advisory.title}</p>
      <p className="text-sm text-ink">{advisory.detail}</p>
      <p className="text-xs text-ink-muted">{advisory.source}</p>
    </li>
  );
}

export function TripAdvisories({ trip }: { trip: Trip }) {
  const state = useTripConditions(trip);
  const pending = useAppState((s) => s.pendingProposal !== null);
  const multiDay = (trip.context.days ?? 1) > 1;

  let body: React.ReactNode;
  switch (state.status) {
    case "no-trip":
    case "past":
      return null;
    case "no-date":
      body = <p className="text-sm text-ink-muted">Pon una fecha a tu viaje y te avisaré si se espera lluvia, calor o incidencias de tráfico cerca de tus paradas.</p>;
      break;
    case "too-early":
      body = <p className="text-sm text-ink-muted">La previsión del tiempo llega una semana antes. Vuelve a mirar desde el {formatShortDate(state.from)}.</p>;
      break;
    case "loading":
      body = <p className="text-sm text-ink-muted">Consultando el tiempo y el tráfico…</p>;
      break;
    case "error":
      body = <p className="text-sm text-ink-muted">No he podido consultar el tiempo ni el tráfico. Lo intentaré de nuevo en unos minutos.</p>;
      break;
    case "ready": {
      const { data, advisories, proposal } = state;
      const gaps = [
        data.weatherStatus !== "ok" && "el tiempo",
        data.trafficStatus !== "ok" && "el tráfico",
      ].filter(Boolean);
      body = (
        <div className="flex flex-col gap-3">
          {advisories.length === 0 ? (
            <p className="text-sm text-ink">
              {gaps.length === 2
                ? "Ahora no puedo consultar el tiempo ni el tráfico."
                : gaps.length === 1
                  ? `Sin avisos de ${gaps[0] === "el tiempo" ? "tráfico" : "tiempo"} para tu viaje.`
                  : "Sin avisos para tu viaje: ni lluvia ni incidencias de tráfico previstas cerca de tus paradas."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {advisories.map((a) => (
                <AdvisoryItem key={a.id} advisory={a} multiDay={multiDay} />
              ))}
            </ul>
          )}
          {proposal && (
            <div className="flex flex-col gap-2 rounded-xl border border-stone bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink">Puedo reordenar tu viaje para que los lugares al aire libre queden en las horas más secas.</p>
              <button
                type="button"
                disabled={pending}
                onClick={() => actions.propose(proposal)}
                className="min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60"
              >
                Ver el cambio propuesto
              </button>
            </div>
          )}
          {gaps.length === 1 && advisories.length > 0 && <p className="text-xs text-ink-muted">Ahora no puedo consultar {gaps[0]}.</p>}
          <p className="flex items-start gap-1.5 text-xs text-ink-muted">
            <IconInfo width={14} height={14} className="mt-px shrink-0" />
            Previsiones, no certezas: revísalas antes de salir. Para el tráfico en tiempo real, usa tu app de mapas.
          </p>
        </div>
      );
      break;
    }
  }

  return (
    <section aria-labelledby="trip-advisories" className="flex flex-col gap-3">
      <h2 id="trip-advisories" className="font-display text-2xl text-ink">
        Avisos del asistente
      </h2>
      {body}
    </section>
  );
}

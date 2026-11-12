"use client";
/**
 * Route detail actions. "Adaptar esta ruta" asks the planner for a proposal and hands it to the
 * review dialog (ProposalReview); the trip only changes if the visitor accepts there.
 */
import Link from "next/link";
import { getRoute } from "@/data/content";
import { proposeFromRoute } from "@/domain/planner";
import { actions, getAppState, useAppState } from "@/state/store";
import { IconChat, IconHeadphones, IconRoute, IconTrip } from "@/components/shell/icons";
import { assistantHref } from "./AskComposer";

export function RouteActions({ routeId }: { routeId: string }) {
  const route = getRoute(routeId);
  const pending = useAppState((s) => s.pendingProposal !== null);
  const following = useAppState((s) => s.trip.sourceRouteId === routeId && s.trip.stops.length > 0);
  const hasStops = useAppState((s) => s.trip.stops.length > 0);

  if (!route) return null;

  function adapt() {
    if (!route) return;
    try {
      actions.propose(proposeFromRoute(getAppState().trip, route));
    } catch {
      actions.notify("No se pudo calcular la ruta para tu viaje. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={adapt}
          disabled={pending}
          aria-describedby={`route-adapt-help-${route.id}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 btn-primary rounded-full px-5 text-sm font-semibold disabled:cursor-not-allowed"
        >
          <IconTrip width={18} height={18} />
          Adaptar esta ruta
        </button>
        <Link
          href={assistantHref(`Cuéntame sobre la ruta «${route.name}»`)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-muted"
        >
          <IconChat width={18} height={18} />
          Preguntar sobre esta ruta
        </Link>
        <Link
          href={`/rutas/${route.slug}/recorrido`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-muted"
        >
          <IconHeadphones width={18} height={18} />
          Recorrido guiado
        </Link>
        {route.transport === "car" && (
          <Link
            href={`/rutas/${route.slug}/coche`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-muted"
          >
            <IconRoute width={18} height={18} />
            Modo coche
          </Link>
        )}
      </div>
      <p id={`route-adapt-help-${route.id}`} className="text-xs text-ink-muted">
        {pending
          ? "Hay un cambio pendiente de revisar. Acéptalo o descártalo antes de adaptar otra ruta."
          : following
            ? "Tu viaje ya sigue esta ruta. Puedes volver a adaptarla con tu fecha y horario actuales."
            : hasStops
              ? "Verás antes y después: la ruta sustituiría las paradas de tu viaje actual. Nada cambia hasta que aceptes."
              : "Calcularemos horarios con tu fecha y hora de inicio. Nada cambia hasta que aceptes."}
      </p>
    </div>
  );
}

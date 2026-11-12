"use client";
/**
 * The assistant's proximity alert: "Estás a 300 m de …", with what the place is and what to do
 * next. Polite live region, never steals focus; stays until closed or the visitor moves away.
 * Top of the screen: the bottom has the mobile navigation, the toasts and the assistant's composer.
 * On desktop, top right below the headers' controls.
 *
 * Asking about the place hands the assistant its name only: the position never leaves the device.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSite, piecesFromSite } from "@/data/content";
import { formatDistance } from "@/domain/geo";
import { KIND_LABEL } from "@/lib/labels";
import { markAskHandoff } from "@/components/chat/askHandoff";
import { assistantHref } from "@/components/explore/AskComposer";
import { NonVisigothicBadge } from "@/components/shared/DemoBadge";
import { IconClose } from "@/components/shell/icons";
import { actions, useAppState } from "@/state/store";
import { isTourScreen } from "./NearbyWatcher";

export function nearbyQuestion(placeName: string): string {
  return `Estoy cerca de ${placeName}. ¿Qué puedo ver allí?`;
}

export function NearbyAlertCard() {
  const pathname = usePathname();
  const router = useRouter();
  const alert = useAppState((s) => s.nearbyAlert);
  const site = alert ? getSite(alert.siteId) : undefined;
  const show = alert && site && !isTourScreen(pathname);

  const found = show ? piecesFromSite(site.id) : [];
  const museums = [...new Set(found.map((p) => p.museum.name))];

  function ask() {
    if (!site) return;
    const q = nearbyQuestion(site.name);
    markAskHandoff(q);
    actions.dismissNearbyAlert();
    router.push(assistantHref(q));
  }

  return (
    <div
      role="region"
      aria-label="Aviso de cercanía"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-40 flex justify-center px-3 md:inset-x-auto md:right-6 md:top-20 md:px-0"
    >
      <div aria-live="polite" aria-atomic="true" className="w-full max-w-md md:w-96">
        {show && (
          <article
            key={alert.id}
            className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-stone bg-surface p-4 shadow-lg motion-safe:animate-[rise_240ms_ease-out]"
          >
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-display text-xs text-on-primary">
                RV
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-ink-muted">
                  Tu asistente · {alert.distance < 40 ? "estás aquí" : `a ${formatDistance(alert.distance)}`}
                  {site.coordinates.approximate ? " · posición del lugar aproximada" : ""}
                </p>
                <h2 className="font-display text-lg leading-snug text-ink">Estás cerca de {site.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => actions.dismissNearbyAlert()}
                aria-label="Cerrar aviso de cercanía"
                className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
              >
                <IconClose width={18} height={18} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5 text-sm text-ink">
              <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                <span>
                  {site.category ?? KIND_LABEL[site.kind]} · {site.locality}
                </span>
                {!site.visigothic && <NonVisigothicBadge />}
              </p>
              {site.tagline && site.tagline !== site.name && <p>{site.tagline}</p>}
              {museums.length > 0 && (
                <p className="text-ink-muted">
                  Lo que se halló aquí se expone hoy en {museums.join(" y ")}.
                </p>
              )}
              {alert.others > 0 && (
                <p className="text-ink-muted">
                  {alert.others === 1 ? "Hay otro lugar de la ruta cerca." : `Hay ${alert.others} lugares más de la ruta cerca.`}{" "}
                  <Link href="/mapa" onClick={() => actions.dismissNearbyAlert()} className="font-semibold text-ink underline underline-offset-4">
                    Verlos en el mapa
                  </Link>
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={ask}
                className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover"
              >
                Cuéntame qué hay
              </button>
              <Link
                href={`/lugares/${site.slug}`}
                onClick={() => actions.dismissNearbyAlert()}
                className="inline-flex min-h-11 items-center rounded-full border border-stone bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
              >
                Ver la ficha
              </Link>
              <button
                type="button"
                onClick={() => actions.muteNearby(site.id, site.name)}
                className="min-h-11 rounded-full px-3 text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
              >
                No avisar de este lugar
              </button>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

"use client";
/**
 * The assistant tells the visitor, wherever they are in the app, about a new warning for their trip
 * (heavy rain, a storm, heat, a traffic incident). Each warning is shown once on this device; the
 * full list, and any proposed change, is in Mi viaje. Polite live region; never steals focus.
 * Hidden in Mi viaje (the list is there), on tour and car screens, and while a proximity alert shows.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTripConditions } from "@/lib/useTripConditions";
import { IconClose } from "@/components/shell/icons";
import { useAppState } from "@/state/store";
import { isTourScreen } from "@/components/nearby/NearbyWatcher";

const SEEN_KEY = "ruta-visigoda:avisos-vistos";

function readSeen(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(-100) : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-100)));
  } catch {
    // Without storage the warning may show again next time; nothing else depends on it.
  }
}

export function AdvisoryAlert() {
  const pathname = usePathname();
  const trip = useAppState((s) => s.trip);
  const nearby = useAppState((s) => s.nearbyAlert !== null);
  const state = useTripConditions(trip);
  const [seen, setSeen] = useState<string[] | null>(null);

  const hidden = pathname === "/mi-viaje" || isTourScreen(pathname) || nearby;
  const known = seen ?? (typeof window === "undefined" ? [] : readSeen());
  const next = state.status === "ready" ? state.advisories.find((a) => a.severity === "warning" && !known.includes(a.id)) : undefined;

  function dismiss() {
    if (!next) return;
    const ids = [...known, next.id];
    writeSeen(ids);
    setSeen(ids);
  }

  return (
    <div
      role="region"
      aria-label="Aviso del asistente sobre tu viaje"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-40 flex justify-center px-3 md:inset-x-auto md:right-6 md:top-20 md:px-0"
    >
      <div aria-live="polite" aria-atomic="true" className="w-full max-w-md md:w-96">
        {next && !hidden && (
          <article key={next.id} className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-warn/40 bg-surface p-4 shadow-lg motion-safe:animate-[rise_240ms_ease-out]">
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-display text-xs text-on-primary">
                RV
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-ink-muted">Tu asistente · aviso para tu viaje</p>
                <h2 className="font-display text-lg leading-snug text-ink">{next.title}</h2>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Cerrar aviso"
                className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
              >
                <IconClose width={18} height={18} />
              </button>
            </div>
            <p className="text-sm text-ink">{next.detail}</p>
            <p className="text-xs text-ink-muted">{next.source}</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/mi-viaje#trip-advisories"
                onClick={dismiss}
                className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover"
              >
                {state.status === "ready" && state.proposal ? "Ver el cambio que propongo" : "Ver en Mi viaje"}
              </Link>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

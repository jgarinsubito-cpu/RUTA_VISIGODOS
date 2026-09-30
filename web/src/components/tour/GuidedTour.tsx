"use client";
/**
 * Guided tour of a route (VoiceMap-style start screen + stop-by-stop view).
 * Live mode opens each stop when the visitor walks into its zone (domain/geo geofencing) and also
 * works by hand; virtual mode steps through from anywhere. Narration plays only when asked (no
 * automatic audio). Location and progress stay on this device.
 */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Site, SiteId, Story } from "@/domain/types";
import { getRoute, getSite, storiesForSite } from "@/data/content";
import { distanceMeters, formatDistance, MAX_ACCURACY_M, updateGeofence } from "@/domain/geo";
import { routeMinutes } from "@/domain/planner";
import { actions, useAppState } from "@/state/store";
import { directionsUrl } from "@/lib/directions";
import { formatDuration, KIND_LABEL, TRANSPORT_LABEL } from "@/lib/labels";
import { useGeolocation, type GeoStatus } from "@/lib/useGeolocation";
import { useSpeech } from "@/lib/useSpeech";
import { SiteImage } from "@/components/shared/SiteImage";
import { StoryEvidence } from "@/components/shared/Claim";
import { EvidenceLegend } from "@/components/shared/EvidenceBadge";
import { DemoBadge, NonVisigothicBadge } from "@/components/shared/DemoBadge";
import {
  IconBattery,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconDirections,
  IconHeadphones,
  IconInfo,
  IconLocate,
  IconPause,
  IconPin,
  IconPlay,
  IconResume,
  IconSpeaker,
} from "@/components/shell/icons";

type View = "start" | "tour";

const secondaryButton =
  "inline-flex min-h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-stone px-3.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted disabled:opacity-50";

/**
 * What is read and shown at a stop: its published story (with the claims it rests on) if it has
 * one, else the place summary, which is practical description rather than a validated claim.
 */
function narration(site: Site): { title: string; text: string; story?: Story } {
  const story = storiesForSite(site.id)[0];
  return story ? { title: story.title, text: story.body, story } : { title: "Sobre este lugar", text: site.summary };
}

function LocationLine({ status, fix, target }: { status: GeoStatus; fix: { lat: number; lng: number; accuracy: number } | null; target: Site }) {
  if (status === "locating") return <>Buscando tu ubicación…</>;
  if (status === "denied") return <>Sin permiso de ubicación. Puedes seguir el recorrido a mano.</>;
  if (status === "unavailable") return <>Ubicación no disponible en este dispositivo.</>;
  if (!fix) return null;
  if (fix.accuracy > MAX_ACCURACY_M) return <>Señal de ubicación imprecisa (± {formatDistance(fix.accuracy)}).</>;
  return (
    <>
      <span className="font-semibold text-ink">{formatDistance(distanceMeters(fix, target.coordinates))}</span> hasta{" "}
      {target.name}
    </>
  );
}

export function GuidedTour({ routeId }: { routeId: string }) {
  const route = getRoute(routeId);
  const stops = useMemo(
    () => (getRoute(routeId)?.stopIds ?? []).map((id) => getSite(id)).filter((s): s is Site => s !== undefined),
    [routeId],
  );
  const saved = useAppState((s) => (s.tour?.routeId === routeId ? s.tour : null));
  const [view, setView] = useState<View>("start");
  const [locating, setLocating] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const { fix, status } = useGeolocation(locating);
  const speech = useSpeech();
  const insideRef = useRef<SiteId | null>(null);

  const live = saved?.mode === "live";
  const index = Math.min(saved?.currentIndex ?? 0, Math.max(0, stops.length - 1));
  const stop = stops[index];
  const finished = saved !== null && saved.visitedSiteIds.length === stops.length && stops.length > 0;

  // Geofencing: entering a stop's zone opens that stop and records the arrival.
  useEffect(() => {
    if (!fix || view !== "tour" || !live) return;
    const update = updateGeofence(stops, fix, insideRef.current);
    insideRef.current = update.insideSiteId;
    if (update.entered) {
      actions.markTourArrival(update.entered, stops.findIndex((s) => s.id === update.entered));
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(160);
    }
  }, [fix, view, live, stops]);

  if (!route || stops.length === 0 || !stop) return null;
  const first = stops[0];

  function start(mode: "live" | "virtual", withLocation: boolean) {
    speech.stop();
    actions.startTour(routeId, mode, 0);
    insideRef.current = null;
    setLocating(withLocation);
    setView("tour");
  }

  function go(to: number) {
    speech.stop();
    actions.setTourStop(Math.min(Math.max(0, to), stops.length - 1));
  }

  if (view === "start") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-12 pt-4 md:px-8 md:pt-8">
        <Link
          href={`/rutas/${route.slug}`}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-full px-2 text-sm font-semibold text-ink-muted hover:text-ink"
        >
          <IconChevronLeft width={18} />
          {route.name}
        </Link>

        <figure>
          <SiteImage site={first} aspect="aspect-[4/3]" rounded="rounded-3xl" priority sizes="(min-width: 768px) 672px, 100vw" />
          <figcaption className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
            <IconPin width={14} />
            Punto de inicio: {first.name}
          </figcaption>
        </figure>

        <header className="flex flex-col gap-2">
          <p className="text-xs text-ink-muted">
            Recorrido guiado · {stops.length} paradas · {TRANSPORT_LABEL[route.transport]} · Aprox.{" "}
            {formatDuration(routeMinutes(route))}
          </p>
          <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">{route.name}</h1>
          {route.demo && <DemoBadge />}
        </header>

        <div aria-live="polite" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface-muted px-4 text-center text-sm text-ink-muted">
          <IconPin width={18} className="shrink-0 text-ink" />
          {locating ? (
            <span>
              <LocationLine status={status} fix={fix} target={first} />
            </span>
          ) : (
            <button type="button" onClick={() => setLocating(true)} className="min-h-11 font-semibold text-ink underline underline-offset-4">
              Ver la distancia hasta el inicio
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {saved && !finished ? (
            <>
              <button type="button" onClick={() => { setLocating(live); setView("tour"); }} className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-body font-semibold">
                <IconResume width={18} />
                Continuar · parada {index + 1} de {stops.length}
              </button>
              <button type="button" onClick={() => start("live", true)} className="min-h-11 text-sm font-semibold text-ink-muted underline-offset-4 hover:underline">
                Empezar de nuevo
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => start("live", true)} className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-body font-semibold">
                <IconPlay width={17} />
                Empezar recorrido
              </button>
              <p className="text-center text-xs text-ink-muted">Pediremos tu ubicación para detectar cuándo llegas a cada parada.</p>
            </>
          )}
          <button
            type="button"
            onClick={() => start("virtual", false)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-stone px-6 text-body font-semibold text-ink transition-colors hover:bg-surface-muted"
          >
            <IconHeadphones width={18} />
            {saved && !finished ? "Empezar de nuevo en virtual" : "Recorrido virtual, sin ubicación"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <a href={directionsUrl(first)} target="_blank" rel="noreferrer" className={secondaryButton}>
            <IconDirections width={18} />
            Cómo llegar
            <span className="sr-only"> al inicio (abre Google Maps en otra pestaña)</span>
          </a>
          <button type="button" onClick={() => setHowOpen((o) => !o)} aria-expanded={howOpen} className={secondaryButton}>
            <IconInfo width={18} />
            Cómo funciona
          </button>
        </div>
        {howOpen && (
          <ul className="flex list-disc flex-col gap-1.5 rounded-2xl border border-stone px-8 py-4 text-sm leading-relaxed text-ink-muted">
            <li>Cuando llegas a una parada, se abre sola y vibra el móvil. También puedes avanzar a mano.</li>
            <li>El recorrido virtual no usa tu ubicación: avanzas cuando quieras, desde cualquier lugar.</li>
            <li>Pulsa «Escuchar» para oír la historia de cada lugar; nunca suena sin que lo pidas.</li>
            <li>Tu ubicación solo se usa en este dispositivo: no se guarda ni se envía.</li>
            <li>Las ubicaciones de la demo son aproximadas: la llegada puede detectarse antes o después.</li>
          </ul>
        )}

        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-ink-muted">
          <li className="inline-flex items-center gap-1.5">
            <IconHeadphones width={15} />
            Lleva auriculares
          </li>
          <li className="inline-flex items-center gap-1.5">
            <IconBattery width={15} />
            Carga el móvil
          </li>
          <li className="inline-flex items-center gap-1.5">
            <IconLocate width={15} />
            Ubicación solo en este dispositivo
          </li>
        </ul>
      </div>
    );
  }

  const reached = saved?.visitedSiteIds.includes(stop.id) ?? false;
  const text = narration(stop);
  const last = index === stops.length - 1;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-12 pt-4 md:px-8 md:pt-8">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            speech.stop();
            setView("start");
          }}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink-muted hover:text-ink"
        >
          <IconChevronLeft width={18} />
          Recorrido
        </button>
        <p className="text-sm font-semibold text-ink">
          Parada {index + 1} de {stops.length}
        </p>
      </div>

      <ol aria-label="Progreso del recorrido" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))` }}>
        {stops.map((s, i) => {
          const done = saved?.visitedSiteIds.includes(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === index ? "step" : undefined}
                aria-label={`Parada ${i + 1}: ${s.name}${done ? " (visitada)" : ""}`}
                className="flex min-h-11 w-full items-center"
              >
                <span
                  className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
                    i === index ? "bg-ink" : done ? "bg-ink/45" : "bg-stone"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ol>

      <SiteImage key={stop.id} site={stop} aspect="aspect-[16/10]" rounded="rounded-3xl" priority sizes="(min-width: 768px) 672px, 100vw" />

      <header className="flex flex-col gap-1.5">
        <p className="text-xs text-ink-muted">
          {stop.locality} · {stop.category ?? KIND_LABEL[stop.kind]}
        </p>
        <h1 className="font-display text-3xl leading-tight text-ink">{stop.name}</h1>
        <p className="flex flex-wrap items-center gap-x-2">
          {stop.demo && <DemoBadge />}
          {!stop.visigothic && <NonVisigothicBadge />}
        </p>
      </header>

      <p aria-live="polite" className="flex min-h-12 items-center gap-2 rounded-2xl bg-surface-muted px-4 text-sm text-ink-muted">
        {reached ? (
          <>
            <IconCheck width={18} className="shrink-0 text-ok" />
            <span className="font-semibold text-ink">Has llegado a {stop.name}</span>
          </>
        ) : saved?.mode === "virtual" ? (
          <>
            <IconHeadphones width={18} className="shrink-0" />
            Recorrido virtual: avanza cuando quieras.
          </>
        ) : locating ? (
          <>
            <IconPin width={18} className="shrink-0" />
            <span>
              <LocationLine status={status} fix={fix} target={stop} />
            </span>
          </>
        ) : (
          <>
            <IconLocate width={18} className="shrink-0" />
            <button type="button" onClick={() => setLocating(true)} className="min-h-11 font-semibold text-ink underline underline-offset-4">
              Activar ubicación para detectar la llegada
            </button>
          </>
        )}
      </p>

      <section aria-labelledby="tour-story" className="flex flex-col gap-3 rounded-3xl border border-stone bg-surface p-5">
        <h2 id="tour-story" className="font-display text-xl text-ink">
          {text.title}
        </h2>
        <p className="text-body leading-relaxed text-ink">{text.text}</p>
        {text.story ? (
          <>
            <StoryEvidence story={text.story} className="border-t border-stone pt-3" />
            <EvidenceLegend />
          </>
        ) : (
          <p className="text-xs text-ink-muted">Descripción práctica del lugar; la historia con fuentes está en su ficha.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {speech.supported && (
            <button
              type="button"
              onClick={() => (speech.speaking ? speech.stop() : speech.speak(`${stop.name}. ${text.text}`))}
              aria-pressed={speech.speaking}
              className={secondaryButton}
            >
              {speech.speaking ? <IconPause width={18} /> : <IconSpeaker width={18} />}
              {speech.speaking ? "Detener" : "Escuchar"}
            </button>
          )}
          <a href={directionsUrl(stop)} target="_blank" rel="noreferrer" className={secondaryButton}>
            <IconDirections width={18} />
            Cómo llegar
            <span className="sr-only"> (abre Google Maps en otra pestaña)</span>
          </a>
          <Link href={`/lugares/${stop.slug}`} className={secondaryButton}>
            Ver ficha
          </Link>
        </div>
        {live && !reached && (
          <button
            type="button"
            onClick={() => actions.markTourArrival(stop.id, index)}
            className="self-start text-sm font-semibold text-ink-muted underline underline-offset-4 hover:text-ink"
          >
            Ya estoy aquí
          </button>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className={secondaryButton}>
          <IconChevronLeft width={18} />
          Anterior
        </button>
        {last ? (
          <button
            type="button"
            onClick={() => {
              speech.stop();
              actions.endTour();
              setLocating(false);
              setView("start");
            }}
            className="btn-primary inline-flex min-h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold"
          >
            Terminar recorrido
          </button>
        ) : (
          <button type="button" onClick={() => go(index + 1)} className="btn-primary inline-flex min-h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold">
            Siguiente parada
            <IconChevronRight width={18} />
          </button>
        )}
      </div>

    </div>
  );
}

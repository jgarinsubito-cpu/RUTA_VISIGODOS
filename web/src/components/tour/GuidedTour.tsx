"use client";
/**
 * Guided tour (VoiceMap-style start screen + stop-by-stop view) of a route or of the stops inside
 * one place (domain/tour). Live mode opens each stop when the visitor walks into its zone
 * (domain/geo geofencing) and also works by hand; indoor stops are always chosen by hand; virtual
 * mode steps through from anywhere. Audio plays only when asked: the recorded narration of the
 * stop when it has one, otherwise the browser reads the text. Location and progress stay on this
 * device.
 */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Story } from "@/domain/types";
import type { TourStop } from "@/domain/tour";
import { getRoute, getSite, storiesForSite, storiesForStop, stopsForSite, tourStopsForRoute, tourStopsForSite } from "@/data/content";
import { distanceMeters, formatDistance, MAX_ACCURACY_M, updateGeofence } from "@/domain/geo";
import { routeMinutes } from "@/domain/planner";
import { actions, useAppState } from "@/state/store";
import { directionsUrl } from "@/lib/directions";
import { formatDuration, KIND_LABEL, TRANSPORT_LABEL } from "@/lib/labels";
import { useGeolocation, type GeoStatus } from "@/lib/useGeolocation";
import { useSpeech } from "@/lib/useSpeech";
import { SiteImage } from "@/components/shared/SiteImage";
import { Gallery, Paragraphs } from "@/components/shared/Gallery";
import { AudioPlayer } from "./AudioPlayer";
import { OfflinePack, useOnline } from "./OfflinePack";
import { StopModels } from "./StopModels";
import { StopVideos360 } from "./StopVideos360";
import { PiecesSection } from "@/components/shared/PieceCard";
import { pieces } from "@/data/content";
import { IllustratedRouteMap } from "./IllustratedRouteMap";
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
 * What is read and shown at a stop: its published stories (with the claims they rest on); for a
 * place without stops, or a stop that is the only one of its place, the place's stories; else a
 * practical description, which is not a validated claim.
 */
function narration(t: TourStop): { title: string; text: string; stories: Story[] } {
  const own = t.stop ? storiesForStop(t.stop.id) : [];
  const stories = own.length > 0 ? own : !t.stop || stopsForSite(t.site.id).length === 1 ? storiesForSite(t.site.id) : [];
  if (stories.length > 0) {
    return { title: stories[0].title.replace(/ \(\d+\/\d+\)$/, ""), text: stories.map((s) => s.body).join("\n\n"), stories };
  }
  return { title: t.stop ? t.stop.name : "Sobre este lugar", text: t.stop?.tagline ?? t.site.summary, stories: [] };
}

/** The photo of a stop: the first of its gallery, else its place's. */
function stopPicture(t: TourStop) {
  return { name: t.name, imageTone: t.site.imageTone, imageCredit: t.site.imageCredit, image: t.stop?.gallery[0] ?? t.site.image };
}

export type TourSourceRef = { kind: "route"; id: string } | { kind: "site"; id: string };

function LocationLine({ status, fix, target }: { status: GeoStatus; fix: { lat: number; lng: number; accuracy: number } | null; target: TourStop }) {
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

export function GuidedTour({ source }: { source: TourSourceRef }) {
  const route = source.kind === "route" ? getRoute(source.id) : undefined;
  const place = source.kind === "site" ? getSite(source.id) : undefined;
  const tourId = source.id;
  const stops = useMemo(() => (route ? tourStopsForRoute(route) : place ? tourStopsForSite(place) : []), [route, place]);
  const saved = useAppState((s) => (s.tour?.tourId === tourId ? s.tour : null));
  const [view, setView] = useState<View>("start");
  const [locating, setLocating] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const { fix, status } = useGeolocation(locating);
  const online = useOnline();
  const speech = useSpeech();
  const insideRef = useRef<string | null>(null);

  const live = saved?.mode === "live";
  const index = Math.min(saved?.currentIndex ?? 0, Math.max(0, stops.length - 1));
  const stop = stops[index];
  const finished = saved !== null && saved.visitedStopIds.length === stops.length && stops.length > 0;

  // Geofencing: entering a stop's zone opens that stop and records the arrival.
  useEffect(() => {
    if (!fix || view !== "tour" || !live) return;
    const update = updateGeofence(stops, fix, insideRef.current);
    insideRef.current = update.insideId;
    if (update.entered) {
      actions.markTourArrival(update.entered, stops.findIndex((s) => s.id === update.entered));
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(160);
    }
  }, [fix, view, live, stops]);

  if ((!route && !place) || stops.length === 0 || !stop) return null;
  const first = stops[0];
  const title = route ? route.name : `Visita guiada · ${place!.name}`;
  const backHref = route ? `/rutas/${route.slug}` : `/lugares/${place!.slug}`;
  const backLabel = route ? route.name : place!.name;
  const tourHref = route ? `/rutas/${route.slug}/recorrido` : `/lugares/${place!.slug}/visita`;
  // Pages the tour links to, saved with it: the route or place page and each place's page.
  const tourPages = [backHref, ...new Set(stops.map((t) => `/lugares/${t.site.slug}`))];
  const illustrated = route?.illustratedMap;
  const stopNumbers = new Map(stops.map((t, i) => [t.id, i + 1]));
  const stopNames = new Map(stops.map((t) => [t.id, t.name]));
  const isDemo = route ? route.demo : place!.demo;
  // Every stop indoors (a museum): location cannot detect arrivals, so it is not asked for.
  const allManual = stops.every((t) => t.manualOnly);
  const audioMinutes = Math.round(stops.reduce((sum, t) => sum + (t.stop?.audio?.durationSeconds ?? 0), 0) / 60);
  const meta = route
    ? `${TRANSPORT_LABEL[route.transport]} · Aprox. ${formatDuration(routeMinutes(route))}`
    : `A pie · Aprox. ${formatDuration(Math.max(place!.visitMinutes, audioMinutes))}`;

  function start(mode: "live" | "virtual", withLocation: boolean) {
    speech.stop();
    actions.startTour(tourId, mode, 0);
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
          href={backHref}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-full px-2 text-sm font-semibold text-ink-muted hover:text-ink"
        >
          <IconChevronLeft width={18} />
          {backLabel}
        </Link>

        <figure>
          <SiteImage site={stopPicture(first)} aspect="aspect-[4/3]" rounded="rounded-3xl" priority sizes="(min-width: 768px) 672px, 100vw" />
          <figcaption className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
            <IconPin width={14} />
            Punto de inicio: {first.name}
          </figcaption>
        </figure>

        <header className="flex flex-col gap-2">
          <p className="text-xs text-ink-muted">
            Recorrido guiado · {stops.length} paradas · {meta}
            {audioMinutes > 0 && ` · ${audioMinutes} min de audio`}
          </p>
          <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">{title}</h1>
          {isDemo && <DemoBadge />}
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
              <button type="button" onClick={() => start("live", !allManual)} className="min-h-11 text-sm font-semibold text-ink-muted underline-offset-4 hover:underline">
                Empezar de nuevo
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => start("live", !allManual)} className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-body font-semibold">
                <IconPlay width={17} />
                {allManual ? "Empezar la visita" : "Empezar recorrido"}
              </button>
              <p className="text-center text-xs text-ink-muted">
                {allManual
                  ? "Es una visita en interior: avanzas a mano de una parada a la siguiente."
                  : "Pediremos tu ubicación para detectar cuándo llegas a cada parada."}
              </p>
            </>
          )}
          {!allManual && (
            <button
              type="button"
              onClick={() => start("virtual", false)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-stone px-6 text-body font-semibold text-ink transition-colors hover:bg-surface-muted"
            >
              <IconHeadphones width={18} />
              {saved && !finished ? "Empezar de nuevo en virtual" : "Recorrido virtual, sin ubicación"}
            </button>
          )}
        </div>

        {illustrated && <IllustratedRouteMap map={illustrated} stopNumbers={stopNumbers} stopNames={stopNames} />}

        <ol className="flex flex-col divide-y divide-stone rounded-2xl border border-stone bg-surface">
          {stops.map((t, i) => (
            <li key={t.id} className="flex items-baseline gap-3 px-4 py-3">
              <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-ink-muted">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{t.name}</span>
                {route && t.stop && t.site.name !== t.name && <span className="block text-xs text-ink-muted">{t.site.name}</span>}
              </span>
              {t.stop?.audio && (
                <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                  <span className="sr-only">Audio de </span>
                  {Math.max(1, Math.round(t.stop.audio.durationSeconds / 60))} min
                </span>
              )}
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-2 gap-2">
          <a href={directionsUrl({ ...first.site, name: first.name, coordinates: first.coordinates })} target="_blank" rel="noreferrer" className={secondaryButton}>
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
            <li>Pulsa «Escuchar» para oír cada parada; nunca suena sin que lo pidas. Cada audio tiene su transcripción.</li>
            <li>En los interiores el GPS no es fiable: allí avanzas a mano.</li>
            <li>Tu ubicación solo se usa en este dispositivo: no se guarda ni se envía.</li>
            <li>Algunas ubicaciones son aproximadas: la llegada puede detectarse antes o después.</li>
          </ul>
        )}

        <OfflinePack tourId={tourId} title={title} href={tourHref} pages={tourPages} stops={stops} extra={illustrated ? [illustrated.src] : []} />

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

  const reached = saved?.visitedStopIds.includes(stop.id) ?? false;
  const text = narration(stop);
  const audio = stop.stop?.audio;
  const moreImages = stop.stop?.gallery.slice(1) ?? [];
  const picture = stopPicture(stop).image;
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
          const done = saved?.visitedStopIds.includes(s.id);
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

      <figure className="flex flex-col gap-1.5">
        <SiteImage key={stop.id} site={stopPicture(stop)} aspect="aspect-[16/10]" rounded="rounded-3xl" priority sizes="(min-width: 768px) 672px, 100vw" />
        {picture && (
          <figcaption className="text-2xs text-ink-muted">
            {picture.caption && <span className="text-ink">{picture.caption} </span>}
            {picture.author} · {picture.license}
          </figcaption>
        )}
      </figure>

      <header className="flex flex-col gap-1.5">
        <p className="text-xs text-ink-muted">
          {stop.site.locality} · {stop.stop ? stop.site.name : (stop.site.category ?? KIND_LABEL[stop.site.kind])}
        </p>
        <h1 className="font-display text-3xl leading-tight text-ink">{stop.name}</h1>
        <p className="flex flex-wrap items-center gap-x-2">
          {stop.site.demo && <DemoBadge />}
          {!stop.site.visigothic && <NonVisigothicBadge />}
        </p>
      </header>

      {!online && (
        <p role="status" className="rounded-2xl border border-stone px-4 py-2.5 text-sm text-ink-muted">
          Sin conexión: el recorrido sigue funcionando con lo descargado. El asistente y el mapa vuelven con la conexión.
        </p>
      )}

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
        ) : stop.manualOnly ? (
          <>
            <IconInfo width={18} className="shrink-0" />
            Parada en interior: avanza a mano cuando estés en ella.
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
        {audio && <AudioPlayer audio={audio} title={stop.name} />}
        <Paragraphs text={text.text} className="text-body leading-relaxed text-ink" />
        {text.stories.length > 0 ? (
          <>
            <details className="border-t border-stone pt-2">
              <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-ink underline-offset-4 hover:underline">
                En qué se basa este texto
              </summary>
              <div className="mt-2 flex flex-col gap-3">
                {text.stories.map((story) => (
                  <StoryEvidence key={story.id} story={story} />
                ))}
                <EvidenceLegend />
              </div>
            </details>
          </>
        ) : (
          <p className="text-xs text-ink-muted">Descripción práctica; la historia con fuentes está en la ficha del lugar.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {!audio && speech.supported && (
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
          <a href={directionsUrl({ ...stop.site, name: stop.name, coordinates: stop.coordinates })} target="_blank" rel="noreferrer" className={secondaryButton}>
            <IconDirections width={18} />
            Cómo llegar
            <span className="sr-only"> (abre Google Maps en otra pestaña)</span>
          </a>
          <Link href={`/lugares/${stop.site.slug}`} className={secondaryButton}>
            Ver ficha
          </Link>
        </div>
        {(live || stop.manualOnly) && saved?.mode !== "virtual" && !reached && (
          <button
            type="button"
            onClick={() => actions.markTourArrival(stop.id, index)}
            className="self-start text-sm font-semibold text-ink-muted underline underline-offset-4 hover:text-ink"
          >
            Ya estoy aquí
          </button>
        )}
      </section>

      {stop.stop?.models && <StopModels models={stop.stop.models} />}
      {stop.stop?.videos360 && <StopVideos360 videos={stop.stop.videos360} />}
      {stop.stop && (
        <PiecesSection
          headingId={`pieces-${stop.stop.id}`}
          title="Lo que se halló aquí"
          items={pieces().filter((p) => p.originStopId === stop.stop!.id)}
          from="stop"
          level={3}
        />
      )}

      {moreImages.length > 0 && <Gallery images={moreImages} label={`Imágenes de ${stop.name}`} />}

      {illustrated && (
        <details className="rounded-2xl border border-stone bg-surface p-3">
          <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-ink">Ver en el mapa del recorrido</summary>
          <div className="mt-2">
            <IllustratedRouteMap
              map={illustrated}
              stopNumbers={stopNumbers}
              stopNames={stopNames}
              current={stop.id}
              onPin={(id) => go(stops.findIndex((t) => t.id === id))}
            />
          </div>
        </details>
      )}

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

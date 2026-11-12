"use client";
/**
 * Modo coche: a route heard as one programme while driving between places (domain/drive.ts).
 * Big controls for whoever rides beside the driver, the car's own controls through the Media
 * Session API (steering wheel, CarPlay / Android Auto "Now playing" when the phone plays through
 * them), the screen kept on while the position is used, and directions handed to the maps app.
 *
 * Nothing plays until the visitor presses «Empezar». After that, stretches follow each other on
 * their own and a stop's narration plays on arrival, never cutting the audio that is playing.
 */
import Link from "next/link";
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from "react";
import { getRoute, tourStopsForRoute } from "@/data/content";
import { afterEnded, arrivedAt, driveItems, driveRadius, narrationFor, programmeMinutes } from "@/domain/drive";
import { distanceMeters, formatDistance, type GeoFix } from "@/domain/geo";
import { directionsUrl } from "@/lib/directions";
import { useGeolocation } from "@/lib/useGeolocation";
import { IconCheck, IconChevronLeft, IconChevronRight, IconDirections, IconPause, IconPlay } from "@/components/shell/icons";
import { OfflinePack } from "@/components/tour/OfflinePack";

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** What the car's screen and the lock screen show as playing. */
function setNowPlaying(meta: MediaMetadataInit) {
  navigator.mediaSession.metadata = new MediaMetadata(meta);
}

/** Keeps the screen on while `on` (the browser stops the position when the screen locks). */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((l) => {
          if (cancelled) void l.release();
          else lock = l;
        })
        .catch(() => {
          // Battery saver or no permission: the visitor keeps the screen on by hand.
        });
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", request);
      void lock?.release();
    };
  }, [on]);
}

export function DriveMode({ routeId }: { routeId: string }) {
  const route = getRoute(routeId);
  const stops = useMemo(() => (route ? tourStopsForRoute(route) : []), [route]);
  const items = driveItems(stops, route?.legs ?? []);
  const audioRef = useRef<HTMLAudioElement>(null);
  const id = useId();

  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [queued, setQueued] = useState<number | null>(null);
  const [heard, setHeard] = useState<Set<string>>(() => new Set());
  const [reached, setReached] = useState<Set<number>>(() => new Set());
  const [positionOn, setPositionOn] = useState(false);
  const [failed, setFailed] = useState(false);
  /** Play as soon as the new item's file is set (the effect below). */
  const wantPlay = useRef(false);


  const item = items[current];
  const nextStopIndex = item ? (item.kind === "leg" || !reached.has(item.stopIndex) ? item.stopIndex : item.stopIndex + 1) : 0;
  const nextStop = stops[nextStopIndex];

  async function play() {
    const el = audioRef.current;
    if (!el) return;
    try {
      setFailed(false);
      await el.play();
    } catch {
      setFailed(true);
    }
  }

  function goTo(index: number, autoplay: boolean) {
    if (index < 0 || index >= items.length) return;
    wantPlay.current = autoplay;
    setTime(0);
    if (index === current) {
      const el = audioRef.current;
      if (el) el.currentTime = 0;
      if (autoplay) void play();
      return;
    }
    setCurrent(index);
  }

  // A new item: its file is set by the render; start it if that was asked for.
  useEffect(() => {
    if (wantPlay.current) {
      wantPlay.current = false;
      void play();
    }
  }, [current]);

  function start() {
    setStarted(true);
    wantPlay.current = false;
    // With the position on, a stop's narration («mira…») waits until the car is there.
    const stopNow = item && stops[item.stopIndex];
    const there = fix && stopNow ? distanceMeters(fix, stopNow.coordinates) <= driveRadius(stopNow) : false;
    if (positionOn && item?.kind === "stop" && !there) return;
    if (there && item) setReached((r) => new Set(r).add(item.stopIndex));
    void play();
  }

  function onEnded() {
    if (!item) return;
    setHeard((h) => new Set(h).add(item.id));
    if (queued !== null) {
      setQueued(null);
      goTo(queued, true);
      return;
    }
    const { next, autoplay } = afterEnded(items, current);
    if (next !== null) goTo(next, autoplay);
  }

  // Arrival: the stop's narration plays now, or right after the audio that is playing.
  function onFix(f: GeoFix) {
    if (!started) return;
    const from = reached.size ? Math.max(...reached) + 1 : 0;
    const at = arrivedAt(stops, f, from, reached);
    if (at === null) return;
    setReached((r) => new Set(r).add(at));
    const narration = narrationFor(items, at);
    if (narration === null || heard.has(items[narration].id)) return;
    if (playing && narration !== current) setQueued(narration);
    else goTo(narration, true);
  }

  const { fix, status } = useGeolocation(positionOn, (f) => onFix(f));
  useWakeLock(started && positionOn);
  const nextDistance = fix && nextStop ? distanceMeters(fix, nextStop.coordinates) : null;

  // The car's controls (steering wheel, Now Playing on CarPlay / Android Auto) and lock screen.
  const onAction = useEffectEvent((action: MediaSessionAction) => {
    if (action === "play") void play();
    else if (action === "pause") audioRef.current?.pause();
    else if (action === "nexttrack") goTo(current + 1, true);
    else if (action === "previoustrack") goTo(current - 1, true);
  });
  useEffect(() => {
    if (!("mediaSession" in navigator) || !route || !item) return;
    const site = stops[item.stopIndex]?.site;
    setNowPlaying({
      title: item.title,
      artist: route.name,
      album: "Ruta Visigoda · Modo coche",
      artwork: site?.image ? [{ src: site.image.src, sizes: "512x512" }] : [],
    });
    const actions: MediaSessionAction[] = ["play", "pause", "nexttrack", "previoustrack"];
    for (const a of actions) {
      try {
        navigator.mediaSession.setActionHandler(a, () => onAction(a));
      } catch {
        // Unsupported action on this browser.
      }
    }
    return () => {
      for (const a of actions) {
        try {
          navigator.mediaSession.setActionHandler(a, null);
        } catch {
          // Ignore.
        }
      }
    };
  }, [route, item, stops]);

  if (!route) return null;
  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-10">
        <h1 className="font-display text-3xl text-ink">Modo coche</h1>
        <p className="text-ink-muted">Esta ruta todavía no tiene audios.</p>
        <Link href={`/rutas/${route.slug}`} className="font-semibold text-ink underline underline-offset-4">
          Volver a la ruta
        </Link>
      </div>
    );
  }

  const legCount = items.filter((it) => it.kind === "leg").length;
  const duration = item?.audio.durationSeconds ?? 0;
  const statusLine = failed
    ? "No se pudo reproducir el audio. Comprueba la conexión o descarga la ruta."
    : !started
      ? null
      : playing
        ? queued !== null
          ? `Has llegado a ${stops[items[queued].stopIndex]?.name}: su relato sonará al terminar este audio.`
          : null
        : item?.kind === "stop" && !heard.has(item.id)
          ? positionOn
            ? `El relato de ${item.title} sonará al llegar. También puedes pulsar «Reproducir».`
            : `Pulsa «Reproducir» cuando llegues a ${item.title}.`
          : "En pausa.";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-10 pt-4 md:pt-8">
      <Link
        href={`/rutas/${route.slug}`}
        className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-full px-2 text-sm font-semibold text-ink-muted hover:text-ink"
      >
        <IconChevronLeft width={18} height={18} />
        Salir del modo coche
      </Link>

      <header className="flex flex-col gap-2">
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-accent">Modo coche</p>
        <h1 className="font-display text-3xl leading-tight text-ink">{route.name}</h1>
        <p role="note" className="rounded-xl border border-warn/40 bg-warn-soft px-3 py-2 text-sm text-ink">
          Si conduces, no mires la pantalla: maneja los audios con los mandos del coche o deja que lo haga quien te acompaña.
        </p>
      </header>

      {!started && (
        <section aria-labelledby={`${id}-start`} className="flex flex-col gap-4 rounded-2xl border border-stone bg-surface p-4">
          <h2 id={`${id}-start`} className="font-display text-xl text-ink">
            {items.length} audios · {programmeMinutes(items)} min
          </h2>
          <p className="text-sm text-ink-muted">
            {legCount > 0
              ? `${legCount} ${legCount === 1 ? "tramo se escucha" : "tramos se escuchan"} de camino; el relato de cada parada, al llegar.`
              : "El relato de cada parada suena al llegar. Los tramos para escuchar de camino se añadirán próximamente."}
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={positionOn}
            onClick={() => setPositionOn((v) => !v)}
            className="inline-flex min-h-11 items-center gap-3 text-left text-sm font-semibold text-ink"
          >
            <span
              aria-hidden="true"
              className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors motion-reduce:transition-none ${positionOn ? "border-primary bg-primary" : "border-stone bg-surface"}`}
            >
              <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-[left] motion-reduce:transition-none ${positionOn ? "left-[1.125rem] bg-on-primary" : "left-0.5 bg-ink-muted"}`} />
            </span>
            Usar mi posición para que cada parada suene al llegar
          </button>
          <p className="text-xs text-ink-muted">
            Tu posición se usa solo en este dispositivo. La pantalla se mantiene encendida mientras la usas: lleva el móvil en un soporte y con
            carga.
          </p>
          <button type="button" onClick={start} className="min-h-16 rounded-full bg-primary px-6 text-lg font-semibold text-on-primary hover:bg-primary-hover">
            Empezar
          </button>
        </section>
      )}

      {item && (
        <section aria-labelledby={`${id}-now`} className="flex flex-col gap-4 rounded-2xl border border-stone bg-surface p-5">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-accent">
              {item.kind === "leg" ? `Tramo · hacia la parada ${item.stopIndex + 1} de ${stops.length}` : `Parada ${item.stopIndex + 1} de ${stops.length}`}
            </p>
            <h2 id={`${id}-now`} className="font-display text-2xl leading-snug text-ink">
              {item.title}
            </h2>
          </div>

          <audio
            ref={audioRef}
            src={item.audio.src}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => onEnded()}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onError={() => setFailed(true)}
          />
          <div className="flex flex-col gap-1">
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              <div className="h-full bg-primary" style={{ width: `${duration ? Math.min(100, (time / duration) * 100) : 0}%` }} />
            </div>
            <p className="flex justify-between text-xs tabular-nums text-ink-muted">
              <span>{clock(time)}</span>
              <span>{clock(duration)}</span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => goTo(current - 1, started)}
              disabled={current === 0}
              aria-label="Audio anterior"
              className="grid h-16 w-16 place-items-center rounded-full border border-stone text-ink hover:bg-surface-muted disabled:opacity-40"
            >
              <IconChevronLeft width={28} height={28} />
            </button>
            <button
              type="button"
              onClick={() => (!started ? start() : playing ? audioRef.current?.pause() : void play())}
              aria-label={playing ? "Pausar" : "Reproducir"}
              className="grid h-20 w-20 place-items-center rounded-full bg-primary text-on-primary hover:bg-primary-hover"
            >
              {playing ? <IconPause width={34} height={34} /> : <IconPlay width={34} height={34} />}
            </button>
            <button
              type="button"
              onClick={() => goTo(current + 1, started)}
              disabled={current >= items.length - 1}
              aria-label="Audio siguiente"
              className="grid h-16 w-16 place-items-center rounded-full border border-stone text-ink hover:bg-surface-muted disabled:opacity-40"
            >
              <IconChevronRight width={28} height={28} />
            </button>
          </div>

          <p role="status" aria-live="polite" className="min-h-5 text-center text-sm text-ink">
            {statusLine}
          </p>

          {nextStop && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone pt-3 text-sm">
              <p className="text-ink">
                <span className="text-ink-muted">Próxima parada: </span>
                <strong>{nextStop.name}</strong>
                {nextDistance !== null && ` · a ${formatDistance(nextDistance)}`}
                {positionOn && status === "denied" && <span className="block text-xs text-ink-muted">Sin permiso de ubicación: avanza con «Siguiente».</span>}
              </p>
              <a
                href={directionsUrl({ ...nextStop.site, coordinates: nextStop.coordinates })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone px-4 font-semibold text-ink hover:bg-surface-muted"
              >
                <IconDirections width={18} height={18} />
                Cómo llegar
                <span className="sr-only"> (abre la app de mapas)</span>
              </a>
            </div>
          )}

          <details className="rounded-xl border border-stone">
            <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-ink">Texto del audio</summary>
            <p className="whitespace-pre-line px-3 pb-3 text-sm leading-relaxed text-ink-muted">{item.audio.transcript}</p>
          </details>
        </section>
      )}

      <section aria-labelledby={`${id}-list`} className="flex flex-col gap-2">
        <h2 id={`${id}-list`} className="font-display text-xl text-ink">
          El programa
        </h2>
        <ol className="flex flex-col gap-1">
          {items.map((it, i) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => goTo(i, started)}
                aria-current={i === current ? "true" : undefined}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${i === current ? "bg-surface-muted font-semibold text-ink" : "text-ink hover:bg-surface-muted"}`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center text-ink-muted" aria-hidden="true">
                  {heard.has(it.id) ? <IconCheck width={16} height={16} /> : it.kind === "leg" ? "·" : it.stopIndex + 1}
                </span>
                <span className="flex-1">
                  {it.title}
                  <span className="sr-only">{heard.has(it.id) ? " (escuchado)" : ""}</span>
                </span>
                <span className="text-xs tabular-nums text-ink-muted">{clock(it.audio.durationSeconds)}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <OfflinePack
        tourId={`drive:${route.id}`}
        title={`${route.name} · modo coche`}
        href={`/rutas/${route.slug}/coche`}
        pages={[`/rutas/${route.slug}`]}
        stops={stops}
        extra={(route.legs ?? []).map((l) => l.audio.src)}
      />
    </div>
  );
}

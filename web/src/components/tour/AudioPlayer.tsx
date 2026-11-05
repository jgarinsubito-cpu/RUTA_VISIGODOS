"use client";
/**
 * Recorded narration of a stop: play/pause, a seek bar, back 10 s, elapsed/total time and the full
 * transcript on demand. Never plays on its own (PLAN.md: no automatic audio); only one player plays
 * at a time. The file loads only when asked (preload="none"), which matters on rural connections.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { StopAudio } from "@/domain/types";
import { IconPause, IconPlay } from "@/components/shell/icons";

const PLAYING_EVENT = "ruta:audio-play";

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function AudioPlayer({ audio, title }: { audio: StopAudio; title: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const id = useId();
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(audio.durationSeconds);
  const [failed, setFailed] = useState(false);

  // Another player starting pauses this one; leaving the stop stops it.
  useEffect(() => {
    const el = ref.current;
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) el?.pause();
    };
    window.addEventListener(PLAYING_EVENT, onOther);
    return () => {
      window.removeEventListener(PLAYING_EVENT, onOther);
      el?.pause();
    };
  }, [id]);

  async function toggle() {
    const el = ref.current;
    if (!el) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    window.dispatchEvent(new CustomEvent(PLAYING_EVENT, { detail: id }));
    try {
      setFailed(false);
      await el.play();
    } catch {
      setFailed(true);
    }
  }

  function seek(to: number) {
    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(0, to), duration || to);
    setTime(el.currentTime);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface-muted p-3">
      <audio
        ref={ref}
        src={audio.src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onError={() => {
          setPlaying(false);
          setFailed(true);
        }}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={`${playing ? "Pausar" : "Escuchar"}: ${audio.label}, ${title}`}
          className="btn-primary grid h-12 w-12 shrink-0 place-items-center rounded-full"
        >
          {playing ? <IconPause width={20} /> : <IconPlay width={20} />}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex items-baseline justify-between gap-2 text-xs text-ink-muted">
            <span className="truncate font-semibold text-ink">{audio.label}</span>
            <span className="shrink-0 tabular-nums" aria-hidden="true">
              {clock(time)} / {clock(duration)}
            </span>
          </p>
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.round(duration))}
            step={1}
            value={Math.round(time)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label={`Posición en ${audio.label}`}
            aria-valuetext={`${clock(time)} de ${clock(duration)}`}
            className="h-11 w-full cursor-pointer accent-primary"
          />
        </div>
        <button
          type="button"
          onClick={() => seek(time - 10)}
          className="min-h-11 shrink-0 rounded-full px-2 text-xs font-semibold text-ink-muted hover:text-ink"
          aria-label="Retroceder 10 segundos"
        >
          −10 s
        </button>
      </div>
      {failed && (
        <p role="status" className="text-xs text-ink-muted">
          No se pudo reproducir el audio. Comprueba la conexión, o lee la transcripción.
        </p>
      )}
      <details className="group">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-ink underline-offset-4 hover:underline">
          Transcripción
        </summary>
        <div className="mt-1 flex flex-col gap-2 text-sm leading-relaxed text-ink">
          {audio.transcript.split(/\n+/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {audio.credit && <p className="text-xs text-ink-muted">{audio.credit}</p>}
        </div>
      </details>
    </div>
  );
}

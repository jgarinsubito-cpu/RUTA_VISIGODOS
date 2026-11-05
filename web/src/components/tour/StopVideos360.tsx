"use client";
/**
 * The 360° videos of a stop. Each one is a card with its name, length, description and credit;
 * the viewer (three.js) and the video load only when the visitor opens it. Inside, the visitor
 * looks around by dragging, with the arrow keys, or by moving the phone (opt-in: iPhone asks for
 * permission). Phones and "save data" connections get the light version.
 *
 * The videos are streamed: they are not part of an offline download (docs/VIDEO360.md).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { StopVideo360 } from "@/domain/types";
import { IconPause, IconPlay, IconSpeaker } from "@/components/shell/icons";

function formatLength(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min${s ? ` ${s} s` : ""}` : `${s} s`;
}

/** The light version on phones and when the browser asks to save data. */
function pickSource(video: StopVideo360): string {
  if (!video.srcMobile || typeof window === "undefined") return video.src;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData || window.matchMedia("(max-width: 900px)").matches ? video.srcMobile : video.src;
}

type OrientationEventCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

const noSubscribe = () => () => {};
/** A phone or tablet that reports its orientation. */
const hasGyro = () => "DeviceOrientationEvent" in window && window.matchMedia("(pointer: coarse)").matches;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** The viewer itself: a sphere textured with the video, seen from inside. */
function Viewer({ video, onClose }: { video: StopVideo360; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLVideoElement>(null);
  const look = useRef({ lon: video.startYaw ?? 0, lat: 0, fov: 75 });
  const gyro = useRef<{ alpha0: number; lon0: number } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [gyroOn, setGyroOn] = useState(false);
  const gyroAvailable = useSyncExternalStore(noSubscribe, hasGyro, () => false);
  const canFullscreen = useSyncExternalStore(noSubscribe, () => Boolean(document.fullscreenEnabled), () => false);

  useEffect(() => {
    const el = box.current;
    const vid = media.current;
    if (!el || !vid) return;
    let disposed = false;
    let frame = 0;
    let cleanup = () => {};

    void import("three")
      .then((THREE) => {
        if (disposed) return;
        const renderer = new THREE.WebGLRenderer({ antialias: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        el.prepend(renderer.domElement);
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.domElement.className = "block h-full w-full touch-none";

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(look.current.fov, 1, 1, 1100);
        const geometry = new THREE.SphereGeometry(500, 64, 40);
        geometry.scale(-1, 1, 1); // seen from inside
        const texture = new THREE.VideoTexture(vid);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({ map: texture });
        scene.add(new THREE.Mesh(geometry, material));
        const target = new THREE.Vector3();

        const resize = () => {
          const { clientWidth: w, clientHeight: h } = el;
          renderer.setSize(w, h, false);
          camera.aspect = w / Math.max(1, h);
          camera.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(el);
        resize();

        const render = () => {
          frame = requestAnimationFrame(render);
          const { lon, lat, fov } = look.current;
          if (camera.fov !== fov) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
          }
          // lon 0 = centre of the video, positive to the right; lat positive = up.
          const phi = THREE.MathUtils.degToRad(lat);
          const theta = THREE.MathUtils.degToRad(lon);
          target.set(-Math.cos(phi) * Math.cos(theta), Math.sin(phi), -Math.cos(phi) * Math.sin(theta));
          camera.lookAt(target);
          renderer.render(scene, camera);
        };
        render();
        setStatus("ready");

        cleanup = () => {
          cancelAnimationFrame(frame);
          observer.disconnect();
          texture.dispose();
          material.dispose();
          geometry.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
      })
      .catch(() => !disposed && setStatus("failed"));

    return () => {
      disposed = true;
      cleanup();
      vid.pause();
      vid.removeAttribute("src");
      vid.load();
    };
  }, []);

  // Drag to look around (mouse, finger or pen).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let drag: { x: number; y: number; lon: number; lat: number } | null = null;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      drag = { x: e.clientX, y: e.clientY, lon: look.current.lon, lat: look.current.lat };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const k = look.current.fov / el.clientHeight;
      look.current.lon = drag.lon - (e.clientX - drag.x) * k;
      look.current.lat = clamp(drag.lat + (e.clientY - drag.y) * k, -85, 85);
      if (gyro.current) gyro.current.lon0 = look.current.lon;
    };
    const up = () => (drag = null);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      look.current.fov = clamp(look.current.fov + e.deltaY * 0.05, 40, 95);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, []);

  // Moving the phone: turning it turns the view; tilting it looks up and down.
  useEffect(() => {
    if (!gyroOn) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null) return;
      gyro.current ??= { alpha0: e.alpha, lon0: look.current.lon };
      let turn = gyro.current.alpha0 - e.alpha;
      if (turn > 180) turn -= 360;
      if (turn < -180) turn += 360;
      look.current.lon = gyro.current.lon0 + turn;
      look.current.lat = clamp(e.beta - 90, -85, 85);
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      gyro.current = null;
    };
  }, [gyroOn]);

  async function toggleGyro() {
    if (gyroOn) return setGyroOn(false);
    const Ctor = DeviceOrientationEvent as OrientationEventCtor;
    try {
      if (Ctor.requestPermission && (await Ctor.requestPermission()) !== "granted") return;
      setGyroOn(true);
    } catch {
      setGyroOn(false);
    }
  }

  function togglePlay() {
    const v = media.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => setPlaying(false));
    else v.pause();
  }

  function onKey(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 30 : 10;
    const l = look.current;
    if (e.key === "ArrowLeft") l.lon -= step;
    else if (e.key === "ArrowRight") l.lon += step;
    else if (e.key === "ArrowUp") l.lat = clamp(l.lat + step, -85, 85);
    else if (e.key === "ArrowDown") l.lat = clamp(l.lat - step, -85, 85);
    else if (e.key === "+" || e.key === "=") l.fov = clamp(l.fov - 5, 40, 95);
    else if (e.key === "-") l.fov = clamp(l.fov + 5, 40, 95);
    else if (e.key === " " || e.key === "k") togglePlay();
    else if (e.key === "Escape" && !document.fullscreenElement) onClose();
    else return;
    e.preventDefault();
  }

  const btn = "relative grid h-11 min-w-11 place-items-center rounded-full bg-surface/90 text-ink shadow-sm hover:bg-surface";

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={box}
        tabIndex={0}
        role="application"
        aria-roledescription="visor 360°"
        aria-label={`Vídeo 360°: ${video.name}. Arrastra o usa las flechas para mirar alrededor, + y − para acercar, espacio para reproducir o pausar.`}
        onKeyDown={onKey}
        className="relative h-72 w-full cursor-grab overflow-hidden rounded-xl bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:cursor-grabbing md:h-[28rem] [&:fullscreen]:h-full [&:fullscreen]:rounded-none"
      >
        <video
          ref={media}
          src={pickSource(video)}
          poster={video.poster}
          crossOrigin="anonymous"
          playsInline
          loop
          preload="metadata"
          muted={muted}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setStatus("failed")}
          className="hidden"
        />
        {status !== "ready" && (
          <p role="status" className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-surface">
            {status === "loading" ? "Cargando el visor 360°…" : "No se pudo cargar el vídeo. Comprueba la conexión."}
          </p>
        )}
        <div className="absolute inset-x-2 bottom-2 flex gap-2">
          <button type="button" onClick={togglePlay} className={btn} aria-label={playing ? "Pausar" : "Reproducir"} title={playing ? "Pausar" : "Reproducir"}>
            {playing ? <IconPause width={20} /> : <IconPlay width={20} />}
          </button>
          <button type="button" onClick={() => setMuted((m) => !m)} className={btn} aria-label="Silenciar" aria-pressed={muted} title={muted ? "Activar sonido" : "Silenciar"}>
            <IconSpeaker width={20} />
            {muted && <span aria-hidden className="absolute h-0.5 w-6 rotate-45 rounded bg-ink" />}
          </button>
          {gyroAvailable && (
            <button type="button" onClick={toggleGyro} className={`${btn} w-auto px-3 text-sm font-semibold`} aria-pressed={gyroOn}>
              {gyroOn ? "Mover con el dedo" : "Mover con el móvil"}
            </button>
          )}
          {canFullscreen && (
            <button
              type="button"
              onClick={() => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen())}
              className={`${btn} ml-auto`}
              aria-label="Pantalla completa"
              title="Pantalla completa"
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex min-h-11 items-center self-start rounded-full border border-stone px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
      >
        Cerrar el vídeo
      </button>
    </div>
  );
}

function Video({ video }: { video: StopVideo360 }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-stone bg-surface p-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h3 className="text-sm font-semibold text-ink">{video.name}</h3>
        <span className="text-xs text-ink-muted">Vídeo 360° · {formatLength(video.durationSeconds)}</span>
      </div>
      {open ? (
        <Viewer
          video={video}
          onClose={() => {
            setOpen(false);
            requestAnimationFrame(() => toggle.current?.focus());
          }}
        />
      ) : (
        <button
          ref={toggle}
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center self-start rounded-full border border-stone px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
        >
          Ver en 360°
        </button>
      )}
      <p className="text-sm leading-relaxed text-ink">{video.description}</p>
      {video.credit && <p className="text-xs text-ink-muted">{video.credit}</p>}
    </li>
  );
}

export function StopVideos360({ videos }: { videos: readonly StopVideo360[] }) {
  if (videos.length === 0) return null;
  return (
    <section aria-label="Vídeos 360°" className="flex flex-col gap-2">
      <h3 className="font-display text-lg text-ink">En 360°</h3>
      <ul className="flex flex-col gap-3">
        {videos.map((v) => (
          <Video key={v.src} video={v} />
        ))}
      </ul>
      <p className="text-xs text-ink-muted">Los vídeos 360° necesitan conexión: no se guardan al descargar el recorrido. Mejor con wifi.</p>
    </section>
  );
}

"use client";
/**
 * "Usar sin conexión" for a guided tour: download its pages, audio and images to this device,
 * with progress, size and date; update when the published content changed; retry; remove.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import type { TourStop } from "@/domain/tour";
import { catalogVersion } from "@/data/content";
import { downloadTour, formatBytes, getPack, offlineSupported, removePack, tourFiles, type PackProgress, type PackRecord } from "@/lib/offline";
import { IconCheck } from "@/components/shell/icons";

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Whether the browser says it has a connection (true on the server). */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

const noSubscribe = () => () => {};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export function OfflinePack({
  tourId,
  title,
  href,
  pages,
  stops,
  extra = [],
}: {
  tourId: string;
  title: string;
  href: string;
  pages: readonly string[];
  stops: readonly TourStop[];
  /** Other files the tour shows (the illustrated map). */
  extra?: readonly string[];
}) {
  const supported = useSyncExternalStore(noSubscribe, offlineSupported, () => false);
  const online = useOnline();
  const [pack, setPack] = useState<PackRecord | null>(null);
  const [progress, setProgress] = useState<PackProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    let live = true;
    void getPack(tourId).then((p) => live && setPack(p));
    return () => {
      live = false;
    };
  }, [supported, tourId]);

  if (!supported) return null;
  const audioCount = stops.filter((t) => t.stop?.audio).length;
  const modelCount = stops.reduce((n, t) => n + (t.stop?.models?.length ?? 0), 0);
  const outdated = pack !== null && pack.catalogVersion !== catalogVersion();

  async function download() {
    setBusy(true);
    setMessage(null);
    const record = await downloadTour({ tourId, title, href, catalogVersion: catalogVersion() }, tourFiles(href, pages, stops, extra), setProgress);
    setBusy(false);
    setProgress(null);
    if (record.urls.length && (await getPack(tourId))) {
      setPack(record);
      setMessage("Listo: puedes hacer el recorrido sin conexión.");
    } else {
      setMessage("No se pudo descargar todo. Comprueba la conexión y vuelve a intentarlo: solo se bajará lo que falta.");
    }
  }

  async function remove() {
    await removePack(tourId);
    setPack(null);
    setMessage("Descarga borrada de este dispositivo.");
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section aria-labelledby={`${tourId}-offline`} className="flex flex-col gap-3 rounded-2xl border border-stone bg-surface p-4">
      <h2 id={`${tourId}-offline`} className="text-sm font-semibold text-ink">
        Usar sin conexión
      </h2>
      {pack && !busy ? (
        <>
          <p className="flex items-start gap-2 text-sm text-ink">
            <IconCheck width={18} className="mt-0.5 shrink-0 text-ok" />
            <span>
              Descargado en este dispositivo el {formatDate(pack.savedAt)} · {formatBytes(pack.bytes)}.
              {outdated && <span className="block text-ink-muted">El contenido se ha actualizado desde entonces: vuelve a descargarlo con conexión.</span>}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {outdated && online && (
              <button type="button" onClick={download} className="btn-primary inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold">
                Actualizar descarga
              </button>
            )}
            <button type="button" onClick={remove} className="inline-flex min-h-11 items-center rounded-full border border-stone px-4 text-sm font-semibold text-ink hover:bg-surface-muted">
              Borrar descarga
            </button>
          </div>
        </>
      ) : busy && progress ? (
        <div className="flex flex-col gap-2" aria-live="polite">
          <p className="text-sm text-ink">
            Descargando… {progress.done} de {progress.total} archivos · {formatBytes(progress.bytes)}
          </p>
          <div role="progressbar" aria-label="Descarga del recorrido" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-ink-muted">No cierres esta página hasta que termine.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            Guarda en el móvil los textos{audioCount > 0 ? `, los ${audioCount} audios` : ""}
            {modelCount > 0 ? `, los ${modelCount} modelos 3D` : ""} y las imágenes del recorrido para hacerlo donde no hay cobertura. Mejor con wifi.
          </p>
          <button
            type="button"
            onClick={download}
            disabled={!online || busy}
            className="inline-flex min-h-11 items-center self-start rounded-full border border-stone px-4 text-sm font-semibold text-ink hover:bg-surface-muted disabled:opacity-50"
          >
            Descargar el recorrido
          </button>
          {!online && <p className="text-xs text-ink-muted">Ahora no hay conexión: la descarga se hace con conexión.</p>}
        </>
      )}
      {message && (
        <p role="status" className="text-xs text-ink-muted">
          {message}
        </p>
      )}
      <p className="text-xs text-ink-muted">Sin conexión no funcionan el asistente, el mapa ni las indicaciones para llegar.</p>
    </section>
  );
}

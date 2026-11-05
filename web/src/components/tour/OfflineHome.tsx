"use client";
/** Offline fallback: says there is no connection and lists the tours saved on this device. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatBytes, listPacks, type PackRecord } from "@/lib/offline";
import { IconHeadphones } from "@/components/shell/icons";

export function OfflineHome() {
  const [packs, setPacks] = useState<PackRecord[] | null>(null);
  useEffect(() => {
    void listPacks().then(setPacks);
  }, []);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-10 md:px-8">
      <h1 className="font-display text-3xl text-ink">Sin conexión</h1>
      <p className="text-body text-ink-muted">
        Esta página no está guardada en el dispositivo. Los recorridos que descargaste funcionan sin conexión, con sus textos, audios e imágenes.
      </p>
      {packs === null ? null : packs.length === 0 ? (
        <p className="text-sm text-ink-muted">Todavía no has descargado ningún recorrido. Hazlo desde el inicio de cada recorrido guiado, con conexión.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {packs.map((p) => (
            <li key={p.tourId}>
              <a href={p.href} className="flex min-h-14 items-center gap-3 rounded-2xl border border-stone bg-surface px-4 py-3 hover:bg-surface-muted">
                <IconHeadphones width={20} className="shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{p.title}</span>
                  <span className="block text-xs text-ink-muted">{formatBytes(p.bytes)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <Link href="/" className="self-start text-sm font-semibold text-ink underline underline-offset-4">
        Volver al inicio
      </Link>
    </div>
  );
}

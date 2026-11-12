"use client";
/**
 * Turn the assistant's proximity alerts on or off and choose what they cover. A button that opens
 * a non-modal popover; in the assistant's header as an icon, on the map as a labelled pill.
 * Turning them on is what asks the browser for location (never before).
 */
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { IconLocate } from "@/components/shell/icons";
import { usePopover } from "@/components/chat/usePopover";
import type { GeoStatus } from "@/lib/useGeolocation";
import { actions, useAppState } from "@/state/store";

function statusText(enabled: boolean, live: boolean, status: GeoStatus): string {
  if (!enabled) return "Desactivados.";
  if (!live) return "En pausa hasta que los reanudes en este dispositivo.";
  switch (status) {
    case "denied":
      return "El navegador no deja usar tu ubicación. Permítela para este sitio en los ajustes del navegador.";
    case "unavailable":
      return "Este dispositivo no puede darnos tu ubicación ahora.";
    case "locating":
      return "Buscando tu ubicación…";
    case "on":
      return "Activados. Te avisaré cuando pases cerca.";
    default:
      return "En pausa durante el recorrido guiado: el recorrido te avisa de cada parada.";
  }
}

function Check({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
      <span>
        {label}
        {hint && <span className="block text-xs text-ink-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function NearbyControl({ variant, className = "" }: { variant: "icon" | "pill"; className?: string }) {
  const nearby = useAppState((s) => s.nearby);
  const live = useAppState((s) => s.nearbyLive);
  const status = useAppState((s) => s.nearbyStatus);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  usePopover(open, panelRef, triggerRef, () => setOpen(false));

  const on = nearby.enabled && live;
  const label = `Avisos de cercanía: ${nearby.enabled ? (live ? "activados" : "en pausa") : "desactivados"}`;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-label={variant === "icon" ? label : undefined}
        title={variant === "icon" ? label : undefined}
        onClick={() => setOpen((o) => !o)}
        className={
          variant === "icon"
            ? "relative grid h-11 w-11 place-items-center rounded-full border border-stone bg-surface text-ink hover:bg-surface-muted"
            : "inline-flex min-h-11 items-center gap-2 rounded-full border border-stone bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
        }
      >
        <IconLocate width={18} height={18} />
        {variant === "pill" && (on ? "Avisos de cercanía: sí" : "Avisarme cerca")}
        {variant === "icon" && on && <span aria-hidden="true" className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={`${id}-panel`}
          role="group"
          aria-labelledby={`${id}-title`}
          tabIndex={-1}
          className="absolute right-0 top-full z-40 mt-2 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-3 rounded-2xl border border-stone bg-surface p-4 text-left shadow-lg"
        >
          <h2 id={`${id}-title`} className="font-display text-lg text-ink">
            Avisos de cercanía
          </h2>
          <p className="text-sm text-ink-muted">Con la app abierta, te aviso cuando pases cerca de un lugar de la ruta.</p>

          <button
            type="button"
            role="switch"
            aria-checked={nearby.enabled}
            data-autofocus
            onClick={() => actions.setNearby({ enabled: !nearby.enabled })}
            className="inline-flex min-h-11 items-center gap-3 rounded-full text-sm font-semibold text-ink"
          >
            <span
              aria-hidden="true"
              className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors motion-reduce:transition-none ${nearby.enabled ? "border-primary bg-primary" : "border-stone bg-surface"}`}
            >
              <span
                className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-[left] motion-reduce:transition-none ${nearby.enabled ? "left-[1.125rem] bg-on-primary" : "left-0.5 bg-ink-muted"}`}
              />
            </span>
            Avisarme cerca de lugares
          </button>

          <p role="status" className="text-sm text-ink">
            {statusText(nearby.enabled, live, status)}
          </p>
          {nearby.enabled && !live && (
            <button
              type="button"
              onClick={() => actions.setNearby({ enabled: true })}
              className="min-h-11 self-start rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover"
            >
              Reanudar los avisos
            </button>
          )}

          <fieldset className="flex flex-col border-t border-stone pt-2">
            <legend className="sr-only">De qué lugares avisar</legend>
            <Check label="Lugares visigodos" checked={nearby.visigothic} onChange={(v) => actions.setNearby({ visigothic: v })} />
            <Check
              label="Otro patrimonio de la ruta"
              hint="Marcado como «Patrimonio no visigodo»."
              checked={nearby.other}
              onChange={(v) => actions.setNearby({ other: v })}
            />
          </fieldset>

          {nearby.muted.length > 0 && (
            <p className="text-sm text-ink-muted">
              {nearby.muted.length === 1 ? "Has silenciado 1 lugar." : `Has silenciado ${nearby.muted.length} lugares.`}{" "}
              <button type="button" onClick={() => actions.unmuteAllNearby()} className="min-h-11 font-semibold text-ink underline underline-offset-4">
                Volver a avisar
              </button>
            </p>
          )}

          <p className="text-xs leading-relaxed text-ink-muted">
            Tu ubicación se usa solo en este dispositivo y no se guarda. Con la pantalla bloqueada o la app cerrada no hay avisos.{" "}
            <Link href="/privacidad" className="underline underline-offset-4">
              Privacidad
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

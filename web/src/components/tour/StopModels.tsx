"use client";
/**
 * The 3D models of a stop: each with its certainty seal and explanation. The viewer
 * (@google/model-viewer, three.js) loads only when the visitor asks for it, so a stop without
 * models, or a visitor who does not open them, never downloads it. Augmented reality is offered
 * where the device supports it.
 */
import { useState } from "react";
import type { StopModel } from "@/domain/types";
import { prefersReducedMotion } from "@/lib/motion";
import { CertaintyBadge, CertaintyLegend } from "@/components/shared/CertaintyBadge";

let viewerLoaded: Promise<unknown> | null = null;
const loadViewer = () => (viewerLoaded ??= import("@google/model-viewer"));

function Model({ model }: { model: StopModel }) {
  const [state, setState] = useState<"closed" | "loading" | "open" | "failed">("closed");

  async function open() {
    setState("loading");
    try {
      await loadViewer();
      setState("open");
    } catch {
      setState("failed");
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-stone bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <CertaintyBadge certainty={model.certainty} />
        <h3 className="text-sm font-semibold text-ink">{model.name}</h3>
      </div>
      {state === "open" ? (
        <model-viewer
          src={model.src}
          {...(model.iosSrc ? { "ios-src": model.iosSrc } : {})}
          alt={`Modelo 3D: ${model.name}. ${model.description}`}
          camera-controls
          touch-action="pan-y"
          {...(prefersReducedMotion() ? {} : { "auto-rotate": true })}
          ar
          ar-modes="webxr scene-viewer quick-look"
          shadow-intensity="0.6"
          className="block h-72 w-full rounded-xl bg-surface-muted md:h-96"
        />
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={state === "loading"}
          className="inline-flex min-h-11 items-center self-start rounded-full border border-stone px-4 text-sm font-semibold text-ink hover:bg-surface-muted disabled:opacity-60"
        >
          {state === "loading" ? "Cargando el modelo…" : "Ver en 3D"}
        </button>
      )}
      {state === "failed" && <p role="status" className="text-xs text-ink-muted">No se pudo cargar el visor 3D. Comprueba la conexión.</p>}
      <p className="text-sm leading-relaxed text-ink">{model.description}</p>
      {model.source && <p className="text-xs text-ink-muted">Base: {model.source}</p>}
    </li>
  );
}

export function StopModels({ models }: { models: readonly StopModel[] }) {
  if (models.length === 0) return null;
  return (
    <section aria-label="Modelos 3D" className="flex flex-col gap-2">
      <h3 className="font-display text-lg text-ink">En 3D</h3>
      <ul className="flex flex-col gap-3">
        {models.map((m) => (
          <Model key={m.src} model={m} />
        ))}
      </ul>
      <CertaintyLegend />
    </section>
  );
}

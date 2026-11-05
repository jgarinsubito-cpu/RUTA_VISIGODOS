/**
 * Certainty seal of a 3D reconstruction: what was excavated, what is restored from it, what is a
 * hypothesis, and what is only the footprint of a geophysical survey. Text and glyph shape carry
 * the meaning, never colour alone.
 */
import type { ModelCertainty } from "@/domain/types";

export const CERTAINTY_LABEL: Record<ModelCertainty, string> = {
  excavated: "Excavado",
  restored: "Restituido",
  hypothesis: "Hipótesis",
  geophysical: "Huella geofísica",
};

export const CERTAINTY_DESCRIPTION: Record<ModelCertainty, string> = {
  excavated: "Lo que se ha encontrado en la excavación, tal como está.",
  restored: "Completado a partir de restos excavados y de paralelos conocidos.",
  hypothesis: "Una propuesta de cómo pudo ser; no hay restos que la confirmen.",
  geophysical: "La planta que detectó la prospección bajo tierra, sin excavar.",
};

function Glyph({ certainty }: { certainty: ModelCertainty }) {
  const common = { "aria-hidden": true, viewBox: "0 0 12 12", width: 14, height: 14, focusable: false } as const;
  switch (certainty) {
    case "excavated": // solid square
      return (
        <svg {...common}>
          <rect x="1" y="1" width="10" height="10" rx="1.5" fill="currentColor" />
        </svg>
      );
    case "restored": // half-filled square
      return (
        <svg {...common}>
          <rect x="1" y="1" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth={1.4} />
          <path d="M1.7 10.3V6h8.6v4.3z" fill="currentColor" />
        </svg>
      );
    case "hypothesis": // dashed square
      return (
        <svg {...common}>
          <rect x="1" y="1" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth={1.4} strokeDasharray="2 1.4" />
        </svg>
      );
    default: // dotted footprint
      return (
        <svg {...common}>
          {[2.5, 6, 9.5].flatMap((x) => [2.5, 6, 9.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="currentColor" />))}
        </svg>
      );
  }
}

export function CertaintyBadge({ certainty }: { certainty: ModelCertainty }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-stone bg-surface px-2 py-0.5 text-xs font-semibold text-ink">
      <Glyph certainty={certainty} />
      {CERTAINTY_LABEL[certainty]}
    </span>
  );
}

export function CertaintyLegend() {
  return (
    <details>
      <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-ink underline-offset-4 hover:underline">¿Qué significan los sellos?</summary>
      <dl className="mt-1 flex flex-col gap-2">
        {(Object.keys(CERTAINTY_LABEL) as ModelCertainty[]).map((c) => (
          <div key={c} className="flex flex-col gap-0.5">
            <dt>
              <CertaintyBadge certainty={c} />
            </dt>
            <dd className="text-xs text-ink-muted">{CERTAINTY_DESCRIPTION[c]}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

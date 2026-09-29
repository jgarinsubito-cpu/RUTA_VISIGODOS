/**
 * Evidence level badge (D/I/H/T). Each level has a text label, a letter and a distinct glyph shape,
 * so the status never depends on color alone.
 */
import type { EvidenceLevel } from "@/domain/types";

export const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  D: "Documentado",
  I: "Interpretación",
  H: "Hipótesis",
  T: "Tradición",
};

export const EVIDENCE_DESCRIPTION: Record<EvidenceLevel, string> = {
  D: "Respaldado por fuentes documentales o arqueológicas.",
  I: "Lectura de especialistas; se indica de quién es la interpretación.",
  H: "Propuesta plausible todavía no confirmada.",
  T: "Relato transmitido por la tradición, sin respaldo documental.",
};

const TONE: Record<EvidenceLevel, string> = {
  D: "border-ok/40 bg-ok-soft text-ok",
  I: "border-gold/50 bg-gold-soft text-ink",
  H: "border-warn/40 bg-warn-soft text-warn",
  T: "border-stone bg-surface-muted text-ink-muted",
};

function Glyph({ level }: { level: EvidenceLevel }) {
  const common = { "aria-hidden": true, viewBox: "0 0 12 12", width: 12, height: 12, focusable: false } as const;
  switch (level) {
    case "D": // filled circle with check
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="5.5" fill="currentColor" />
          <path d="M3.4 6.2 5.2 8l3.4-3.8" fill="none" stroke="var(--surface)" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      );
    case "I": // diamond
      return (
        <svg {...common}>
          <path d="M6 .8 11.2 6 6 11.2.8 6z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
          <circle cx="6" cy="6" r="1.4" fill="currentColor" />
        </svg>
      );
    case "H": // dashed triangle
      return (
        <svg {...common}>
          <path
            d="M6 1.2 11 10.5H1z"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeDasharray="2 1.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    default: // double ring (tradition)
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth={1.4} />
          <circle cx="6" cy="6" r="2" fill="none" stroke="currentColor" strokeWidth={1.2} />
        </svg>
      );
  }
}

export function EvidenceBadge({
  level,
  attribution,
  className = "",
}: {
  level: EvidenceLevel;
  /** Shown as visible text for interpretations ("según …"). */
  attribution?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 ${className}`}>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-4 ${TONE[level]}`}
      >
        <Glyph level={level} />
        <span aria-hidden="true">{level}</span>
        <span>
          <span className="sr-only">Nivel de evidencia: </span>
          {EVIDENCE_LABEL[level]}
        </span>
      </span>
      {attribution && <span className="text-xs text-ink-muted">según {attribution}</span>}
    </span>
  );
}

/** Collapsible legend explaining the four levels. */
export function EvidenceLegend({ className = "" }: { className?: string }) {
  return (
    <details className={`rounded-xl border border-stone bg-surface-muted px-4 text-sm ${className}`}>
      <summary className="flex min-h-11 cursor-pointer items-center font-medium">¿Qué significan las etiquetas?</summary>
      <dl className="grid gap-2 pb-3">
        {(Object.keys(EVIDENCE_LABEL) as EvidenceLevel[]).map((lvl) => (
          <div key={lvl} className="flex flex-wrap items-start gap-2">
            <dt>
              <EvidenceBadge level={lvl} />
            </dt>
            <dd className="text-ink-muted">{EVIDENCE_DESCRIPTION[lvl]}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/** Visible marker for demo fixtures (product rule 1): one short word, full meaning for screen readers. */
export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-warn/40 bg-warn-soft px-2 py-0.5 text-xs font-semibold normal-case tracking-normal text-warn ${className}`}
      title="Contenido de demostración pendiente de validación"
    >
      Demo<span className="sr-only"> · pendiente de validación</span>
    </span>
  );
}

/** Label for non-Visigothic heritage or services (product rule 4). */
export function NonVisigothicBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border border-stone px-2 py-0.5 text-xs font-semibold text-ink-muted ${className}`}>
      Patrimonio no visigodo
    </span>
  );
}

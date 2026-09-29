/** Visible marker for demo fixtures (product rule 1). */
export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-dashed border-warn/60 bg-warn-soft px-2 py-0.5 text-[11px] font-semibold leading-4 text-warn ${className}`}
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 12 12" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path d="M6 1.5 11 10.5H1z" strokeLinejoin="round" />
        <path d="M6 5v2.2M6 8.8h.01" strokeLinecap="round" />
      </svg>
      Demo · pendiente de validación
    </span>
  );
}

/** Label for non-Visigothic heritage or services (product rule 4). */
export function NonVisigothicBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-stone bg-surface-muted px-2 py-0.5 text-[11px] font-semibold leading-4 text-ink-muted ${className}`}
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 12 12" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.6}>
        <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" strokeDasharray="2 1.5" />
      </svg>
      Patrimonio no visigodo
    </span>
  );
}

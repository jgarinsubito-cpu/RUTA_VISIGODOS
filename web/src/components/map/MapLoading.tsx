/** Placeholder shown while the client-only map bundle loads. */
export function MapLoading({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      className={`grid min-h-64 place-items-center rounded-2xl border border-stone bg-surface-muted text-sm text-ink-muted ${className}`}
    >
      Cargando mapa…
    </div>
  );
}

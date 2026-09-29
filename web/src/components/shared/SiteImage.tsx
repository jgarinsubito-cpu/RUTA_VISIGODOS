/** Gradient placeholder for site imagery until licensed photography exists (product rule 7). */
import type { Site } from "@/domain/types";

export function SiteImage({
  site,
  aspect = "aspect-[16/10]",
  className = "",
  caption = true,
  rounded = "rounded-xl",
}: {
  site: Pick<Site, "name" | "imageTone" | "imageCredit">;
  /** Tailwind aspect-ratio class. */
  aspect?: string;
  className?: string;
  caption?: boolean;
  rounded?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`Imagen provisional de ${site.name}`}
      className={`relative w-full max-w-full overflow-hidden ${rounded} ${aspect} ${className}`}
      style={{ backgroundImage: site.imageTone }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        className="absolute inset-0 h-full w-full opacity-25"
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
      >
        <path d="M0 48 L18 36 L30 42 L48 26 L62 38 L78 30 L100 44 L100 60 L0 60 Z" fill="var(--surface)" />
      </svg>
      {caption && (
        <span className="absolute bottom-2 left-2 rounded-md bg-surface/85 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
          Imagen provisional{site.imageCredit ? ` · ${site.imageCredit}` : ""}
        </span>
      )}
    </div>
  );
}

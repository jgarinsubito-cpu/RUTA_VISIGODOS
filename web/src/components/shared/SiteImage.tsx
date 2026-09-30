/**
 * Place photo: the licensed image in a plain rounded frame, or the site's tone token (--tone-*)
 * as a placeholder while it has none (the tone also sits behind the photo while it loads). Credits are shown next
 * to the photo by the caller (place panel, hero); `caption` overlays a short one when needed.
 */
import Image from "next/image";
import type { Site } from "@/domain/types";

export function SiteImage({
  site,
  aspect = "aspect-[4/3]",
  className = "",
  caption = false,
  rounded = "rounded-2xl",
  sizes = "(min-width: 768px) 40vw, 100vw",
  priority = false,
  width = "w-full",
}: {
  site: Pick<Site, "name" | "imageTone" | "imageCredit" | "image">;
  /** Tailwind aspect-ratio class; pass "" when the parent sets the size. */
  aspect?: string;
  className?: string;
  /** Overlays the credit (photo) or "Imagen provisional" (placeholder). */
  caption?: boolean;
  rounded?: string;
  /** `sizes` for the responsive photo; match the rendered width. */
  sizes?: string;
  priority?: boolean;
  /** Tailwind width class (full width by default). */
  width?: string;
}) {
  const photo = site.image;
  return (
    <div
      className={`relative ${width} max-w-full overflow-hidden ${rounded} ${aspect} ${className}`}
      style={{ backgroundImage: `var(--tone-${site.imageTone})` }}
      {...(photo ? {} : { role: "img", "aria-label": `Imagen provisional de ${site.name}` })}
    >
      {photo && (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          style={{ objectPosition: photo.focus ?? "50% 50%" }}
        />
      )}
      {caption && (
        <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-surface/85 px-1.5 py-0.5 text-2xs font-medium text-ink-muted">
          {photo ? `Foto: ${photo.author} · ${photo.license}` : `Imagen provisional${site.imageCredit ? ` · ${site.imageCredit}` : ""}`}
        </span>
      )}
    </div>
  );
}

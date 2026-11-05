/**
 * Images of a stop or place, in a scrolling row, each with its caption and the credit its licence
 * requires (author, licence, link to the source). Only images with complete credits reach here:
 * the catalog rules refuse the rest.
 */
import Image from "next/image";
import type { PlaceImage } from "@/domain/types";
import { Carousel } from "./Carousel";

export function Gallery({ images, label }: { images: readonly PlaceImage[]; label: string }) {
  if (images.length === 0) return null;
  return (
    <Carousel label={label}>
      {images.map((img) => (
        <li key={img.src} className="w-64 shrink-0 snap-start sm:w-72">
          <figure className="flex flex-col gap-1.5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-muted">
              <Image src={img.src} alt={img.alt} fill sizes="288px" className="object-cover" style={{ objectPosition: img.focus ?? "50% 50%" }} />
            </div>
            <figcaption className="flex flex-col gap-0.5">
              {img.caption && <span className="text-xs leading-snug text-ink">{img.caption}</span>}
              <span className="text-2xs text-ink-muted">
                {img.author} ·{" "}
                <a href={img.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  {img.license}
                </a>
              </span>
            </figcaption>
          </figure>
        </li>
      ))}
    </Carousel>
  );
}

/** A story or transcript body: its paragraphs as paragraphs. */
export function Paragraphs({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {text
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </div>
  );
}

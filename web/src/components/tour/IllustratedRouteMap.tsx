/**
 * Illustrated map of a route (not to scale), with a numbered pin per tour stop. Pins open the
 * stop when the caller passes `onPin` (guided tour) and are plain labels otherwise.
 */
import Image from "next/image";
import type { IllustratedMap } from "@/domain/types";

export function IllustratedRouteMap({
  map,
  stopNumbers,
  stopNames,
  onPin,
  current,
}: {
  map: IllustratedMap;
  /** Number shown on each pin (its position in the tour). */
  stopNumbers: ReadonlyMap<string, number>;
  stopNames: ReadonlyMap<string, string>;
  onPin?: (stopId: string) => void;
  current?: string;
}) {
  return (
    <figure className="flex flex-col gap-1.5">
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: `${map.width} / ${map.height}` }}>
        <Image src={map.src} alt={map.alt} fill sizes="(min-width: 768px) 672px, 100vw" className="object-cover" />
        {map.pins.map((pin) => {
          const n = stopNumbers.get(pin.stopId);
          if (n === undefined) return null;
          const name = stopNames.get(pin.stopId) ?? "";
          const pinClass = `grid h-7 w-7 place-items-center rounded-full border-2 text-xs font-bold tabular-nums shadow ${
            current === pin.stopId ? "border-surface bg-primary text-on-primary" : "border-primary bg-surface text-ink"
          }`;
          return (
            <span key={pin.stopId} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>
              {onPin ? (
                <button type="button" onClick={() => onPin(pin.stopId)} aria-label={`Parada ${n}: ${name}`} className="grid h-11 w-11 place-items-center">
                  <span className={pinClass}>{n}</span>
                </button>
              ) : (
                <span className={pinClass} role="img" aria-label={`Parada ${n}: ${name}`}>
                  {n}
                </span>
              )}
            </span>
          );
        })}
      </div>
      <figcaption className="text-2xs text-ink-muted">
        {map.caption} {map.credit}
      </figcaption>
    </figure>
  );
}

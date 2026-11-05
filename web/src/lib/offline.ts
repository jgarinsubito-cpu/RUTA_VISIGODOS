/**
 * Tours downloaded for use without coverage (PLAN.md, "Route download": what is included, size,
 * progress, version date, retry and remove). The page fetches every file of a tour into the
 * "rv-packs-v1" cache; the service worker (public/sw.js) serves them when the network fails.
 * A small JSON record per tour, in the same cache, says what was saved and when.
 *
 * Only on this device: nothing is uploaded, and the browser may still evict the data when the
 * device runs out of space (persistent storage is requested to make that less likely).
 */
import type { TourStop } from "@/domain/tour";

export const PACKS_CACHE = "rv-packs-v1";
const RECORD_PREFIX = "/__sin-conexion/";

export interface PackRecord {
  tourId: string;
  title: string;
  /** The tour page, the entry point offline. */
  href: string;
  urls: string[];
  bytes: number;
  savedAt: string;
  /** Published catalog version the tour was saved from (null: bundled catalog). */
  catalogVersion: number | null;
}

export interface PackProgress {
  done: number;
  total: number;
  bytes: number;
  failed: string[];
}

export function offlineSupported(): boolean {
  return typeof window !== "undefined" && "caches" in window && "serviceWorker" in navigator;
}

/** Every file a tour needs offline: its pages, and the audio and images of its stops. */
export function tourFiles(href: string, pages: readonly string[], stops: readonly TourStop[]): string[] {
  const media = stops.flatMap((t) => [
    ...(t.stop?.audio ? [t.stop.audio.src] : []),
    ...(t.stop?.gallery.map((g) => g.src) ?? []),
    ...(t.site.image ? [t.site.image.src] : []),
  ]);
  return [...new Set([href, ...pages, ...media])];
}

/** Build assets a page or a stylesheet refers to (scripts, styles, fonts). */
function assetUrls(text: string): string[] {
  return [...new Set((text.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? []).map((u) => u.replace(/&amp;/g, "&")))];
}

const isPage = (url: string) => url.startsWith("/") && !/\.[a-z0-9]{2,5}$/i.test(url.split("?")[0]);

async function save(cache: Cache, url: string): Promise<{ bytes: number; text?: string }> {
  const res = await fetch(url, { mode: url.startsWith("/") ? "same-origin" : "cors", credentials: "same-origin" });
  if (!res.ok) throw new Error(`${res.status}`);
  const blob = await res.clone().blob();
  await cache.put(url, res);
  const textual = isPage(url) || url.endsWith(".css");
  return { bytes: blob.size, text: textual ? await blob.text() : undefined };
}

/**
 * Download a tour. Pages are saved with the scripts, styles and fonts they load, so they open
 * offline exactly as online. Files that fail are reported; the rest are kept, so a retry only
 * fetches what is missing.
 */
export async function downloadTour(
  pack: Omit<PackRecord, "bytes" | "savedAt" | "urls">,
  files: readonly string[],
  onProgress: (p: PackProgress) => void,
): Promise<PackRecord> {
  const cache = await caches.open(PACKS_CACHE);
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Not granted: the download still works, it can just be evicted under storage pressure.
  }
  const queue = [...files];
  const saved = new Set<string>();
  const progress: PackProgress = { done: 0, total: queue.length, bytes: 0, failed: [] };
  onProgress({ ...progress });

  const work = async () => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      if (saved.has(url)) continue;
      saved.add(url);
      try {
        const { bytes, text } = await save(cache, url);
        progress.bytes += bytes;
        if (text) {
          for (const asset of assetUrls(text)) {
            if (!saved.has(asset)) {
              queue.push(asset);
              progress.total += 1;
            }
          }
        }
      } catch {
        progress.failed.push(url);
      }
      progress.done += 1;
      onProgress({ ...progress, failed: [...progress.failed] });
    }
  };
  // A few downloads at a time: quicker on a good connection, gentle on a weak one.
  await Promise.all([work(), work(), work(), work()]);

  const record: PackRecord = { ...pack, urls: [...saved].filter((u) => !progress.failed.includes(u)), bytes: progress.bytes, savedAt: new Date().toISOString() };
  if (progress.failed.length === 0) {
    await cache.put(RECORD_PREFIX + encodeURIComponent(pack.tourId), new Response(JSON.stringify(record), { headers: { "Content-Type": "application/json" } }));
  }
  return record;
}

export async function listPacks(): Promise<PackRecord[]> {
  if (!offlineSupported()) return [];
  const cache = await caches.open(PACKS_CACHE);
  const keys = (await cache.keys()).filter((k) => new URL(k.url).pathname.startsWith(RECORD_PREFIX));
  const records = await Promise.all(keys.map(async (k) => (await cache.match(k))?.json() as Promise<PackRecord> | undefined));
  return records.filter((r): r is PackRecord => Boolean(r)).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function getPack(tourId: string): Promise<PackRecord | null> {
  if (!offlineSupported()) return null;
  const res = await (await caches.open(PACKS_CACHE)).match(RECORD_PREFIX + encodeURIComponent(tourId));
  return res ? ((await res.json()) as PackRecord) : null;
}

/** Remove a tour; files another downloaded tour also uses stay. */
export async function removePack(tourId: string): Promise<void> {
  const cache = await caches.open(PACKS_CACHE);
  const packs = await listPacks();
  const target = packs.find((p) => p.tourId === tourId);
  if (!target) return;
  const kept = new Set(packs.filter((p) => p.tourId !== tourId).flatMap((p) => p.urls));
  await Promise.all(target.urls.filter((u) => !kept.has(u)).map((u) => cache.delete(u)));
  await cache.delete(RECORD_PREFIX + encodeURIComponent(tourId));
}

/** "23,4 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

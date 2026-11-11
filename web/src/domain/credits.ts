/**
 * The credits of a catalog, item by item, for the /creditos page: who made each image, recording,
 * 3D model and map, under which licence, and the sources the published claims rest on. Derived
 * from the content, so a new photo or source is credited as soon as it is published.
 */
import type { Catalog, PlaceImage } from "./types";

export interface ImageCredit {
  author: string;
  license: string;
  /** Where the image is used and its file page, one entry per image. */
  items: { where: string; alt: string; sourceUrl: string }[];
}

export interface Credits {
  /** Grouped by author and licence, most images first. */
  images: ImageCredit[];
  /** Recorded narrations: the stop and the credit line (absent: no credit recorded yet). */
  audio: { where: string; credit?: string }[];
  /** One entry per model file; `where` lists every stop that shows it, separated by "; ". */
  models: { where: string; name: string; source?: string }[];
  /** 360° videos: where, what, and the recording credit (absent: not recorded yet). */
  videos360: { where: string; name: string; credit?: string }[];
  maps: { where: string; credit: string }[];
  /** Photos of museum pieces shown on the web (with the museum's permission). */
  pieceImages: { where: string; name: string; credit: string }[];
  /** Unique source titles of the published claims, alphabetical, with how many claims cite each. */
  sources: { title: string; url?: string; claims: number }[];
  /** Narrations with no credit line: to fix before publishing. */
  missingAudioCredits: number;
}

const collator = new Intl.Collator("es", { sensitivity: "base" });

export function collectCredits(catalog: Catalog): Credits {
  const siteName = new Map(catalog.sites.map((s) => [s.id, s.name]));
  const images = new Map<string, ImageCredit>();
  const seen = new Set<string>();

  const addImage = (img: PlaceImage, where: string) => {
    // The same file used twice (a place photo reused at a stop) is credited once.
    if (seen.has(img.src)) return;
    seen.add(img.src);
    const key = `${img.author}\u0000${img.license}`;
    let group = images.get(key);
    if (!group) {
      group = { author: img.author, license: img.license, items: [] };
      images.set(key, group);
    }
    group.items.push({ where, alt: img.alt, sourceUrl: img.sourceUrl });
  };

  for (const site of catalog.sites) if (site.image) addImage(site.image, site.name);

  const audio: Credits["audio"] = [];
  const models: Credits["models"] = [];
  const videos360: Credits["videos360"] = [];
  const modelBySrc = new Map<string, Credits["models"][number]>();
  const stops = [...(catalog.stops ?? [])].sort(
    (a, b) => collator.compare(siteName.get(a.siteId) ?? "", siteName.get(b.siteId) ?? "") || a.order - b.order,
  );
  for (const stop of stops) {
    const place = siteName.get(stop.siteId) ?? stop.siteId;
    const where = stop.name === place ? place : `${place} · ${stop.name}`;
    for (const img of stop.gallery) addImage(img, where);
    if (stop.audio) audio.push({ where, credit: stop.audio.credit?.trim() || undefined });
    for (const v of stop.videos360 ?? []) videos360.push({ where, name: v.name, credit: v.credit?.trim() || undefined });
    for (const m of stop.models ?? []) {
      // A model shown at several stops is credited once, naming every stop.
      const known = modelBySrc.get(m.src);
      if (known) {
        if (!known.where.split("; ").includes(where)) known.where += `; ${where}`;
        continue;
      }
      const entry = { where, name: m.name, source: m.source };
      modelBySrc.set(m.src, entry);
      models.push(entry);
    }
  }

  const pieceImages = (catalog.pieces ?? []).flatMap((p) =>
    p.images.filter((im) => im.permission === "granted").map((im) => ({ where: p.museum.name, name: p.name, credit: im.credit })),
  );
  const maps = catalog.routes.flatMap((r) => (r.illustratedMap ? [{ where: r.name, credit: r.illustratedMap.credit }] : []));

  const sourceCount = new Map<string, { title: string; url?: string; claims: number }>();
  for (const claim of catalog.claims) {
    if (claim.status !== "published") continue;
    const title = claim.source.title.trim();
    const entry = sourceCount.get(title) ?? { title, url: claim.source.url, claims: 0 };
    entry.claims += 1;
    entry.url ??= claim.source.url;
    sourceCount.set(title, entry);
  }

  return {
    images: [...images.values()].sort((a, b) => b.items.length - a.items.length || collator.compare(a.author, b.author)),
    audio,
    models,
    videos360,
    maps,
    pieceImages,
    sources: [...sourceCount.values()].sort((a, b) => collator.compare(a.title, b.title)),
    missingAudioCredits: audio.filter((a) => !a.credit).length,
  };
}

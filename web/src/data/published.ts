/**
 * Server side: install the latest published catalog snapshot from the content store (Supabase,
 * table catalog_snapshots, readable with the publishable key) before rendering or answering.
 *
 * The response is cached and tagged CATALOG_TAG; publishing from the admin revalidates the tag so
 * the next request gets the new version. Without configuration, with nothing published yet, or when
 * a snapshot fails its checks, the current version stays (at first the bundled demo catalog): the
 * visitor app never depends on the content store being up.
 */
import "server-only";
import { cache } from "react";
import { parseCatalog } from "@/domain/editorial/schema";
import { hasErrors, validateCatalog } from "@/domain/editorial/validate";
import { catalogVersion, setCatalog } from "./content";

export const CATALOG_TAG = "catalog";
/** Seconds a cached snapshot is served before it is checked again; publishing refreshes it at once. */
const REVALIDATE_SECONDS = 300;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

interface SnapshotRow {
  version: number;
  catalog: unknown;
  published_at: string;
}

let publishedAt: string | null = null;
/** Each kind of failure is logged once per server process, not on every request. */
const warned = new Set<string>();

function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[content] ${message}`);
}

async function latestSnapshot(): Promise<SnapshotRow | null> {
  const res = await fetch(`${URL}/rest/v1/catalog_snapshots?select=version,catalog,published_at&order=version.desc&limit=1`, {
    headers: { apikey: KEY!, Accept: "application/json" },
    next: { tags: [CATALOG_TAG], revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows: unknown = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? (rows[0] as SnapshotRow) : null;
}

export interface PublishedInfo {
  /** Snapshot number, or null while the bundled demo catalog is in use. */
  version: number | null;
  publishedAt: string | null;
}

/** Make the latest valid published snapshot the current catalog. Safe to call from every page. */
export const loadPublishedCatalog = cache(async (): Promise<PublishedInfo> => {
  if (!URL || !KEY) return { version: catalogVersion(), publishedAt };
  try {
    const row = await latestSnapshot();
    if (row && row.version !== catalogVersion()) {
      const parsed = parseCatalog(row.catalog);
      if (!parsed.ok) {
        warnOnce(`shape:${row.version}`, `snapshot ${row.version} ignored: ${parsed.errors.slice(0, 3).map((e) => `${e.path} ${e.message}`).join("; ")}`);
      } else if (hasErrors(validateCatalog(parsed.value))) {
        warnOnce(`rules:${row.version}`, `snapshot ${row.version} ignored: it breaks catalog rules`);
      } else {
        setCatalog(parsed.value, row.version);
        publishedAt = row.published_at;
      }
    }
  } catch (error) {
    warnOnce("fetch", `content store unavailable, keeping version ${catalogVersion() ?? "demo"}: ${String(error)}`);
  }
  return { version: catalogVersion(), publishedAt };
});

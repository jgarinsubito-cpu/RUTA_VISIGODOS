/**
 * Rows of the content store (Supabase tables content_records and catalog_snapshots, see
 * supabase/migrations/20261015120000_content_admin.sql) and their mapping to the editorial types.
 * Shared by the admin in the browser and the publishing routes on the server.
 */
import type { PostgrestError } from "@supabase/supabase-js";
import type { AnyRecord, RecordStatus } from "@/domain/editorial/records";
import { RECORD_KINDS, type RecordKind } from "@/domain/editorial/schema";

export const RECORD_COLUMNS = "kind, id, data, status, retire, position, rev, review_note, first_published_at, updated_at, updated_by";
export const SNAPSHOT_INFO_COLUMNS = "version, note, restored_from, published_at, published_by";

export type StaffRole = "editor" | "validator";

export interface RecordRow {
  kind: string;
  id: string;
  data: unknown;
  status: RecordStatus;
  retire: boolean;
  position: number;
  rev: number;
  review_note: string | null;
  first_published_at: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface SnapshotInfoRow {
  version: number;
  note: string | null;
  restored_from: number | null;
  published_at: string;
  published_by: string | null;
}

/** A stored record, or null when its kind is unknown. Its data is checked when a catalog is built. */
export function recordFromRow(row: RecordRow): AnyRecord | null {
  if (!(RECORD_KINDS as readonly string[]).includes(row.kind)) return null;
  return {
    kind: row.kind as RecordKind,
    id: row.id,
    data: row.data,
    status: row.status,
    retire: row.retire,
    position: row.position,
    rev: row.rev,
    reviewNote: row.review_note,
    firstPublishedAt: row.first_published_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  } as AnyRecord;
}

/** Plain Spanish for content store errors shown to staff. */
export function storeMessage(error: Pick<PostgrestError, "code" | "message"> | null | undefined, fallback: string): string {
  if (!error) return fallback;
  // Table or function missing: the content admin migration has not been applied.
  if (error.code === "PGRST205" || error.code === "PGRST202" || error.code === "42P01") {
    return "El gestor de contenidos no está preparado en el servidor (falta aplicar la migración 20261015120000_content_admin.sql).";
  }
  // Raised by the database's own workflow rules, already in Spanish.
  if (error.code === "42501" || error.code === "P0409" || error.code === "22023") return error.message;
  return fallback;
}

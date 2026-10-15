/**
 * Server side of the content admin. Requests carry the staff member's own access token; the
 * database client acts as that user (publishable key + token), so row-level security and the
 * workflow functions decide what they may do. No secret key is involved.
 */
import "server-only";
import { revalidateTag } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CATALOG_TAG } from "@/data/published";
import type { AnyRecord, StatusUpdate } from "@/domain/editorial/records";
import { parseCatalog } from "@/domain/editorial/schema";
import type { Catalog } from "@/domain/types";
import { RECORD_COLUMNS, recordFromRow, storeMessage, type RecordRow, type StaffRole } from "./content-store";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export type StaffSession = { ok: true; db: SupabaseClient; userId: string; role: StaffRole } | { ok: false; response: Response };

/** The signed-in staff member behind a request (Authorization: Bearer <access token>). */
export async function staffSession(request: Request): Promise<StaffSession> {
  if (!URL || !KEY) return { ok: false, response: json(503, { error: "El gestor de contenidos no está configurado." }) };
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/)?.[1];
  if (!token) return { ok: false, response: json(401, { error: "Entra con tu cuenta para continuar." }) };
  const db = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return { ok: false, response: json(401, { error: "Tu sesión ha caducado. Vuelve a entrar." }) };
  const staff = await db.from("staff").select("role").eq("user_id", data.user.id).maybeSingle<{ role: StaffRole }>();
  if (staff.error) return { ok: false, response: json(500, { error: storeMessage(staff.error, "No se pudo comprobar tu acceso.") }) };
  if (!staff.data) return { ok: false, response: json(403, { error: "Tu cuenta no tiene acceso al gestor de contenidos." }) };
  return { ok: true, db, userId: data.user.id, role: staff.data.role };
}

export interface EditorialState {
  records: AnyRecord[];
  /** What the web shows now; null before the first publication. */
  latest: { version: number; catalog: Catalog } | null;
}

/** All records and the latest published catalog, as the signed-in staff member sees them. */
export async function loadEditorialState(db: SupabaseClient): Promise<{ ok: true; state: EditorialState } | { ok: false; message: string }> {
  const [records, latest] = await Promise.all([
    db.from("content_records").select(RECORD_COLUMNS).range(0, 9999),
    db.from("catalog_snapshots").select("version, catalog").order("version", { ascending: false }).limit(1),
  ]);
  if (records.error) return { ok: false, message: storeMessage(records.error, "No se pudieron leer los registros.") };
  if (latest.error) return { ok: false, message: storeMessage(latest.error, "No se pudo leer la versión publicada.") };
  const row = (latest.data as { version: number; catalog: unknown }[])[0];
  let catalog: EditorialState["latest"] = null;
  if (row) {
    const parsed = parseCatalog(row.catalog);
    if (!parsed.ok) return { ok: false, message: `La versión publicada ${row.version} no es válida; restaura otra.` };
    catalog = { version: row.version, catalog: parsed.value };
  }
  return {
    ok: true,
    state: {
      records: (records.data as RecordRow[]).map(recordFromRow).filter((r): r is AnyRecord => r !== null),
      latest: catalog,
    },
  };
}

/**
 * Store a checked catalog as the new published version and apply the record status changes, in
 * one database transaction; then tell cached pages to fetch it.
 */
export async function publishSnapshot(
  db: SupabaseClient,
  args: { catalog: Catalog; baseVersion: number | null; note: string; updates: StatusUpdate[]; restoredFrom?: number },
): Promise<Response> {
  const { data, error } = await db.rpc("publish_catalog", {
    p_catalog: args.catalog,
    p_base_version: args.baseVersion,
    p_note: args.note,
    p_updates: args.updates,
    p_restored_from: args.restoredFrom ?? null,
  });
  if (error) {
    const status = error.code === "P0409" ? 409 : error.code === "42501" ? 403 : 500;
    return json(status, { error: storeMessage(error, "No se pudo publicar. Inténtalo de nuevo.") });
  }
  // Visitors get the new version on their next request (no stale page after publishing).
  revalidateTag(CATALOG_TAG, { expire: 0 });
  return json(200, { version: data as number });
}

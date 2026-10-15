"use client";
/**
 * Content admin state (docs/ADMIN.md): the signed-in staff member, every record being edited and
 * what the web shows now. Reads and edits go straight to the content store with the staff member's
 * session (row-level security decides); publishing and restoring go through /api/admin so the
 * catalog is rebuilt and checked on the server.
 */
import { useSyncExternalStore } from "react";
import { demoCatalog } from "@/data/content";
import { recordKey, recordsFromCatalog, type AnyRecord, type RecordStatus } from "@/domain/editorial/records";
import { parseCatalog, parseRecordData, type FieldError, type RecordDataByKind, type RecordKind } from "@/domain/editorial/schema";
import type { CatalogIssue } from "@/domain/editorial/validate";
import type { Catalog } from "@/domain/types";
import { RECORD_COLUMNS, SNAPSHOT_INFO_COLUMNS, recordFromRow, storeMessage, type RecordRow, type SnapshotInfoRow, type StaffRole } from "@/lib/content-store";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export type AdminStatus = "unavailable" | "loading" | "signed-out" | "not-staff" | "ready" | "error";

export interface SnapshotInfo {
  version: number;
  note: string | null;
  restoredFrom: number | null;
  publishedAt: string;
  publishedBy: string | null;
}

export interface AdminState {
  status: AdminStatus;
  role: StaffRole | null;
  userId: string | null;
  /** Staff names by user id, for "who changed this". */
  team: Record<string, string>;
  records: AnyRecord[];
  /** What the web shows now; null until the first publication (the web shows the bundled demo). */
  live: { version: number; catalog: Catalog; publishedAt: string; note: string | null } | null;
  history: SnapshotInfo[];
  error: string | null;
}

let state: AdminState = {
  status: supabaseConfigured() ? "loading" : "unavailable",
  role: null,
  userId: null,
  team: {},
  records: [],
  live: null,
  history: [],
  error: null,
};
const serverSnapshot = state;
const listeners = new Set<() => void>();
let started = false;

function set(patch: Partial<AdminState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

async function load(userId: string) {
  const db = supabase();
  if (!db) return;
  const [staff, records, latest, history] = await Promise.all([
    db.from("staff").select("user_id, role, display_name"),
    db.from("content_records").select(RECORD_COLUMNS).order("position").range(0, 9999),
    db.from("catalog_snapshots").select("version, catalog, published_at, note").order("version", { ascending: false }).limit(1),
    db.from("catalog_snapshots").select(SNAPSHOT_INFO_COLUMNS).order("version", { ascending: false }).limit(50),
  ]);
  if (state.userId !== userId) return;
  const failed = staff.error ?? records.error ?? latest.error ?? history.error;
  if (failed) {
    set({ status: "error", error: storeMessage(failed, "No se pudo cargar el gestor de contenidos.") });
    return;
  }
  const team = staff.data as { user_id: string; role: StaffRole; display_name: string | null }[];
  const me = team.find((m) => m.user_id === userId);
  if (!me) {
    set({ status: "not-staff", role: null });
    return;
  }
  const row = (latest.data as { version: number; catalog: unknown; published_at: string; note: string | null }[])[0];
  const parsed = row ? parseCatalog(row.catalog) : null;
  set({
    status: "ready",
    error: parsed && !parsed.ok ? `La versión publicada ${row.version} no tiene un formato válido: restaura otra.` : null,
    role: me.role,
    team: Object.fromEntries(team.map((m) => [m.user_id, m.display_name ?? "Equipo"])),
    records: (records.data as RecordRow[]).map(recordFromRow).filter((r): r is AnyRecord => r !== null),
    live: row && parsed?.ok ? { version: row.version, catalog: parsed.value, publishedAt: row.published_at, note: row.note } : null,
    history: (history.data as SnapshotInfoRow[]).map((h) => ({
      version: h.version,
      note: h.note,
      restoredFrom: h.restored_from,
      publishedAt: h.published_at,
      publishedBy: h.published_by,
    })),
  });
}

function onUser(userId: string | null) {
  if (userId === state.userId && state.status !== "loading") return;
  set({ userId, status: userId ? "loading" : "signed-out", role: null, records: [], live: null, history: [], error: null });
  if (userId) void load(userId);
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const db = supabase();
  if (!db) return;
  void db.auth.getSession().then(({ data }) => onUser(data.session?.user.id ?? null));
  db.auth.onAuthStateChange((_event, session) => {
    // Supabase advises against awaiting other calls inside this callback.
    setTimeout(() => onUser(session?.user.id ?? null), 0);
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAdmin<T>(selector: (s: AdminState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => {
      start();
      return selector(state);
    },
    () => selector(serverSnapshot),
  );
}

export function getAdminState(): AdminState {
  return state;
}

/* ---------- Actions ---------- */

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string; fieldErrors?: FieldError[]; issues?: CatalogIssue[] };

const CONFLICT = "Alguien ha cambiado este registro mientras lo editabas. Recarga la página para ver la última versión.";

function replaceRecord(row: RecordRow) {
  const record = recordFromRow(row);
  if (!record) return;
  const exists = state.records.some((r) => recordKey(r) === recordKey(record));
  set({ records: exists ? state.records.map((r) => (recordKey(r) === recordKey(record) ? record : r)) : [...state.records, record] });
}

async function updateRecord(record: AnyRecord, patch: Record<string, unknown>, success: string): Promise<ActionResult> {
  const db = supabase();
  if (!db) return { ok: false, message: "El gestor de contenidos no está disponible." };
  const { data, error } = await db
    .from("content_records")
    .update(patch)
    .eq("kind", record.kind)
    .eq("id", record.id)
    .eq("rev", record.rev)
    .select(RECORD_COLUMNS)
    .maybeSingle<RecordRow>();
  if (error) return { ok: false, message: storeMessage(error, "No se pudo guardar. Inténtalo de nuevo.") };
  if (!data) return { ok: false, message: CONFLICT };
  replaceRecord(data);
  return { ok: true, message: success };
}

async function accessToken(): Promise<string | null> {
  const { data } = (await supabase()?.auth.getSession()) ?? { data: { session: null } };
  return data.session?.access_token ?? null;
}

async function callAdminApi(path: string, body: unknown): Promise<ActionResult & { version?: number }> {
  const token = await accessToken();
  if (!token) return { ok: false, message: "Tu sesión ha caducado. Vuelve a entrar." };
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; version?: number; issues?: CatalogIssue[]; fieldErrors?: FieldError[] };
    if (!res.ok) return { ok: false, message: json.error ?? "No se pudo completar.", issues: json.issues, fieldErrors: json.fieldErrors };
    return { ok: true, version: json.version };
  } catch {
    return { ok: false, message: "No hay conexión con el servidor. Inténtalo de nuevo." };
  }
}

/** Accent-free lowercase lists that the assistant matches against (aliases, keywords); done on save. */
export function normalizeMatchWords<K extends RecordKind>(kind: K, data: RecordDataByKind[K]): RecordDataByKind[K] {
  const fold = (w: string) =>
    w
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9ñ* ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const clean = (list: string[] | undefined) => (list ? Array.from(new Set(list.map(fold).filter(Boolean))) : list);
  switch (kind) {
    case "site": {
      const d = data as RecordDataByKind["site"];
      return { ...d, aliases: clean(d.aliases) } as RecordDataByKind[K];
    }
    case "claim": {
      const d = data as RecordDataByKind["claim"];
      return { ...d, keywords: clean(d.keywords) ?? [] } as RecordDataByKind[K];
    }
    case "route": {
      const d = data as RecordDataByKind["route"];
      return { ...d, keywords: clean(d.keywords) } as RecordDataByKind[K];
    }
    case "showcase": {
      const d = data as RecordDataByKind["showcase"];
      return { ...d, heritageKeywords: clean(d.heritageKeywords) ?? [] } as RecordDataByKind[K];
    }
    default:
      return data;
  }
}

export const adminActions = {
  start,

  /** Fetch everything again. Once loaded, it refreshes in place so pages keep their messages. */
  reload(): Promise<void> {
    if (!state.userId) return Promise.resolve();
    if (state.status !== "ready") set({ status: "loading" });
    return load(state.userId);
  },

  /** Save a record's working copy as a draft, or send it to review. */
  async save<K extends RecordKind>(
    kind: K,
    id: string,
    data: unknown,
    options: { submit: boolean; existing: AnyRecord | null },
  ): Promise<ActionResult> {
    const parsed = parseRecordData(kind, data);
    if (!parsed.ok) return { ok: false, message: "Revisa los campos marcados.", fieldErrors: parsed.errors };
    const value = normalizeMatchWords(kind, parsed.value);
    const status: RecordStatus = options.submit ? "review" : "draft";
    const success = options.submit ? "Enviado a revisión." : "Borrador guardado.";
    if (options.existing) {
      return updateRecord(options.existing, { data: value, status, retire: false }, success);
    }
    const db = supabase();
    if (!db) return { ok: false, message: "El gestor de contenidos no está disponible." };
    const position = Math.max(-1, ...state.records.filter((r) => r.kind === kind).map((r) => r.position)) + 1;
    const { data: row, error } = await db
      .from("content_records")
      .insert({ kind, id, data: value, status, position })
      .select(RECORD_COLUMNS)
      .single<RecordRow>();
    if (error) {
      return { ok: false, message: error.code === "23505" ? "Ya existe un registro con ese identificador." : storeMessage(error, "No se pudo guardar. Inténtalo de nuevo.") };
    }
    replaceRecord(row);
    return { ok: true, message: success };
  },

  /** Workflow step without changing the content: send to review, withdraw, or return with a note. */
  setStatus(record: AnyRecord, status: "draft" | "review", note?: string): Promise<ActionResult> {
    const message = status === "review" ? "Enviado a revisión." : note ? "Devuelto a borrador con tu nota." : "Vuelve a ser un borrador.";
    return updateRecord(record, { status, retire: false, ...(note !== undefined ? { review_note: note || null } : {}) }, message);
  },

  /** Ask a validator to take a published record off the web. */
  proposeRetire(record: AnyRecord): Promise<ActionResult> {
    return updateRecord(record, { status: "review", retire: true }, "Retirada enviada a revisión.");
  },

  /** Delete a record that never reached the web. */
  async remove(record: AnyRecord): Promise<ActionResult> {
    const db = supabase();
    if (!db) return { ok: false, message: "El gestor de contenidos no está disponible." };
    const { data, error } = await db.from("content_records").delete().eq("kind", record.kind).eq("id", record.id).select("id");
    if (error) return { ok: false, message: storeMessage(error, "No se pudo eliminar.") };
    if (!data || data.length === 0) return { ok: false, message: "Solo se pueden eliminar registros que nunca se han publicado." };
    set({ records: state.records.filter((r) => recordKey(r) !== recordKey(record)) });
    return { ok: true, message: "Eliminado." };
  },

  /** Swap a record's place in the list with its neighbour (order on the web from the next publication). */
  async move(record: AnyRecord, direction: -1 | 1): Promise<ActionResult> {
    const list = state.records.filter((r) => r.kind === record.kind).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
    const index = list.findIndex((r) => r.id === record.id);
    const other = list[index + direction];
    if (!other) return { ok: true };
    // Swap positions; on a tie, step just past the neighbour in the direction of the move.
    const next = other.position === record.position ? record.position + direction : other.position;
    const first = await updateRecord(record, { position: next }, "");
    if (!first.ok) return first;
    if (other.position === record.position) return { ok: true, message: "Orden cambiado: se aplicará en la próxima publicación." };
    return updateRecord(other, { position: record.position }, "Orden cambiado: se aplicará en la próxima publicación.");
  },

  /** First use: load the bundled demo catalog into the empty content store, all in review. */
  async importDemo(): Promise<ActionResult> {
    const db = supabase();
    if (!db) return { ok: false, message: "El gestor de contenidos no está disponible." };
    if (state.records.length > 0) return { ok: false, message: "El gestor ya tiene contenido." };
    const rows = recordsFromCatalog(demoCatalog()).map((r) => ({ ...r, status: "review" }));
    const { error } = await db.from("content_records").insert(rows);
    if (error) return { ok: false, message: storeMessage(error, "No se pudo importar el catálogo.") };
    await adminActions.reload();
    return { ok: true, message: "Catálogo importado: revísalo y publícalo desde «Publicar»." };
  },

  async publish(selected: AnyRecord[], note: string): Promise<ActionResult> {
    const result = await callAdminApi("/api/admin/publish", {
      selected: selected.map((r) => ({ kind: r.kind, id: r.id, rev: r.rev })),
      baseVersion: state.live?.version ?? null,
      note,
    });
    if (result.ok) {
      await adminActions.reload();
      return { ok: true, message: `Publicada la versión ${result.version}. La web ya la muestra.` };
    }
    return result;
  },

  async restore(version: number): Promise<ActionResult> {
    if (!state.live) return { ok: false, message: "No hay ninguna versión publicada." };
    const result = await callAdminApi("/api/admin/restore", { version, baseVersion: state.live.version });
    if (result.ok) {
      await adminActions.reload();
      return { ok: true, message: `La web vuelve a mostrar la versión ${version} (publicada como ${result.version}).` };
    }
    return result;
  },

  /** Upload a place photo to the public bucket; returns its URL and size. */
  async uploadImage(file: File): Promise<{ ok: true; src: string; width: number; height: number } | { ok: false; message: string }> {
    const db = supabase();
    if (!db) return { ok: false, message: "El gestor de contenidos no está disponible." };
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { ok: false, message: "Usa una foto JPG, PNG o WebP." };
    if (file.size > 5 * 1024 * 1024) return { ok: false, message: "La foto pesa más de 5 MB: redúcela antes de subirla." };
    let size: { width: number; height: number };
    try {
      const bitmap = await createImageBitmap(file);
      size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
    } catch {
      return { ok: false, message: "No se pudo leer la foto." };
    }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from("place-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { ok: false, message: "No se pudo subir la foto. Comprueba que tienes acceso y vuelve a probar." };
    return { ok: true, src: db.storage.from("place-images").getPublicUrl(path).data.publicUrl, ...size };
  },
};

/**
 * POST /api/admin/publish — a validator publishes the selected records in review. The catalog is
 * rebuilt here from the stored records (never taken from the browser), checked, and stored as a new
 * version together with the records' new statuses.
 */
import { z } from "zod";
import { buildCatalog, recordKey, statusesAfterPublish } from "@/domain/editorial/records";
import { parseCatalog, RECORD_KINDS } from "@/domain/editorial/schema";
import { hasErrors, validateCatalog } from "@/domain/editorial/validate";
import { json, loadEditorialState, publishSnapshot, staffSession } from "@/lib/admin-server";

export const runtime = "nodejs";

const BodySchema = z.object({
  /** Records the validator checked, at the rev they saw. */
  selected: z
    .array(z.object({ kind: z.enum(RECORD_KINDS), id: z.string().max(80), rev: z.number().int() }))
    .min(1)
    .max(5000),
  /** Latest version when the validator looked; null before the first publication. */
  baseVersion: z.number().int().nullable(),
  note: z.string().trim().max(500).default(""),
});

export async function POST(request: Request) {
  const session = await staffSession(request);
  if (!session.ok) return session.response;
  if (session.role !== "validator") return json(403, { error: "Solo quien valida puede publicar." });

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return json(400, { error: "Petición no válida." });

  const loaded = await loadEditorialState(session.db);
  if (!loaded.ok) return json(500, { error: loaded.message });
  const { records, latest } = loaded.state;
  if ((latest?.version ?? null) !== body.data.baseVersion) {
    return json(409, { error: "Se ha publicado otra versión mientras tanto. Recarga y revisa de nuevo." });
  }
  for (const pick of body.data.selected) {
    const record = records.find((r) => r.kind === pick.kind && r.id === pick.id);
    if (!record || record.status !== "review" || record.rev !== pick.rev) {
      return json(409, { error: `«${pick.id}» ha cambiado desde que lo revisaste. Recarga y revisa de nuevo.` });
    }
  }

  const selected = new Set(body.data.selected.map(recordKey));
  const catalog = buildCatalog(records, latest?.catalog ?? null, { mode: "publish", selected });
  const shape = parseCatalog(JSON.parse(JSON.stringify(catalog)));
  if (!shape.ok) {
    return json(422, { error: "Hay datos con un formato no válido.", fieldErrors: shape.errors.slice(0, 20) });
  }
  const issues = validateCatalog(shape.value, latest?.catalog ?? null);
  if (hasErrors(issues)) return json(422, { error: "La publicación tiene errores que corregir.", issues });

  return publishSnapshot(session.db, {
    catalog: shape.value,
    baseVersion: latest?.version ?? null,
    note: body.data.note,
    updates: statusesAfterPublish(records, selected),
  });
}

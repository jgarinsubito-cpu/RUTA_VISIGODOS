/**
 * POST /api/admin/restore — a validator puts an earlier published version back on the web. It is
 * published again as a new version (history is never rewritten), and records whose working copy
 * no longer matches the web go back to draft.
 */
import { z } from "zod";
import { statusesAfterRestore } from "@/domain/editorial/records";
import { parseCatalog } from "@/domain/editorial/schema";
import { hasErrors, validateCatalog } from "@/domain/editorial/validate";
import { json, loadEditorialState, publishSnapshot, staffSession } from "@/lib/admin-server";

export const runtime = "nodejs";

const BodySchema = z.object({
  version: z.number().int().min(1),
  baseVersion: z.number().int(),
});

export async function POST(request: Request) {
  const session = await staffSession(request);
  if (!session.ok) return session.response;
  if (session.role !== "validator") return json(403, { error: "Solo quien valida puede restaurar versiones." });

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return json(400, { error: "Petición no válida." });

  const loaded = await loadEditorialState(session.db);
  if (!loaded.ok) return json(500, { error: loaded.message });
  const { records, latest } = loaded.state;
  if (latest?.version !== body.data.baseVersion) {
    return json(409, { error: "Se ha publicado otra versión mientras tanto. Recarga y revisa de nuevo." });
  }
  if (body.data.version === latest.version) return json(400, { error: "Esa versión ya es la que muestra la web." });

  const old = await session.db.from("catalog_snapshots").select("catalog").eq("version", body.data.version).maybeSingle<{ catalog: unknown }>();
  if (old.error || !old.data) return json(404, { error: `No existe la versión ${body.data.version}.` });
  const parsed = parseCatalog(old.data.catalog);
  if (!parsed.ok) return json(422, { error: `La versión ${body.data.version} no tiene un formato válido.` });
  // Rules may have tightened since that version was published.
  const issues = validateCatalog(parsed.value, latest.catalog);
  if (hasErrors(issues)) return json(422, { error: `La versión ${body.data.version} no cumple las reglas actuales.`, issues });

  return publishSnapshot(session.db, {
    catalog: parsed.value,
    baseVersion: latest.version,
    note: `Restaurada la versión ${body.data.version}`,
    updates: statusesAfterRestore(records, parsed.value),
    restoredFrom: body.data.version,
  });
}

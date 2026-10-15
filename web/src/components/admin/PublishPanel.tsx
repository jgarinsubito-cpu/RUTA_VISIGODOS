"use client";
/**
 * Publicar: the records waiting in review, what the resulting version would break, and the button
 * that puts it on the web (validators). Also the history of published versions, with restore.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { buildCatalog, liveData, recordKey, type AnyRecord } from "@/domain/editorial/records";
import type { RecordKind } from "@/domain/editorial/schema";
import { parseCatalog } from "@/domain/editorial/schema";
import { hasErrors, validateCatalog, type CatalogIssue } from "@/domain/editorial/validate";
import { adminActions, useAdmin, type ActionResult } from "@/state/admin";
import { KIND_INFO, changedFields, editPath, fieldLabel, formatDate, recordTitle } from "./model";
import { IssueList, ResultMessage, Section, btnPrimary, btnSecondary, inputClass } from "./ui";

const KIND_ORDER: RecordKind[] = ["showcase", "site", "claim", "story", "route"];

function changeLabel(record: AnyRecord, live: Parameters<typeof liveData>[0]): string {
  if (record.retire) return "Retirada de la web";
  if (liveData(live, record.kind, record.id) === undefined) return "Nuevo";
  const fields = changedFields(record, live);
  return fields.length > 0 ? `Cambia: ${fields.join(", ")}` : "Sin cambios respecto a la web";
}

function History() {
  const history = useAdmin((s) => s.history);
  const live = useAdmin((s) => s.live);
  const role = useAdmin((s) => s.role);
  const team = useAdmin((s) => s.team);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  if (history.length === 0) return null;
  return (
    <Section title="Versiones publicadas" description="Restaurar publica de nuevo una versión anterior; el historial no se borra.">
      <ResultMessage result={result} />
      <ul className="flex flex-col divide-y divide-stone">
        {history.map((v) => (
          <li key={v.version} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="flex min-w-0 flex-col text-sm">
              <span className="font-semibold text-ink">
                Versión {v.version}
                {v.version === live?.version ? " · en la web" : ""}
              </span>
              <span className="text-xs text-ink-muted">
                {formatDate(v.publishedAt)}
                {v.publishedBy && team[v.publishedBy] ? ` · ${team[v.publishedBy]}` : ""}
                {v.note ? ` · «${v.note}»` : ""}
                {v.restoredFrom ? ` · copia de la versión ${v.restoredFrom}` : ""}
              </span>
            </span>
            {role === "validator" &&
              v.version !== live?.version &&
              (confirm === v.version ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-ink">¿Volver a esta versión?</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setResult(await adminActions.restore(v.version));
                      setBusy(false);
                      setConfirm(null);
                    }}
                    className={btnPrimary}
                  >
                    Sí, restaurar
                  </button>
                  <button type="button" onClick={() => setConfirm(null)} className={btnSecondary}>
                    Cancelar
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirm(v.version)} className={btnSecondary}>
                  Restaurar<span className="sr-only"> la versión {v.version}</span>
                </button>
              ))}
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function PublishPanel() {
  const records = useAdmin((s) => s.records);
  const live = useAdmin((s) => s.live);
  const role = useAdmin((s) => s.role);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const liveCatalog = live?.catalog ?? null;
  const validator = role === "validator";

  const pending = useMemo(
    () =>
      records
        .filter((r) => r.status === "review")
        .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.position - b.position),
    [records],
  );
  const drafts = records.filter((r) => r.status === "draft").length;
  const selected = pending.filter((r) => !excluded.has(recordKey(r)));

  const check = useMemo(() => {
    const keys = new Set(selected.map(recordKey));
    const catalog = buildCatalog(records, liveCatalog, { mode: "publish", selected: keys });
    const shape = parseCatalog(JSON.parse(JSON.stringify(catalog)));
    const shapeIssues: CatalogIssue[] = shape.ok
      ? []
      : shape.errors.slice(0, 10).map((e) => ({ severity: "error", kind: "site", id: "", message: `Formato: ${fieldLabel(e.path)} (${e.path}): ${e.message}` }));
    return [...shapeIssues, ...validateCatalog(catalog, liveCatalog)];
  }, [records, liveCatalog, selected]);
  const blocked = hasErrors(check);
  const serverIssues = result && !result.ok ? (result.issues ?? []) : [];

  const titleOf = (issue: CatalogIssue) => {
    const record = records.find((r) => r.kind === issue.kind && r.id === issue.id);
    return record ? { href: editPath(record), label: `${KIND_INFO[issue.kind].one}: ${recordTitle(record)}` } : null;
  };

  const toggle = (record: AnyRecord) =>
    setExcluded((ex) => {
      const next = new Set(ex);
      const key = recordKey(record);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  async function publish() {
    setBusy(true);
    setResult(null);
    const res = await adminActions.publish(selected, note);
    setBusy(false);
    setConfirming(false);
    setResult(res);
    if (res.ok) {
      setNote("");
      setExcluded(new Set());
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl text-ink md:text-4xl">Publicar</h1>
        <p className="max-w-2xl text-sm text-ink-muted">
          {live ? `La web muestra la versión ${live.version} (${formatDate(live.publishedAt)}).` : "La web muestra el catálogo de demostración incluido en la app."}{" "}
          Publicar crea una versión nueva con lo que elijas de la lista; el resto sigue como está en la web.
          {!validator && " Solo quien valida puede publicar."}
        </p>
      </header>

      <Section
        title={`En revisión · ${pending.length}`}
        description={drafts > 0 ? `${drafts} ${drafts === 1 ? "borrador sin enviar no se publicará" : "borradores sin enviar no se publicarán"}.` : undefined}
      >
        {pending.length === 0 ? (
          <p className="text-sm text-ink-muted">No hay nada esperando revisión.</p>
        ) : (
          <fieldset>
            <legend className="sr-only">Cambios que se publicarán</legend>
            <ul className="flex flex-col gap-2">
              {pending.map((record) => {
                const on = !excluded.has(recordKey(record));
                return (
                  <li key={recordKey(record)} className={`flex items-start gap-3 rounded-xl border p-3 ${on ? "border-ink" : "border-stone"}`}>
                    {validator && (
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(record)}
                        aria-label={`Incluir ${recordTitle(record)}`}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                      />
                    )}
                    <span className="flex min-w-0 flex-col gap-0.5 text-sm">
                      <Link href={editPath(record)} className="font-semibold text-ink underline-offset-2 hover:underline">
                        {KIND_INFO[record.kind].one}: {recordTitle(record)}
                      </Link>
                      <span className="text-xs text-ink-muted">
                        {changeLabel(record, liveCatalog)} · {formatDate(record.updatedAt)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}
      </Section>

      {pending.length > 0 && (
        <Section
          title="Comprobación"
          description={selected.length === 0 ? "Elige al menos un cambio." : `Así quedaría la web con ${selected.length} ${selected.length === 1 ? "cambio" : "cambios"}.`}
        >
          {blocked ? (
            <p className="text-sm font-semibold text-danger">Hay errores que impiden publicar.</p>
          ) : (
            <p className="text-sm font-semibold text-ok">
              ✓ Sin errores: se puede publicar.{check.length > 0 ? " Revisa los avisos." : ""}
            </p>
          )}
          <IssueList issues={check} linkFor={titleOf} />
          {validator && (
            <div className="flex flex-col gap-3 border-t border-stone pt-4">
              <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
                Qué cambia (opcional)
                <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="p. ej. Nuevas fichas de Guarrazar" />
              </label>
              {confirming ? (
                <div className="flex flex-col gap-2 rounded-xl border border-stone p-3">
                  <p className="text-sm text-ink">¿Publicar ahora? Los visitantes verán estos cambios en su próxima visita.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void publish()} className={btnPrimary}>
                      {busy ? "Publicando…" : "Sí, publicar"}
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} className={btnSecondary}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" disabled={blocked || selected.length === 0} onClick={() => setConfirming(true)} className={`${btnPrimary} self-start`}>
                  Publicar {selected.length} {selected.length === 1 ? "cambio" : "cambios"}
                </button>
              )}
              {blocked && <p className="text-sm text-danger">Corrige los errores (o quita de la selección lo que los causa) para publicar.</p>}
            </div>
          )}
          <ResultMessage result={result} />
          <IssueList issues={serverIssues} linkFor={titleOf} />
        </Section>
      )}

      {pending.length === 0 && <ResultMessage result={result} />}
      <History />
    </div>
  );
}

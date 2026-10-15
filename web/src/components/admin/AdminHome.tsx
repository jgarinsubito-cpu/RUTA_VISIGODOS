"use client";
/** Admin home: what the web shows, what is waiting, and the first import into an empty store. */
import Link from "next/link";
import { useState } from "react";
import type { AnyRecord } from "@/domain/editorial/records";
import type { RecordKind } from "@/domain/editorial/schema";
import { adminActions, useAdmin, type ActionResult } from "@/state/admin";
import { KIND_INFO, STATUS_LABEL, editPath, formatDate, recordTitle } from "./model";
import { ResultMessage, Section, btnPrimary, btnSecondary } from "./ui";

const LIST_KINDS: Exclude<RecordKind, "showcase">[] = ["site", "claim", "story", "route"];
const KIND_ORDER: RecordKind[] = ["showcase", ...LIST_KINDS];

function ImportDemo() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <Section
      title="Empezar con el catálogo de demostración"
      description="El gestor está vacío. Importa los lugares, fichas, relatos y rutas de demostración que trae la app: quedarán en revisión hasta que los publiques."
    >
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setResult(await adminActions.importDemo());
          setBusy(false);
        }}
        className={`${btnPrimary} self-start`}
      >
        {busy ? "Importando…" : "Importar el catálogo de demostración"}
      </button>
      <ResultMessage result={result} />
    </Section>
  );
}

function Counts({ records }: { records: AnyRecord[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {LIST_KINDS.map((kind) => {
        const own = records.filter((r) => r.kind === kind);
        const by = (status: AnyRecord["status"]) => own.filter((r) => r.status === status).length;
        return (
          <li key={kind}>
            <Link
              href={KIND_INFO[kind].path}
              className="flex h-full flex-col gap-1 rounded-2xl border border-stone bg-surface p-4 transition-colors hover:border-ink"
            >
              <span className="font-display text-xl text-ink">
                {KIND_INFO[kind].many} <span className="font-sans text-sm text-ink-muted">· {own.length}</span>
              </span>
              <span className="text-sm text-ink-muted">
                {by("published")} {STATUS_LABEL.published.toLowerCase()}s · {by("review")} en revisión · {by("draft")} {by("draft") === 1 ? "borrador" : "borradores"}
                {by("retired") > 0 ? ` · ${by("retired")} retirados` : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminHome() {
  const records = useAdmin((s) => s.records);
  const live = useAdmin((s) => s.live);
  const role = useAdmin((s) => s.role);
  const error = useAdmin((s) => s.error);
  const inReview = records
    .filter((r) => r.status === "review")
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.position - b.position);
  const returned = records.filter((r) => r.status === "draft" && r.reviewNote);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl text-ink md:text-4xl">Resumen</h1>
        <p className="max-w-2xl text-sm text-ink-muted">
          Aquí se preparan los lugares, fichas, relatos y rutas que ven los visitantes y que usa el asistente. Nada llega a la web
          hasta que alguien con permiso de validación lo publica.
        </p>
      </header>

      {error && <p className="rounded-xl border border-danger/40 p-3 text-sm text-danger">{error}</p>}

      <section aria-labelledby="home-live" className="flex flex-col gap-1 rounded-2xl border border-stone bg-surface p-4 md:p-5">
        <h2 id="home-live" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          En la web ahora
        </h2>
        {live ? (
          <p className="text-base text-ink">
            Versión {live.version}, publicada el {formatDate(live.publishedAt)}
            {live.note ? ` · «${live.note}»` : ""}
          </p>
        ) : (
          <p className="text-base text-ink">El catálogo de demostración incluido en la app: aún no se ha publicado nada desde el gestor.</p>
        )}
      </section>

      {records.length === 0 &&
        (role === "validator" ? (
          <ImportDemo />
        ) : (
          <p className="rounded-2xl border border-stone bg-surface p-4 text-sm text-ink-muted">
            El gestor está vacío. Quien valida puede importar el catálogo de demostración; también puedes crear el primer lugar.
          </p>
        ))}

      <Counts records={records} />

      {inReview.length > 0 && (
        <Section title={`Pendiente de revisión · ${inReview.length}`}>
          <ul className="flex flex-col divide-y divide-stone">
            {inReview.slice(0, 8).map((r) => (
              <li key={`${r.kind}:${r.id}`} className="py-2">
                <Link href={editPath(r)} className="flex min-h-11 flex-col justify-center text-sm text-ink hover:underline">
                  <span>{recordTitle(r)}</span>
                  <span className="text-xs text-ink-muted">
                    {KIND_INFO[r.kind].one}
                    {r.retire ? " · pide retirada" : ""} · {formatDate(r.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/admin/publicar" className={`${role === "validator" ? btnPrimary : btnSecondary} self-start`}>
            {role === "validator" ? "Revisar y publicar" : "Ver lo pendiente"}
          </Link>
        </Section>
      )}

      {returned.length > 0 && (
        <Section title="Devueltos con nota" description="Quien valida los ha devuelto a borrador con un comentario.">
          <ul className="flex flex-col gap-2">
            {returned.map((r) => (
              <li key={`${r.kind}:${r.id}`} className="rounded-xl border border-stone p-3 text-sm">
                <Link href={editPath(r)} className="font-semibold text-ink underline underline-offset-2">
                  {recordTitle(r)}
                </Link>
                <p className="mt-1 text-ink-muted">«{r.reviewNote}»</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

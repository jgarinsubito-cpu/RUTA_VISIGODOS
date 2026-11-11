"use client";
/**
 * Edit one record: its form, what the catalog rules say about it (checked against every working
 * copy as you type), and the workflow — save a draft, send to review, withdraw, return with a note
 * (validators), propose retirement, delete a never-published draft.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { demoCatalog } from "@/data/content";
import { SHOWCASE_ID, liveData, newRecordId, sameData, type AnyRecord } from "@/domain/editorial/records";
import type { FieldError, RecordDataByKind, RecordKind } from "@/domain/editorial/schema";
import { validateCatalog } from "@/domain/editorial/validate";
import type { Catalog } from "@/domain/types";
import { IconChevronLeft } from "@/components/shell/icons";
import { adminActions, normalizeMatchWords, useAdmin, type ActionResult } from "@/state/admin";
import { KIND_INFO, editPath, fieldLabel, formatDate, previewCatalog, recordTitle } from "./model";
import { ErrorsProvider, IssueList, ResultMessage, StatusBadge, btnDanger, btnPrimary, btnSecondary, inputClass } from "./ui";
import { ClaimForm } from "./forms/ClaimForm";
import { RouteForm } from "./forms/RouteForm";
import { StopForm } from "./forms/StopForm";
import { ServiceForm } from "./forms/ServiceForm";
import { PieceForm } from "./forms/PieceForm";
import { ShowcaseForm } from "./forms/ShowcaseForm";
import { SiteForm } from "./forms/SiteForm";
import { StoryForm } from "./forms/StoryForm";
import type { FormProps } from "./forms/shared";

type Data = RecordDataByKind[RecordKind];

function emptyData(kind: RecordKind, catalog: Catalog, siteId: string | undefined): Data {
  switch (kind) {
    case "site":
      return {
        id: "",
        slug: "",
        name: "",
        locality: catalog.showcase.localities[0] ?? "",
        kind: "monument",
        visigothic: true,
        tagline: "",
        summary: "",
        coordinates: { lat: Number.NaN, lng: Number.NaN, approximate: true },
        visitMinutes: 30,
        hours: { status: "unknown" },
        access: { status: "unknown" },
        themes: [],
        imageTone: "stone",
        demo: true,
      };
    case "stop":
      return { id: "", siteId: siteId ?? "", order: 1, name: "", gallery: [] };
    case "piece":
      return {
        id: "",
        slug: "",
        name: "",
        museum: { name: "" },
        ...(siteId ? { originSiteId: siteId } : {}),
        provenance: "",
        material: "",
        date: "",
        description: "",
        images: [],
        claimIds: [],
        demo: false,
      };
    case "service":
      return {
        id: "",
        slug: "",
        name: "",
        category: "restaurant",
        locality: catalog.showcase.localities[0] ?? "",
        coordinates: { lat: Number.NaN, lng: Number.NaN, approximate: true },
        summary: "",
        hours: { status: "unknown" },
        access: { status: "unknown" },
        contact: {},
        reservable: false,
        siteIds: siteId ? [siteId] : [],
        partner: false,
        checkedOn: null,
        demo: false,
      };
    case "claim":
      return { id: "", siteId: siteId ?? "", text: "", evidence: "D", source: { title: "" }, keywords: [] };
    case "story":
      return { id: "", siteId: siteId ?? "", title: "", body: "", claimIds: [], audience: "general", minutes: 2 };
    case "route":
      return { id: "", slug: "", name: "", theme: "", summary: "", stopIds: [], transport: "walk", limitations: [], demo: true };
    default:
      return JSON.parse(JSON.stringify(catalog.showcase)) as Data;
  }
}

/** The id a new record will get: from its web address (places, routes), text or title. */
function provisionalId(kind: RecordKind, data: Data, taken: ReadonlySet<string>): string {
  switch (kind) {
    case "site":
    case "piece":
    case "service":
    case "route": {
      const slug = (data as { slug: string }).slug;
      return slug ? newRecordId(kind, slug, taken) : "";
    }
    case "stop": {
      const d = data as RecordDataByKind["stop"];
      return d.name.trim() ? newRecordId("stop", `${d.siteId.replace(/^site-/, "")} ${d.name}`, taken) : "";
    }
    case "claim": {
      const text = (data as RecordDataByKind["claim"]).text;
      return text.trim() ? newRecordId("claim", text, taken) : "";
    }
    case "story": {
      const title = (data as RecordDataByKind["story"]).title;
      return title.trim() ? newRecordId("story", title, taken) : "";
    }
    default:
      return SHOWCASE_ID;
  }
}

function stub(kind: RecordKind, id: string, data: Data): AnyRecord {
  return { kind, id, data, status: "draft", retire: false, position: Number.MAX_SAFE_INTEGER, rev: 0, reviewNote: null, firstPublishedAt: null, updatedAt: "" } as AnyRecord;
}

function withId(kind: RecordKind, data: Data, id: string): Data {
  return kind === "showcase" ? data : ({ ...data, id } as Data);
}

export function RecordEditor({ kind, id, prefillSiteId }: { kind: RecordKind; id: string; prefillSiteId?: string }) {
  const records = useAdmin((s) => s.records);
  const live = useAdmin((s) => s.live);
  const [result, setResult] = useState<ActionResult | null>(null);
  // Set after creating a record, so the page keeps editing it (and never inserts it twice).
  const [createdId, setCreatedId] = useState<string | null>(null);
  // "Recuperar la versión publicada": new starting data for the form, for this rev only.
  const [seed, setSeed] = useState<{ data: Data; rev: number; n: number } | null>(null);

  const recordId = kind === "showcase" ? SHOWCASE_ID : (createdId ?? id);
  const existing = records.find((r) => r.kind === kind && r.id === recordId) ?? null;
  const isNew = !existing && (kind === "showcase" || recordId === "nuevo");
  const info = KIND_INFO[kind];

  if (!existing && !isNew) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-3xl text-ink">No existe</h1>
        <p className="text-sm text-ink-muted">No hay {info.one.toLowerCase()} con el identificador «{recordId}».</p>
        <Link href={info.path} className={`${btnSecondary} self-start`}>
          Volver a {info.many.toLowerCase()}
        </Link>
      </div>
    );
  }

  const activeSeed = seed && seed.rev === (existing?.rev ?? 0) ? seed : null;
  // Defaults for a new record; an empty content store starts from the demo's home page settings.
  const working = previewCatalog(records, live?.catalog ?? null);
  const defaults = working.showcase.localities.length > 0 ? working : demoCatalog();
  const initial = activeSeed?.data ?? existing?.data ?? emptyData(kind, defaults, prefillSiteId);

  return (
    <EditorBody
      key={`${existing ? existing.rev : "new"}:${activeSeed?.n ?? 0}`}
      kind={kind}
      existing={existing}
      initial={initial}
      seeded={activeSeed !== null}
      result={result}
      onResult={setResult}
      onCreated={(newId) => {
        setCreatedId(newId);
        if (kind !== "showcase") window.history.replaceState(null, "", editPath({ kind, id: newId }));
      }}
      onReplace={(data) => setSeed({ data, rev: existing?.rev ?? 0, n: (seed?.n ?? 0) + 1 })}
    />
  );
}

function EditorBody({
  kind,
  existing,
  initial,
  seeded,
  result,
  onResult,
  onCreated,
  onReplace,
}: {
  kind: RecordKind;
  existing: AnyRecord | null;
  initial: Data;
  seeded: boolean;
  result: ActionResult | null;
  onResult: (r: ActionResult | null) => void;
  onCreated: (id: string) => void;
  onReplace: (data: Data) => void;
}) {
  const router = useRouter();
  const records = useAdmin((s) => s.records);
  const live = useAdmin((s) => s.live);
  const role = useAdmin((s) => s.role);
  const team = useAdmin((s) => s.team);
  const [data, setData] = useState<Data>(initial);
  const [dirty, setDirty] = useState(seeded);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"retire" | "remove" | "return" | null>(null);
  const [note, setNote] = useState("");
  const summaryRef = useRef<HTMLDivElement>(null);
  const info = KIND_INFO[kind];

  const isNew = existing === null;
  const locked = Boolean(existing?.firstPublishedAt);
  const taken = useMemo(() => new Set(records.filter((r) => r.kind === kind).map((r) => r.id)), [records, kind]);
  const recordId = existing?.id ?? provisionalId(kind, data, taken);
  const liveCatalog = live?.catalog ?? null;
  const catalog = useMemo(() => previewCatalog(records, liveCatalog), [records, liveCatalog]);

  // What the publication rules say about this record, with the form's current content.
  const deferred = useDeferredValue(data);
  const issues = useMemo(() => {
    if (!recordId) return [];
    // As it will be saved: aliases and keywords lowercased and accent-free.
    const saved = normalizeMatchWords(kind, withId(kind, deferred, recordId));
    const candidate = { ...(existing ?? stub(kind, recordId, deferred)), data: saved } as AnyRecord;
    return validateCatalog(previewCatalog(records, liveCatalog, candidate), liveCatalog).filter((i) => i.kind === kind && i.id === recordId);
  }, [deferred, existing, kind, recordId, records, liveCatalog]);

  const onWeb = liveData(liveCatalog, kind, recordId);
  const differsFromWeb = onWeb !== undefined && !sameData(onWeb, withId(kind, data, recordId));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (patch: Partial<Data>) => {
    setData((d) => ({ ...d, ...patch }) as Data);
    setDirty(true);
  };

  async function run(action: () => Promise<ActionResult>) {
    setBusy(true);
    onResult(null);
    const res = await action();
    setBusy(false);
    onResult(res);
    setConfirm(null);
    return res;
  }

  async function save(submit: boolean) {
    if (!recordId) {
      const path = kind === "claim" ? "text" : kind === "story" ? "title" : "name";
      setErrors([{ path, message: "Obligatorio" }]);
      onResult({ ok: false, message: "Revisa los campos marcados." });
      summaryRef.current?.focus();
      return;
    }
    const res = await run(() => adminActions.save(kind, recordId, withId(kind, data, recordId), { submit, existing }));
    if (res.ok) {
      setErrors([]);
      setDirty(false);
      if (isNew) onCreated(recordId);
    } else if (!res.ok && res.fieldErrors) {
      setErrors(res.fieldErrors);
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  const errorMap = useMemo(() => new Map(errors.map((e) => [e.path, e.message])), [errors]);
  const formProps = { data, set, catalog, records, isNew, locked, recordId: recordId || "nuevo" };
  const title = isNew ? (kind === "showcase" ? info.one : info.newLabel) : recordTitle({ kind, data });
  const updatedBy = existing?.updatedBy ? team[existing.updatedBy] : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        {kind !== "showcase" && (
          <Link href={info.path} className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-ink-muted hover:text-ink">
            <IconChevronLeft width={16} />
            {info.many}
          </Link>
        )}
        <p className="text-2xs font-semibold uppercase tracking-wider text-accent">{info.one}</p>
        <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">{title}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          {existing ? <StatusBadge status={existing.status} retire={existing.retire} live={onWeb !== undefined} /> : <span>Sin guardar</span>}
          <span>{onWeb !== undefined ? "Está en la web" : "No está en la web"}</span>
          {existing && (
            <span>
              Último cambio: {formatDate(existing.updatedAt)}
              {updatedBy ? ` · ${updatedBy}` : ""}
            </span>
          )}
          {recordId && <span className="font-mono text-xs">{recordId}</span>}
        </div>
      </header>

      {existing?.status === "draft" && existing.reviewNote && (
        <p className="rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm text-ink">
          <span className="font-semibold">Nota de revisión:</span> {existing.reviewNote}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <div ref={summaryRef} tabIndex={-1} className="focus:outline-none">
            {errors.length > 0 && (
              <div className="flex flex-col gap-1 rounded-xl border border-danger/40 p-3 text-sm">
                <p className="font-semibold text-danger">Hay {errors.length === 1 ? "un campo" : `${errors.length} campos`} por revisar:</p>
                <ul className="list-disc pl-5 text-ink">
                  {errors.slice(0, 12).map((e, i) => (
                    <li key={`${e.path}-${i}`}>
                      {fieldLabel(e.path)}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <ErrorsProvider errors={errorMap}>
            {kind === "site" && <SiteForm {...(formProps as FormProps<"site">)} />}
            {kind === "stop" && <StopForm {...(formProps as FormProps<"stop">)} />}
            {kind === "service" && <ServiceForm {...(formProps as FormProps<"service">)} />}
            {kind === "piece" && <PieceForm {...(formProps as FormProps<"piece">)} />}
            {kind === "claim" && (
              <ClaimForm
                {...(formProps as FormProps<"claim">)}
                liveVersion={liveCatalog?.claims.find((c) => c.id === recordId)?.version ?? null}
              />
            )}
            {kind === "story" && <StoryForm {...(formProps as FormProps<"story">)} />}
            {kind === "route" && <RouteForm {...(formProps as FormProps<"route">)} />}
            {kind === "showcase" && <ShowcaseForm {...(formProps as FormProps<"showcase">)} />}
          </ErrorsProvider>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6" aria-label="Guardar y revisión">
          <section className="flex flex-col gap-3 rounded-2xl border border-stone bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink">Guardar</h2>
            <p className="text-xs text-ink-muted">
              {dirty ? "Tienes cambios sin guardar." : "Sin cambios pendientes."} Nada llega a la web hasta que se publica.
            </p>
            <button type="button" disabled={busy} onClick={() => void save(true)} className={btnPrimary}>
              Enviar a revisión
            </button>
            <button type="button" disabled={busy} onClick={() => void save(false)} className={btnSecondary}>
              Guardar borrador
            </button>
            {differsFromWeb && onWeb !== undefined && (
              <button type="button" disabled={busy} onClick={() => onReplace(onWeb as Data)} className={btnSecondary}>
                Recuperar la versión publicada
              </button>
            )}
            {existing?.status === "review" && !dirty && (
              <button type="button" disabled={busy} onClick={() => void run(() => adminActions.setStatus(existing, "draft"))} className={btnSecondary}>
                {existing.retire ? "Cancelar la retirada" : "Retirar de la revisión"}
              </button>
            )}
            {existing?.status === "draft" && !dirty && (
              <p className="text-xs text-ink-muted">Al enviarlo, quien valida lo verá en «Publicar».</p>
            )}
            <ResultMessage result={result} />
          </section>

          {existing && (role === "validator" || kind !== "showcase") && (
            <section className="flex flex-col gap-3 rounded-2xl border border-stone bg-surface p-4">
              <h2 className="text-sm font-semibold text-ink">Más acciones</h2>
              {role === "validator" && existing.status === "review" && (
                confirm === "return" ? (
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
                      Nota para quien lo editó
                      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} className={`${inputClass} py-2`} />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busy || !note.trim()} onClick={() => void run(() => adminActions.setStatus(existing, "draft", note.trim()))} className={btnPrimary}>
                        Devolver a borrador
                      </button>
                      <button type="button" onClick={() => setConfirm(null)} className={btnSecondary}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirm("return")} className={btnSecondary}>
                    Devolver con una nota
                  </button>
                )
              )}
              {kind !== "showcase" && onWeb !== undefined && !(existing.status === "review" && existing.retire) && (
                confirm === "retire" ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-danger/40 p-3">
                    <p className="text-sm text-ink">
                      ¿Pedir que se retire de la web? Quien valida decidirá al publicar. Lo que dependa de él (rutas, relatos) tendrá que cambiar antes.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={busy} onClick={() => void run(() => adminActions.proposeRetire(existing))} className={btnDanger}>
                        Sí, proponer retirada
                      </button>
                      <button type="button" onClick={() => setConfirm(null)} className={btnSecondary}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirm("retire")} className={btnDanger}>
                    Proponer retirada de la web
                  </button>
                )
              )}
              {kind !== "showcase" && !existing.firstPublishedAt && (
                confirm === "remove" ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-danger/40 p-3">
                    <p className="text-sm text-ink">¿Eliminar este borrador? Nunca se ha publicado. No se puede deshacer.</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          const res = await run(() => adminActions.remove(existing));
                          if (res.ok) router.push(info.path);
                        }}
                        className={btnDanger}
                      >
                        Sí, eliminar
                      </button>
                      <button type="button" onClick={() => setConfirm(null)} className={btnSecondary}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirm("remove")} className={btnDanger}>
                    Eliminar borrador
                  </button>
                )
              )}
            </section>
          )}

          <section className="flex flex-col gap-2 rounded-2xl border border-stone bg-surface p-4" aria-live="polite">
            <h2 className="text-sm font-semibold text-ink">Reglas de publicación</h2>
            {issues.length === 0 ? (
              <p className="text-sm text-ink-muted">{recordId ? "Todo correcto con los borradores actuales." : "Escribe el contenido para comprobarlo."}</p>
            ) : (
              <IssueList issues={issues} />
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

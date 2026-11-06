"use client";
/** List of one kind of record: search, status filter, order (places and routes) and "new". */
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AnyRecord, RecordStatus } from "@/domain/editorial/records";
import type { RecordDataByKind, RecordKind } from "@/domain/editorial/schema";
import { KIND_LABEL, SERVICE_CATEGORY_LABEL, TRANSPORT_LABEL } from "@/lib/labels";
import { EVIDENCE_LABEL } from "@/components/shared/EvidenceBadge";
import { IconChevronDown, IconPlus } from "@/components/shell/icons";
import { adminActions, useAdmin, type ActionResult } from "@/state/admin";
import { liveData } from "@/domain/editorial/records";
import { KIND_INFO, STATUS_LABEL, editPath, formatDate, recordTitle } from "./model";
import { ResultMessage, StatusBadge, btnPrimary, inputClass } from "./ui";

type ListKind = Exclude<RecordKind, "showcase">;

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function detail(record: AnyRecord, siteName: (id: string) => string): string {
  switch (record.kind) {
    case "site": {
      const d = record.data as RecordDataByKind["site"];
      return [d.locality, KIND_LABEL[d.kind], d.visigothic ? "Visigodo" : "Patrimonio no visigodo"].filter(Boolean).join(" · ");
    }
    case "stop": {
      const d = record.data as RecordDataByKind["stop"];
      return [`${siteName(d.siteId)} · parada ${d.order}`, d.audio ? "con audio" : "sin audio", `${d.gallery.length} ${d.gallery.length === 1 ? "imagen" : "imágenes"}`].join(" · ");
    }
    case "service": {
      const d = record.data as RecordDataByKind["service"];
      return [SERVICE_CATEGORY_LABEL[d.category], d.locality, d.demo ? "Ejemplo" : d.partner ? "Adherida" : "Sin adhesión", d.checkedOn ? `comprobado ${d.checkedOn}` : "sin comprobar"].join(" · ");
    }
    case "claim": {
      const d = record.data as RecordDataByKind["claim"];
      return `${EVIDENCE_LABEL[d.evidence]} · ${siteName(d.siteId)}`;
    }
    case "story": {
      const d = record.data as RecordDataByKind["story"];
      return `${siteName(d.siteId)} · ${d.claimIds.length} ${d.claimIds.length === 1 ? "ficha" : "fichas"}`;
    }
    case "route": {
      const d = record.data as RecordDataByKind["route"];
      return `${TRANSPORT_LABEL[d.transport]} · ${d.stopIds.length} paradas`;
    }
    default:
      return "";
  }
}

export function RecordList({ kind }: { kind: ListKind }) {
  const all = useAdmin((s) => s.records);
  const live = useAdmin((s) => s.live);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RecordStatus | "all">("all");
  const [place, setPlace] = useState("all");
  const [result, setResult] = useState<ActionResult | null>(null);
  const info = KIND_INFO[kind];
  const ordered = kind === "site" || kind === "route";

  const sites = useMemo(() => all.filter((r) => r.kind === "site"), [all]);
  const siteName = (id: string) => {
    const site = sites.find((s) => s.id === id);
    return site ? recordTitle(site) : id;
  };
  const records = useMemo(
    () => all.filter((r) => r.kind === kind).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
    [all, kind],
  );
  const shown = records.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (place !== "all" && (r.data as { siteId?: string }).siteId !== place) return false;
    const q = fold(query.trim());
    return !q || fold(`${recordTitle(r)} ${r.id}`).includes(q);
  });
  const filtered = shown.length !== records.length;

  async function move(record: AnyRecord, direction: -1 | 1) {
    setResult(await adminActions.move(record, direction));
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl text-ink md:text-4xl">
            {info.many} <span className="font-sans text-base text-ink-muted">· {records.length}</span>
          </h1>
          {ordered && <p className="text-sm text-ink-muted">El orden de la lista es el de la web; los cambios de orden se aplican al publicar.</p>}
        </div>
        <Link href={`${info.path}/nuevo`} className={btnPrimary}>
          <IconPlus width={16} />
          {info.newLabel}
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem] md:grid-cols-[minmax(0,1fr)_12rem_14rem]">
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Buscar
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Estado
          <select value={status} onChange={(e) => setStatus(e.target.value as RecordStatus | "all")} className={inputClass}>
            <option value="all">Todos</option>
            {(Object.keys(STATUS_LABEL) as RecordStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        {(kind === "claim" || kind === "story" || kind === "stop") && (
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            Lugar
            <select value={place} onChange={(e) => setPlace(e.target.value)} className={inputClass}>
              <option value="all">Todos los lugares</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {recordTitle(s)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {filtered ? `${shown.length} de ${records.length}` : ""}
      </p>
      <ResultMessage result={result} />

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-stone bg-surface p-6 text-center text-sm text-ink-muted">
          {records.length === 0 ? `Aún no hay ${info.many.toLowerCase()}.` : "Nada coincide con la búsqueda."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-stone rounded-2xl border border-stone bg-surface">
          {shown.map((record, i) => {
            const onWeb = liveData(live?.catalog ?? null, record.kind, record.id) !== undefined;
            return (
              <li key={record.id} className="flex items-center gap-2 px-3 py-2 md:px-4">
                <Link href={editPath(record)} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-0.5 py-1">
                  <span className="truncate text-sm font-semibold text-ink">{recordTitle(record)}</span>
                  <span className="truncate text-xs text-ink-muted">{detail(record, siteName)}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                    <StatusBadge status={record.status} retire={record.retire} live={onWeb} />
                    <span>{formatDate(record.updatedAt)}</span>
                  </span>
                </Link>
                {ordered && !filtered && (
                  <span className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => void move(record, -1)}
                      aria-label={`Subir ${recordTitle(record)}`}
                      className="grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-30"
                    >
                      <IconChevronDown width={18} className="rotate-180" />
                    </button>
                    <button
                      type="button"
                      disabled={i === shown.length - 1}
                      onClick={() => void move(record, 1)}
                      aria-label={`Bajar ${recordTitle(record)}`}
                      className="grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-30"
                    >
                      <IconChevronDown width={18} />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use client";
/** Claim form: the place, the statement, its evidence level (and attribution) and its source. */
import Link from "next/link";
import { useId } from "react";
import type { EvidenceLevel } from "@/domain/types";
import { EVIDENCE_DESCRIPTION, EVIDENCE_LABEL } from "@/components/shared/EvidenceBadge";
import { KIND_INFO, recordTitle } from "../model";
import { LinesField, Section, SelectField, TextField } from "../ui";
import type { FormProps } from "./shared";

const LEVELS: EvidenceLevel[] = ["D", "I", "H", "T"];

export function ClaimForm({ data, set, catalog, records, recordId, locked, liveVersion }: FormProps<"claim"> & { liveVersion: number | null }) {
  const groupId = useId();
  const stories = records.filter((r) => r.kind === "story" && (r.data as { claimIds: string[] }).claimIds.includes(recordId));
  return (
    <>
      <Section
        title="Ficha"
        description="Una afirmación con su nivel de evidencia y su fuente. Es lo único que el asistente puede contar como historia."
      >
        {locked && (
          <p className="rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm text-ink">
            Esta ficha ya se ha publicado{liveVersion ? ` (versión ${liveVersion})` : ""}. Corrige erratas o la fuente aquí: se publicará como una
            versión nueva. Si cambia lo que afirma, crea una ficha nueva y propón retirar esta.
          </p>
        )}
        <SelectField
          label="Lugar"
          value={data.siteId}
          path="siteId"
          options={catalog.sites.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(siteId) => set({ siteId })}
        />
        <TextField
          label="Afirmación"
          multiline
          rows={3}
          value={data.text}
          path="text"
          hint="Una sola idea, redactada para que sea cierta en su nivel de evidencia."
          onChange={(text) => set({ text: text ?? "" })}
        />
        <fieldset className="flex flex-col gap-2" aria-describedby={`${groupId}-hint`}>
          <legend className="text-sm font-semibold text-ink">Nivel de evidencia</legend>
          <p id={`${groupId}-hint`} className="text-xs text-ink-muted">
            El asistente lo dice al citarla («Está documentado que…», «Según…», «Una hipótesis plantea…», «Según la tradición…»).
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {LEVELS.map((level) => (
              <label
                key={level}
                className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                  data.evidence === level ? "border-ink" : "border-stone"
                }`}
              >
                <input
                  type="radio"
                  name={`${groupId}-evidence`}
                  checked={data.evidence === level}
                  onChange={() => set({ evidence: level })}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                />
                <span className="flex flex-col">
                  <span className="font-semibold text-ink">
                    {level} · {EVIDENCE_LABEL[level]}
                  </span>
                  <span className="text-xs text-ink-muted">{EVIDENCE_DESCRIPTION[level]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <TextField
          label="Atribución"
          optional={data.evidence !== "I"}
          value={data.attribution}
          path="attribution"
          hint={data.evidence === "I" ? "Obligatoria en una interpretación: de quién es." : "Solo para interpretaciones."}
          onChange={(attribution) => set({ attribution: attribution?.trim() ? attribution : undefined })}
        />
      </Section>

      <Section title="Fuente">
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_8rem]">
          <TextField label="Título" value={data.source.title} path="source.title" onChange={(title) => set({ source: { ...data.source, title: title ?? "" } })} />
          <TextField label="Página" optional value={data.source.page} path="source.page" onChange={(page) => set({ source: { ...data.source, page } })} />
        </div>
        <TextField label="Enlace" optional type="url" value={data.source.url} path="source.url" onChange={(url) => set({ source: { ...data.source, url } })} />
      </Section>

      <Section title="Búsqueda">
        <LinesField
          label="Palabras clave"
          value={data.keywords}
          path="keywords"
          hint="Palabras con las que el asistente encuentra esta ficha (una por línea; se guardan sin tildes)."
          onChange={(keywords) => set({ keywords: keywords ?? [] })}
        />
        {stories.length > 0 && (
          <p className="text-sm text-ink-muted">
            La usan:{" "}
            {stories.map((s, i) => (
              <span key={s.id}>
                {i > 0 ? ", " : ""}
                <Link href={`${KIND_INFO.story.path}/${s.id}`} className="underline underline-offset-2">
                  {recordTitle(s)}
                </Link>
              </span>
            ))}
          </p>
        )}
      </Section>
    </>
  );
}

"use client";
/** Story form: a short narrative that may only tell what its chosen claims support. */
import type { Story } from "@/domain/types";
import { EVIDENCE_LABEL } from "@/components/shared/EvidenceBadge";
import type { RecordDataByKind } from "@/domain/editorial/schema";
import { NumberField, Section, SelectField, StatusBadge, TextField } from "../ui";
import type { FormProps } from "./shared";

const AUDIENCE_LABEL: Record<Story["audience"], string> = { general: "General", family: "Familias", expert: "Especialistas" };

export function StoryForm({ data, set, catalog, records }: FormProps<"story">) {
  const claims = records.filter((r) => r.kind === "claim" && (r.data as RecordDataByKind["claim"]).siteId === data.siteId);
  const stops = (catalog.stops ?? []).filter((s) => s.siteId === data.siteId).sort((a, b) => a.order - b.order);
  return (
    <>
      <Section title="Relato" description="Un texto breve para leer o escuchar en el lugar.">
        <SelectField
          label="Lugar"
          value={data.siteId}
          path="siteId"
          options={catalog.sites.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(siteId) => set({ siteId, claimIds: [], stopId: undefined })}
        />
        {stops.length > 0 && (
          <SelectField
            label="Parada"
            value={data.stopId ?? ""}
            path="stopId"
            options={[{ value: "", label: "El lugar en general" }, ...stops.map((s) => ({ value: s.id, label: `${s.order}. ${s.name}` }))]}
            onChange={(stopId) => set({ stopId: stopId || undefined })}
          />
        )}
        <TextField label="Título" value={data.title} path="title" onChange={(title) => set({ title: title ?? "" })} />
        <TextField
          label="Texto"
          multiline
          rows={6}
          value={data.body}
          path="body"
          hint="Solo puede contar lo que dicen las fichas elegidas abajo."
          onChange={(body) => set({ body: body ?? "" })}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField<Story["audience"]>
            label="Público"
            value={data.audience}
            path="audience"
            options={(Object.keys(AUDIENCE_LABEL) as Story["audience"][]).map((a) => ({ value: a, label: AUDIENCE_LABEL[a] }))}
            onChange={(audience) => set({ audience })}
          />
          <NumberField label="Minutos de lectura" value={data.minutes} path="minutes" onChange={(minutes) => set({ minutes })} />
        </div>
      </Section>

      <Section title="Fichas en las que se basa" description="Deben estar publicadas cuando se publique el relato.">
        {claims.length === 0 ? (
          <p className="text-sm text-ink-muted">{data.siteId ? "Este lugar aún no tiene fichas." : "Elige primero el lugar."}</p>
        ) : (
          <fieldset>
            <legend className="sr-only">Fichas</legend>
            <ul className="flex flex-col gap-2">
              {claims.map((claim) => {
                const d = claim.data as RecordDataByKind["claim"];
                const on = data.claimIds.includes(claim.id);
                return (
                  <li key={claim.id}>
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${on ? "border-ink" : "border-stone"}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => set({ claimIds: e.target.checked ? [...data.claimIds, claim.id] : data.claimIds.filter((id) => id !== claim.id) })}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                      />
                      <span className="flex flex-col gap-1">
                        <span className="text-ink">{d.text}</span>
                        <span className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                          {EVIDENCE_LABEL[d.evidence]} <StatusBadge status={claim.status} retire={claim.retire} />
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}
      </Section>
    </>
  );
}

"use client";
/**
 * Museum piece form: where it is, where it was found (a place and stop of the route), the label
 * transcribed as it is, the claims that speak about it and its photos. A photo is shown on the web
 * only once the museum's permission is marked as granted.
 */
import { useId, useState } from "react";
import { slugify } from "@/domain/editorial/records";
import type { PieceImage } from "@/domain/types";
import { adminActions } from "@/state/admin";
import { IconClose } from "@/components/shell/icons";
import { CheckField, Section, SelectField, TextField, btnSecondary } from "../ui";
import type { FormProps } from "./shared";

const iconButton = "grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted disabled:opacity-30";

function ImagesEditor({ images, onChange }: { images: PieceImage[]; onChange: (v: PieceImage[]) => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileId = useId();
  const patch = (i: number, p: Partial<PieceImage>) => onChange(images.map((im, j) => (j === i ? { ...im, ...p } : im)));

  async function upload(file: File) {
    setBusy(true);
    setMessage("Subiendo la foto…");
    const result = await adminActions.uploadImage(file);
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    onChange([...images, { src: result.src, width: result.width, height: result.height, alt: "", credit: "", permission: "pending" }]);
    setMessage("Foto añadida. Completa el texto alternativo y el crédito, y marca el permiso cuando el museo lo conceda.");
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {images.map((im, i) => (
          <li key={`${im.src}-${i}`} className="flex flex-col gap-3 rounded-xl border border-stone p-3">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of any uploaded file */}
              <img src={im.src} alt="" className="h-24 w-24 shrink-0 rounded-lg object-cover" />
              <p className="min-w-0 flex-1 text-xs text-ink-muted">{im.permission === "granted" ? "Se muestra en la web." : "No se muestra hasta que conste el permiso del museo."}</p>
              <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} aria-label={`Quitar foto ${i + 1}`} className={iconButton}>
                <IconClose width={18} />
              </button>
            </div>
            <TextField label="Texto alternativo" value={im.alt} path={`images.${i}.alt`} hint="Qué se ve, para quien no puede verlo." onChange={(alt) => patch(i, { alt: alt ?? "" })} />
            <TextField label="Crédito" value={im.credit} path={`images.${i}.credit`} placeholder="Foto: … · Museo de Santa Cruz" onChange={(credit) => patch(i, { credit: credit ?? "" })} />
            <CheckField
              label="El museo ha dado permiso para publicarla"
              checked={im.permission === "granted"}
              onChange={(on) => patch(i, { permission: on ? "granted" : "pending" })}
              hint="Y, si la pieza es de otro titular (Ministerio de Cultura, JCCM…), también el suyo cuando lo exija."
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={fileId} className={`${btnSecondary} cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
          Subir una foto
        </label>
        <input
          id={fileId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        {message && (
          <p role="status" className="text-sm text-ink-muted">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export function PieceForm({ data, set, catalog, isNew, locked }: FormProps<"piece">) {
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const sites = [...catalog.sites].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const museums = sites.filter((s) => s.kind === "museum");
  const stopsOfOrigin = (catalog.stops ?? []).filter((st) => st.siteId === data.originSiteId).sort((a, b) => a.order - b.order);
  const claimsOf = catalog.claims.filter((c) => c.siteId === data.originSiteId || c.siteId === data.museum.siteId);

  return (
    <>
      <Section title="Pieza">
        <TextField
          label="Nombre (como en la cartela)"
          value={data.name}
          path="name"
          onChange={(name) => set(slugTouched || locked ? { name: name ?? "" } : { name: name ?? "", slug: slugify(name ?? "") })}
        />
        <TextField
          label="Identificador"
          value={data.slug}
          path="slug"
          readOnly={locked}
          onChange={(slug) => {
            setSlugTouched(true);
            set({ slug: slug ?? "" });
          }}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Material" value={data.material} path="material" onChange={(material) => set({ material: material ?? "" })} />
          <TextField label="Datación" value={data.date} path="date" placeholder="Segunda mitad del siglo VII" onChange={(date) => set({ date: date ?? "" })} />
          <TextField label="Inventario" optional value={data.inventory} path="inventory" onChange={(inventory) => set({ inventory })} />
          <TextField label="Titular" optional value={data.owner} path="owner" placeholder="Ministerio de Cultura" onChange={(owner) => set({ owner })} />
        </div>
        <TextField label="Qué es y qué se ve" multiline rows={3} value={data.description} path="description" onChange={(description) => set({ description: description ?? "" })} />
        <TextField
          label="Cartela (transcripción literal)"
          optional
          multiline
          rows={5}
          value={data.labelText}
          path="labelText"
          hint="Tal como está en la sala; lo que no se lea, entre corchetes."
          onChange={(labelText) => set({ labelText })}
        />
        <CheckField label="Ejemplo (no es una pieza real)" checked={data.demo} onChange={(demo) => set({ demo })} />
      </Section>

      <Section title="Dónde está" description="El museo donde se expone hoy.">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Museo" value={data.museum.name} path="museum.name" onChange={(name) => set({ museum: { ...data.museum, name: name ?? "" } })} />
          <SelectField
            label="Lugar de la ruta"
            value={data.museum.siteId ?? ""}
            path="museum.siteId"
            options={[{ value: "", label: "Ninguno" }, ...museums.map((s) => ({ value: s.id, label: s.name }))]}
            onChange={(siteId) => set({ museum: { ...data.museum, siteId: siteId || undefined } })}
          />
          <TextField label="Sala" optional value={data.museum.room} path="museum.room" onChange={(room) => set({ museum: { ...data.museum, room } })} />
        </div>
      </Section>

      <Section title="De dónde viene" description="El lugar de la ruta donde se halló: allí la app dice «se encontró aquí; hoy está en…».">
        <TextField label="Procedencia (como en la cartela)" value={data.provenance} path="provenance" onChange={(provenance) => set({ provenance: provenance ?? "" })} />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Lugar de origen"
            value={data.originSiteId ?? ""}
            path="originSiteId"
            options={[{ value: "", label: "No es un lugar de la ruta" }, ...sites.map((s) => ({ value: s.id, label: `${s.name} (${s.locality})` }))]}
            onChange={(originSiteId) => set({ originSiteId: originSiteId || undefined, originStopId: undefined })}
          />
          {stopsOfOrigin.length > 0 && (
            <SelectField
              label="Parada"
              value={data.originStopId ?? ""}
              path="originStopId"
              options={[{ value: "", label: "El lugar en general" }, ...stopsOfOrigin.map((st) => ({ value: st.id, label: `${st.order}. ${st.name}` }))]}
              onChange={(originStopId) => set({ originStopId: originStopId || undefined })}
            />
          )}
        </div>
      </Section>

      <Section title="Afirmaciones" description="Las del lugar de origen o del museo que hablan de esta pieza. Solo las publicadas llegan a la web y al asistente.">
        {claimsOf.length === 0 ? (
          <p className="text-sm text-ink-muted">Elige primero el lugar de origen o el museo.</p>
        ) : (
          <div className="flex max-h-72 flex-col overflow-y-auto rounded-xl border border-stone p-2">
            {claimsOf.map((c) => (
              <CheckField
                key={c.id}
                label={`[${c.evidence}] ${c.text}`}
                checked={data.claimIds.includes(c.id)}
                onChange={(on) => set({ claimIds: on ? [...data.claimIds, c.id] : data.claimIds.filter((id) => id !== c.id) })}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Fotos">
        <ImagesEditor images={data.images} onChange={(images) => set({ images })} />
      </Section>
    </>
  );
}

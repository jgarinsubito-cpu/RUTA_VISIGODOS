"use client";
/** Place form: identity, texts, location, hours, access, photo, practical data and assistant words. */
import Link from "next/link";
import { useId, useState } from "react";
import { slugify } from "@/domain/editorial/records";
import type { OpeningInfo, PlaceImage, PlaceTone, SiteKind, SourceRef, TimeWindow } from "@/domain/types";
import { KIND_LABEL } from "@/lib/labels";
import { SiteImage } from "@/components/shared/SiteImage";
import { adminActions } from "@/state/admin";
import { KIND_INFO, recordTitle } from "../model";
import { CheckField, Field, LinesField, NumberField, Section, SelectField, StatusBadge, TextField, btnSecondary, inputClass } from "../ui";
import { DAY_NAMES, type FormProps } from "./shared";

const TONES: PlaceTone[] = ["ochre", "moss", "terracotta", "umber", "stone", "slate"];
const TONE_LABEL: Record<PlaceTone, string> = {
  ochre: "Ocre",
  moss: "Musgo",
  terracotta: "Terracota",
  umber: "Tierra",
  stone: "Piedra",
  slate: "Pizarra",
};
type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** "10:00-14:00, 16:00-18:00" -> windows; anything unreadable is kept so the schema reports it. */
function parseWindows(text: string): TimeWindow[] | undefined {
  const parts = text
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.map((part) => {
    const m = part.match(/^(\d{1,2}):(\d{2})\s*[-–a]\s*(\d{1,2}):(\d{2})$/);
    if (!m) return { open: part, close: "" };
    return { open: `${m[1].padStart(2, "0")}:${m[2]}`, close: `${m[3].padStart(2, "0")}:${m[4]}` };
  });
}

function windowsText(windows: TimeWindow[] | undefined): string {
  return (windows ?? []).map((w) => `${w.open}-${w.close}`).join(", ");
}

export function HoursEditor({ hours, onChange }: { hours: OpeningInfo; onChange: (h: OpeningInfo) => void }) {
  const [days, setDays] = useState(() => DAY_NAMES.map((_, i) => windowsText(hours.weekly?.[(i + 1) as Weekday])));
  const setDay = (index: number, text: string) => {
    setDays((d) => d.map((v, i) => (i === index ? text : v)));
    const weekly = { ...(hours.weekly ?? {}) };
    const windows = parseWindows(text);
    if (windows) weekly[(index + 1) as Weekday] = windows;
    else delete weekly[(index + 1) as Weekday];
    onChange({ ...hours, weekly });
  };
  return (
    <div className="flex flex-col gap-4">
      <SelectField<OpeningInfo["status"]>
        label="Estado del horario"
        value={hours.status}
        path="hours.status"
        options={[
          { value: "example", label: "De ejemplo (no verificado)" },
          { value: "verified", label: "Verificado con la fuente oficial" },
          { value: "unknown", label: "Sin datos" },
        ]}
        hint="La web dice «Horario de ejemplo (no verificado)» o «Sin verificar» salvo que esté verificado."
        onChange={(status) => onChange({ ...hours, status })}
      />
      {hours.status === "verified" && (
        <TextField
          label="Fecha de verificación"
          type="date"
          value={hours.verifiedAt}
          path="hours.verifiedAt"
          onChange={(verifiedAt) => onChange({ ...hours, verifiedAt })}
        />
      )}
      <CheckField
        label="Espacio exterior sin horario fijo"
        checked={hours.alwaysOpen === true}
        onChange={(alwaysOpen) => onChange({ ...hours, alwaysOpen: alwaysOpen || undefined })}
      />
      {hours.status !== "unknown" && !hours.alwaysOpen && (
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold text-ink">Franjas por día (vacío = cerrado)</legend>
          {DAY_NAMES.map((name, i) => (
            <Field key={name} label={name} path={`hours.weekly.${i + 1}`} hint={i === 0 ? "Por ejemplo: 10:00-14:00, 16:00-18:00" : undefined}>
              {(control) => <input {...control} value={days[i]} onChange={(e) => setDay(i, e.target.value)} className={inputClass} />}
            </Field>
          ))}
        </fieldset>
      )}
      <TextField
        label="Nota sobre el horario"
        optional
        multiline
        rows={2}
        value={hours.note}
        path="hours.note"
        hint="De dónde sale y cuándo se consultó, temporadas, festivos."
        onChange={(note) => onChange({ ...hours, note })}
      />
    </div>
  );
}

function ImageEditor({ data, set }: Pick<FormProps<"site">, "data" | "set">) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileId = useId();
  const image = data.image;
  const setImage = (patch: Partial<PlaceImage>) => set({ image: { ...(image as PlaceImage), ...patch } });

  async function upload(file: File) {
    setBusy(true);
    setMessage("Subiendo la foto…");
    const result = await adminActions.uploadImage(file);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    set({
      image: {
        alt: image?.alt ?? "",
        author: image?.author ?? "",
        license: image?.license ?? "",
        sourceUrl: image?.sourceUrl ?? "",
        ...(image?.caption ? { caption: image.caption } : {}),
        src: result.src,
        width: result.width,
        height: result.height,
      },
    });
    setMessage("Foto subida. Completa la autoría y la licencia.");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
        <SiteImage site={{ name: data.name || "este lugar", imageTone: data.imageTone, image }} aspect="aspect-[4/3]" sizes="16rem" caption />
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={fileId} className="text-sm font-semibold text-ink">
              {image ? "Cambiar la foto" : "Subir una foto"}
            </label>
            <input
              id={fileId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
              className="min-h-11 w-full min-w-0 text-sm text-ink file:mr-3 file:min-h-11 file:rounded-full file:border file:border-stone file:bg-surface file:px-4 file:text-sm file:font-semibold file:text-ink"
            />
            <p className="text-xs text-ink-muted">JPG, PNG o WebP de hasta 5 MB, con licencia libre o permiso de uso.</p>
          </div>
          <p aria-live="polite" className="min-h-5 text-sm text-ink-muted">
            {message ?? ""}
          </p>
          {image && (
            <button type="button" onClick={() => set({ image: undefined })} className={`${btnSecondary} self-start`}>
              Quitar la foto
            </button>
          )}
        </div>
      </div>
      {image && (
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Texto alternativo" value={image.alt} path="image.alt" hint="Qué se ve, para quien no puede ver la foto." onChange={(alt) => setImage({ alt: alt ?? "" })} />
          <TextField label="Autoría" value={image.author} path="image.author" onChange={(author) => setImage({ author: author ?? "" })} />
          <TextField label="Licencia" value={image.license} path="image.license" placeholder="CC BY-SA 4.0" onChange={(license) => setImage({ license: license ?? "" })} />
          <TextField
            label="Página de origen"
            type="url"
            value={image.sourceUrl}
            path="image.sourceUrl"
            hint="Donde constan la autoría y la licencia (p. ej. Wikimedia Commons)."
            onChange={(sourceUrl) => setImage({ sourceUrl: sourceUrl ?? "" })}
          />
          <TextField
            label="Aviso sobre la foto"
            optional
            value={image.caption}
            path="image.caption"
            hint="Si no muestra el lugar en sí (un grabado, una pieza en otro museo)."
            onChange={(caption) => setImage({ caption })}
          />
          <TextField label="Encuadre" optional value={image.focus} path="image.focus" placeholder="50% 40%" onChange={(focus) => setImage({ focus })} />
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField<PlaceTone>
          label="Fondo mientras carga (o sin foto)"
          value={data.imageTone}
          path="imageTone"
          options={TONES.map((t) => ({ value: t, label: TONE_LABEL[t] }))}
          onChange={(imageTone) => set({ imageTone })}
        />
        <TextField label="Nota de la imagen provisional" optional value={data.imageCredit} path="imageCredit" onChange={(imageCredit) => set({ imageCredit })} />
      </div>
    </div>
  );
}

function SourcesEditor({ sources, onChange }: { sources: SourceRef[] | undefined; onChange: (s: SourceRef[] | undefined) => void }) {
  const list = sources ?? [];
  const update = (index: number, patch: Partial<SourceRef>) => onChange(list.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink">Fuentes de la descripción y los datos prácticos</p>
      {list.map((source, i) => (
        <fieldset key={i} className="grid gap-3 rounded-xl border border-stone p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_6rem_auto] md:items-end">
          <legend className="sr-only">Fuente {i + 1}</legend>
          <TextField label="Título" value={source.title} path={`sources.${i}.title`} onChange={(title) => update(i, { title: title ?? "" })} />
          <TextField label="Enlace" optional type="url" value={source.url} path={`sources.${i}.url`} onChange={(url) => update(i, { url })} />
          <TextField label="Página" optional value={source.page} path={`sources.${i}.page`} onChange={(page) => update(i, { page })} />
          <button type="button" onClick={() => onChange(list.length > 1 ? list.filter((_, j) => j !== i) : undefined)} className={btnSecondary}>
            Quitar<span className="sr-only"> fuente {i + 1}</span>
          </button>
        </fieldset>
      ))}
      <button type="button" onClick={() => onChange([...list, { title: "" }])} className={`${btnSecondary} self-start`}>
        Añadir fuente
      </button>
    </div>
  );
}

export function SiteForm({ data, set, catalog, records, isNew, locked, recordId }: FormProps<"site">) {
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const localities = catalog.showcase.localities.includes(data.locality) || !data.locality ? catalog.showcase.localities : [...catalog.showcase.localities, data.locality];
  const themes = [...catalog.showcase.themes, ...data.themes.filter((t) => !catalog.showcase.themes.includes(t))];
  const claims = records.filter((r) => r.kind === "claim" && (r.data as { siteId: string }).siteId === recordId);
  const stories = records.filter((r) => r.kind === "story" && (r.data as { siteId: string }).siteId === recordId);

  return (
    <>
      <Section title="Lugar">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Nombre"
            value={data.name}
            path="name"
            onChange={(name) => set(slugTouched || locked ? { name: name ?? "" } : { name: name ?? "", slug: slugify(name ?? "") })}
          />
          <TextField
            label="Dirección web"
            value={data.slug}
            path="slug"
            readOnly={locked}
            hint={locked ? "Ya está publicada: cambiarla rompería los enlaces que circulan." : `Aparece en /lugares/${data.slug || "…"}`}
            onChange={(slug) => {
              setSlugTouched(true);
              set({ slug: slug ?? "" });
            }}
          />
          <SelectField
            label="Localidad"
            value={data.locality}
            path="locality"
            options={localities.map((l) => ({ value: l, label: l }))}
            hint="Las localidades se definen en «Portada y asistente»."
            onChange={(locality) => set({ locality })}
          />
          <SelectField<SiteKind>
            label="Tipo"
            value={data.kind}
            path="kind"
            options={(Object.keys(KIND_LABEL) as SiteKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
            onChange={(kind) => set({ kind })}
          />
          <TextField label="Categoría en la tarjeta" optional value={data.category} path="category" placeholder="Sinagoga · Museo Sefardí" onChange={(category) => set({ category })} />
        </div>
        <CheckField
          label="Es patrimonio visigodo"
          checked={data.visigothic}
          onChange={(visigothic) => set({ visigothic })}
          hint="Si no lo es, la web lo marca como «Patrimonio no visigodo»."
        />
        <CheckField
          label="Contenido de demostración"
          checked={data.demo}
          onChange={(demo) => set({ demo })}
          hint="Se muestra con la etiqueta «Demo» hasta que sus datos estén aprobados."
        />
      </Section>

      <Section title="Textos" description="La historia que cuenta el asistente sale de las fichas publicadas, no de estos textos.">
        <TextField label="Entradilla" value={data.tagline} path="tagline" onChange={(tagline) => set({ tagline: tagline ?? "" })} />
        <TextField label="Resumen" multiline rows={5} value={data.summary} path="summary" onChange={(summary) => set({ summary: summary ?? "" })} />
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-semibold text-ink">Temas</legend>
          <div className="flex flex-wrap gap-x-5">
            {themes.map((theme) => (
              <CheckField
                key={theme}
                label={theme.charAt(0).toUpperCase() + theme.slice(1)}
                checked={data.themes.includes(theme)}
                onChange={(on) => set({ themes: on ? [...data.themes, theme] : data.themes.filter((t) => t !== theme) })}
              />
            ))}
          </div>
          <p className="text-xs text-ink-muted">Los temas se definen en «Portada y asistente»; ordenan Explorar según los intereses del visitante.</p>
        </fieldset>
      </Section>

      <Section title="Ubicación y visita">
        <div className="grid gap-4 md:grid-cols-3">
          <NumberField label="Latitud" step="any" value={data.coordinates.lat} path="coordinates.lat" onChange={(lat) => set({ coordinates: { ...data.coordinates, lat } })} />
          <NumberField label="Longitud" step="any" value={data.coordinates.lng} path="coordinates.lng" onChange={(lng) => set({ coordinates: { ...data.coordinates, lng } })} />
          <NumberField
            label="Duración de la visita (minutos)"
            value={data.visitMinutes}
            path="visitMinutes"
            hint="El planificador la usa para el horario del viaje."
            onChange={(visitMinutes) => set({ visitMinutes })}
          />
        </div>
        <CheckField
          label="Ubicación aproximada"
          checked={data.coordinates.approximate}
          onChange={(approximate) => set({ coordinates: { ...data.coordinates, approximate } })}
          hint="Déjala marcada hasta comprobarla sobre el terreno."
        />
        <NumberField
          label="Orden en el relato (opcional)"
          value={data.narrativeOrder ?? 0}
          path="narrativeOrder"
          hint="Para el planificador a medida: dentro de una localidad, los lugares con número más bajo van antes (por ejemplo, 1 para el museo que presenta la época). 0: sin preferencia."
          onChange={(n) => set({ narrativeOrder: n && n > 0 ? n : undefined })}
        />
      </Section>

      <Section title="Horario">
        <HoursEditor hours={data.hours} onChange={(hours) => set({ hours })} />
      </Section>

      <Section title="Accesibilidad">
        <SelectField<"verified" | "unknown">
          label="Estado"
          value={data.access.status}
          path="access.status"
          options={[
            { value: "unknown", label: "Sin verificar" },
            { value: "verified", label: "Verificada" },
          ]}
          hint="Sin verificar, la web nunca dice que un lugar es accesible."
          onChange={(status) => set({ access: { ...data.access, status, ...(status === "unknown" ? { stepFree: undefined } : {}) } })}
        />
        {data.access.status === "verified" && (
          <CheckField label="Acceso sin escalones" checked={data.access.stepFree === true} onChange={(stepFree) => set({ access: { ...data.access, stepFree } })} />
        )}
        <TextField label="Nota" optional multiline rows={2} value={data.access.note} path="access.note" onChange={(note) => set({ access: { ...data.access, note } })} />
      </Section>

      <Section title="Foto">
        <ImageEditor data={data} set={set} />
      </Section>

      <Section title="Datos prácticos" description="De la web del lugar o de turismo; no son fichas de evidencia.">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Dirección postal" optional value={data.address} path="address" onChange={(address) => set({ address })} />
          <TextField label="Teléfono" optional type="tel" value={data.phone} path="phone" placeholder="+34 925 00 00 00" onChange={(phone) => set({ phone })} />
          <TextField label="Web oficial" optional type="url" value={data.officialUrl} path="officialUrl" onChange={(officialUrl) => set({ officialUrl })} />
        </div>
        <SourcesEditor sources={data.sources} onChange={(sources) => set({ sources })} />
      </Section>

      <Section title="Asistente">
        <LinesField
          label="Otros nombres"
          optional
          value={data.aliases}
          path="aliases"
          hint="Cómo lo llama la gente además de su nombre («transito», «museo sefardi»). Nunca el nombre de una localidad. Se guardan en minúsculas y sin tildes."
          onChange={(aliases) => set({ aliases })}
        />
        <LinesField
          label="Preguntas sugeridas"
          optional
          value={data.suggestedPrompts}
          path="suggestedPrompts"
          hint="Las ofrece el asistente cuando este lugar está en pantalla (máximo 6, una por línea)."
          onChange={(suggestedPrompts) => set({ suggestedPrompts })}
        />
      </Section>

      {!isNew && (
        <Section title="Fichas y relatos de este lugar">
          <ul className="flex flex-col gap-2">
            {[...claims, ...stories].map((r) => (
              <li key={`${r.kind}:${r.id}`} className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`${KIND_INFO[r.kind].path}/${r.id}`} className="font-semibold text-ink underline underline-offset-2">
                  {KIND_INFO[r.kind].one}: {recordTitle(r)}
                </Link>
                <StatusBadge status={r.status} retire={r.retire} />
              </li>
            ))}
            {claims.length + stories.length === 0 && <li className="text-sm text-ink-muted">Todavía no tiene fichas ni relatos.</li>}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link href={`${KIND_INFO.claim.path}/nuevo?lugar=${recordId}`} className={btnSecondary}>
              Nueva ficha para este lugar
            </Link>
            <Link href={`${KIND_INFO.story.path}/nuevo?lugar=${recordId}`} className={btnSecondary}>
              Nuevo relato
            </Link>
          </div>
        </Section>
      )}
    </>
  );
}

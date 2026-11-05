"use client";
/**
 * Stop form: where the stop is inside its place, how arrival is detected, its recorded narration
 * (with the full transcript, required) and its image gallery (each image with its credits).
 */
import { useId, useState } from "react";
import type { ModelCertainty, PlaceImage, StopAudio, StopModel, StopVideo360 } from "@/domain/types";
import { CERTAINTY_DESCRIPTION, CERTAINTY_LABEL } from "@/components/shared/CertaintyBadge";
import { adminActions } from "@/state/admin";
import { AudioPlayer } from "@/components/tour/AudioPlayer";
import { SiteImage } from "@/components/shared/SiteImage";
import { IconChevronDown, IconClose } from "@/components/shell/icons";
import { CheckField, NumberField, Section, SelectField, TextField, btnSecondary } from "../ui";
import type { FormProps } from "./shared";

const fileInput =
  "min-h-11 w-full min-w-0 text-sm text-ink file:mr-3 file:min-h-11 file:rounded-full file:border file:border-stone file:bg-surface file:px-4 file:text-sm file:font-semibold file:text-ink";

const iconButton = "grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted disabled:opacity-30";

function AudioEditor({ audio, onChange }: { audio: StopAudio | undefined; onChange: (audio: StopAudio | undefined) => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileId = useId();
  const patch = (p: Partial<StopAudio>) => onChange({ ...(audio as StopAudio), ...p });

  async function upload(file: File) {
    setBusy(true);
    setMessage("Subiendo el audio…");
    const result = await adminActions.uploadAudio(file);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    onChange({
      label: audio?.label ?? "Locución",
      transcript: audio?.transcript ?? "",
      ...(audio?.credit ? { credit: audio.credit } : {}),
      src: result.src,
      durationSeconds: result.durationSeconds,
    });
    setMessage("Audio subido. Pega la transcripción completa.");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={fileId} className="text-sm font-semibold text-ink">
          {audio ? "Cambiar el audio" : "Subir el audio"}
        </label>
        <input
          id={fileId}
          type="file"
          accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
          className={fileInput}
        />
        <p className="text-xs text-ink-muted">MP3, M4A, AAC u OGG de hasta 30 MB. Para el móvil basta MP3 mono a 64-96 kbps.</p>
        <p aria-live="polite" className="min-h-5 text-sm text-ink-muted">
          {message ?? ""}
        </p>
      </div>
      {audio && (
        <>
          {audio.src && audio.transcript && <AudioPlayer audio={audio} title="vista previa" />}
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Etiqueta del reproductor" value={audio.label} path="audio.label" hint="Por ejemplo «Locución» o «Relato en audio»." onChange={(label) => patch({ label: label ?? "" })} />
            <NumberField
              label="Duración (segundos)"
              value={audio.durationSeconds}
              path="audio.durationSeconds"
              hint="Se rellena al subir el audio."
              onChange={(durationSeconds) => patch({ durationSeconds })}
            />
          </div>
          <TextField
            label="Transcripción"
            multiline
            rows={8}
            value={audio.transcript}
            path="audio.transcript"
            hint="El texto completo de la grabación: lo leen quienes no pueden oírla. Obligatorio."
            onChange={(transcript) => patch({ transcript: transcript ?? "" })}
          />
          <TextField label="Créditos" optional value={audio.credit} path="audio.credit" placeholder="Voz: … · Guion: …" onChange={(credit) => patch({ credit })} />
          <button type="button" onClick={() => onChange(undefined)} className={`${btnSecondary} self-start`}>
            Quitar el audio
          </button>
        </>
      )}
    </div>
  );
}

function GalleryEditor({ gallery, onChange, name }: { gallery: PlaceImage[]; onChange: (g: PlaceImage[]) => void; name: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileId = useId();
  const patch = (i: number, p: Partial<PlaceImage>) => onChange(gallery.map((g, j) => (j === i ? { ...g, ...p } : g)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...gallery];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  async function upload(file: File) {
    setBusy(true);
    setMessage("Subiendo la imagen…");
    const result = await adminActions.uploadImage(file);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    onChange([...gallery, { src: result.src, width: result.width, height: result.height, alt: "", author: "", license: "", sourceUrl: "" }]);
    setMessage("Imagen añadida. Completa el texto alternativo y los créditos.");
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {gallery.map((img, i) => (
          <li key={`${img.src}-${i}`} className="flex flex-col gap-3 rounded-xl border border-stone p-3">
            <div className="flex items-start gap-3">
              <SiteImage site={{ name, imageTone: "stone", image: img }} aspect="aspect-[4/3]" width="w-32" sizes="8rem" />
              <p className="min-w-0 flex-1 text-xs text-ink-muted">
                {i === 0 ? "Imagen principal de la parada." : `Imagen ${i + 1}.`}
              </p>
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Subir imagen ${i + 1}`} className={iconButton}>
                <IconChevronDown width={18} className="rotate-180" />
              </button>
              <button type="button" disabled={i === gallery.length - 1} onClick={() => move(i, 1)} aria-label={`Bajar imagen ${i + 1}`} className={iconButton}>
                <IconChevronDown width={18} />
              </button>
              <button type="button" onClick={() => onChange(gallery.filter((_, j) => j !== i))} aria-label={`Quitar imagen ${i + 1}`} className={iconButton}>
                <IconClose width={18} />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <TextField label="Texto alternativo" value={img.alt} path={`gallery.${i}.alt`} onChange={(alt) => patch(i, { alt: alt ?? "" })} />
              <TextField label="Pie" optional value={img.caption} path={`gallery.${i}.caption`} hint="Obligatorio si es una ilustración o una reconstrucción: dilo." onChange={(caption) => patch(i, { caption })} />
              <TextField label="Autoría" value={img.author} path={`gallery.${i}.author`} onChange={(author) => patch(i, { author: author ?? "" })} />
              <TextField label="Licencia o permiso" value={img.license} path={`gallery.${i}.license`} placeholder="CC BY 4.0 · Cedida por…" onChange={(license) => patch(i, { license: license ?? "" })} />
              <TextField label="Página de origen o créditos" type="url" value={img.sourceUrl} path={`gallery.${i}.sourceUrl`} onChange={(sourceUrl) => patch(i, { sourceUrl: sourceUrl ?? "" })} />
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-1">
        <label htmlFor={fileId} className="text-sm font-semibold text-ink">
          Añadir una imagen
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
          className={fileInput}
        />
        <p aria-live="polite" className="min-h-5 text-sm text-ink-muted">
          {message ?? ""}
        </p>
      </div>
    </div>
  );
}

function ModelsEditor({ models, onChange }: { models: StopModel[]; onChange: (m: StopModel[] | undefined) => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileId = useId();
  const patch = (i: number, p: Partial<StopModel>) => onChange(models.map((m, j) => (j === i ? { ...m, ...p } : m)));

  async function upload(file: File) {
    setBusy(true);
    setMessage("Subiendo el modelo…");
    const result = await adminActions.uploadModel(file);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    onChange([...models, { src: result.src, name: file.name.replace(/\.[^.]+$/, ""), certainty: "hypothesis", description: "" }]);
    setMessage("Modelo añadido. Elige su sello de certeza y explica qué se ha encontrado y qué se propone.");
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {models.map((m, i) => (
          <li key={`${m.src}-${i}`} className="flex flex-col gap-3 rounded-xl border border-stone p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 break-all text-xs text-ink-muted">{m.src}</p>
              <button type="button" onClick={() => onChange(models.length > 1 ? models.filter((_, j) => j !== i) : undefined)} aria-label={`Quitar modelo ${i + 1}`} className={iconButton}>
                <IconClose width={18} />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <TextField label="Nombre" value={m.name} path={`models.${i}.name`} onChange={(name) => patch(i, { name: name ?? "" })} />
              <SelectField<ModelCertainty>
                label="Sello de certeza"
                value={m.certainty}
                path={`models.${i}.certainty`}
                options={(Object.keys(CERTAINTY_LABEL) as ModelCertainty[]).map((c) => ({ value: c, label: CERTAINTY_LABEL[c] }))}
                onChange={(certainty) => patch(i, { certainty })}
              />
            </div>
            <p className="text-xs text-ink-muted">{CERTAINTY_DESCRIPTION[m.certainty]}</p>
            <TextField
              label="Explicación"
              multiline
              rows={4}
              value={m.description}
              path={`models.${i}.description`}
              hint="Qué se ha encontrado y qué se propone. Lo valida el arqueólogo responsable."
              onChange={(description) => patch(i, { description: description ?? "" })}
            />
            <TextField label="En qué se basa" optional value={m.source} path={`models.${i}.source`} placeholder="Panel del yacimiento, memoria de excavación…" onChange={(source) => patch(i, { source })} />
            <TextField label="Versión USDZ para iPhone" optional value={m.iosSrc} path={`models.${i}.iosSrc`} hint="Para verlo en realidad aumentada en iPhone." onChange={(iosSrc) => patch(i, { iosSrc })} />
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-1">
        <label htmlFor={fileId} className="text-sm font-semibold text-ink">
          Añadir un modelo 3D
        </label>
        <input
          id={fileId}
          type="file"
          accept=".glb,.gltf,.usdz,model/gltf-binary,model/gltf+json"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
          className={fileInput}
        />
        <p className="text-xs text-ink-muted">GLB o glTF; para el móvil, mejor menos de 10 MB.</p>
        <p aria-live="polite" className="min-h-5 text-sm text-ink-muted">
          {message ?? ""}
        </p>
      </div>
    </div>
  );
}

/**
 * 360° videos are too large for the content store: they are prepared with scripts/preparar-360.ts
 * and served from /media/360 or a video host; here they are linked by address (docs/VIDEO360.md).
 */
function Videos360Editor({ videos, onChange }: { videos: StopVideo360[]; onChange: (v: StopVideo360[] | undefined) => void }) {
  const patch = (i: number, p: Partial<StopVideo360>) => onChange(videos.map((v, j) => (j === i ? { ...v, ...p } : v)));
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {videos.map((v, i) => (
          <li key={i} className="flex flex-col gap-3 rounded-xl border border-stone p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-ink">Vídeo 360° {i + 1}</p>
              <button type="button" onClick={() => onChange(videos.length > 1 ? videos.filter((_, j) => j !== i) : undefined)} aria-label={`Quitar vídeo 360° ${i + 1}`} className={iconButton}>
                <IconClose width={18} />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <TextField label="Nombre" value={v.name} path={`videos360.${i}.name`} onChange={(name) => patch(i, { name: name ?? "" })} />
              <NumberField label="Duración (segundos)" value={v.durationSeconds} path={`videos360.${i}.durationSeconds`} onChange={(durationSeconds) => patch(i, { durationSeconds })} />
            </div>
            <TextField label="Vídeo (versión 4K)" value={v.src} path={`videos360.${i}.src`} placeholder="/media/360/castillo-patio-4k.mp4" onChange={(src) => patch(i, { src: src ?? "" })} />
            <TextField
              label="Vídeo (versión para móvil)"
              optional
              value={v.srcMobile}
              path={`videos360.${i}.srcMobile`}
              placeholder="/media/360/castillo-patio-movil.mp4"
              hint="La versión ligera que reciben los móviles y las conexiones con ahorro de datos."
              onChange={(srcMobile) => patch(i, { srcMobile })}
            />
            <TextField label="Imagen de portada" optional value={v.poster} path={`videos360.${i}.poster`} placeholder="/media/360/castillo-patio.jpg" onChange={(poster) => patch(i, { poster })} />
            <TextField
              label="Descripción"
              multiline
              rows={4}
              value={v.description}
              path={`videos360.${i}.description`}
              hint="Qué se ve, en palabras: la leen quienes no pueden ver el vídeo."
              onChange={(description) => patch(i, { description: description ?? "" })}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <TextField label="Crédito" optional value={v.credit} path={`videos360.${i}.credit`} placeholder="Grabación: …" onChange={(credit) => patch(i, { credit })} />
              <NumberField
                label="Dirección inicial (grados)"
                value={v.startYaw ?? 0}
                path={`videos360.${i}.startYaw`}
                hint="Hacia dónde mira al abrirse: 0 es el centro del vídeo; 90, a la derecha."
                onChange={(startYaw) => patch(i, { startYaw: startYaw || undefined })}
              />
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => onChange([...videos, { src: "", name: "", description: "", durationSeconds: 60 }])}
        className={`${btnSecondary} self-start`}
      >
        Añadir un vídeo 360°
      </button>
    </div>
  );
}

export function StopForm({ data, set, catalog }: FormProps<"stop">) {
  const site = catalog.sites.find((s) => s.id === data.siteId);
  const hasPoint = data.coordinates !== undefined;
  return (
    <>
      <Section title="Parada" description="Un punto del lugar donde se detiene la visita guiada: un área del yacimiento, una sala, un mirador.">
        <SelectField
          label="Lugar"
          value={data.siteId}
          path="siteId"
          options={catalog.sites.map((s) => ({ value: s.id, label: `${s.name} · ${s.locality}` }))}
          onChange={(siteId) => set({ siteId })}
        />
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
          <TextField label="Nombre" value={data.name} path="name" onChange={(name) => set({ name: name ?? "" })} />
          <NumberField label="Orden en el lugar" value={data.order} path="order" onChange={(order) => set({ order })} />
        </div>
        <TextField label="Entradilla" optional value={data.tagline} path="tagline" onChange={(tagline) => set({ tagline })} />
        <CheckField
          label="Solo en rutas"
          checked={Boolean(data.routeOnly)}
          onChange={(routeOnly) => set({ routeOnly: routeOnly || undefined })}
          hint="Se cuenta en las rutas que pasan por el lugar, pero no en la visita guiada del propio lugar."
        />
      </Section>

      <Section title="Llegada" description="Cómo sabe la app que el visitante ha llegado.">
        <CheckField
          label="En interior"
          checked={Boolean(data.indoor)}
          onChange={(indoor) => set({ indoor: indoor || undefined })}
          hint="En un museo o una sala el GPS no es fiable: el visitante avanza a mano."
        />
        <CheckField
          label="Tiene coordenadas propias"
          checked={hasPoint}
          onChange={(on) =>
            set({ coordinates: on ? { lat: site?.coordinates.lat ?? Number.NaN, lng: site?.coordinates.lng ?? Number.NaN, approximate: true } : undefined })
          }
          hint="Sin ellas se usa el punto del lugar y, si el lugar tiene varias paradas, se avanza a mano."
        />
        {data.coordinates && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <NumberField label="Latitud" step="any" value={data.coordinates.lat} path="coordinates.lat" onChange={(lat) => set({ coordinates: { ...data.coordinates!, lat } })} />
              <NumberField label="Longitud" step="any" value={data.coordinates.lng} path="coordinates.lng" onChange={(lng) => set({ coordinates: { ...data.coordinates!, lng } })} />
              <NumberField
                label="Radio de llegada (m)"
                value={data.radiusMeters}
                path="radiusMeters"
                hint="Vacío: el de su tipo de lugar."
                onChange={(radiusMeters) => set({ radiusMeters: Number.isNaN(radiusMeters) ? undefined : radiusMeters })}
              />
            </div>
            <CheckField
              label="Ubicación aproximada"
              checked={data.coordinates.approximate}
              onChange={(approximate) => set({ coordinates: { ...data.coordinates!, approximate } })}
              hint="Déjala marcada hasta tomarla en campo con el protocolo de POI."
            />
          </>
        )}
      </Section>

      <Section title="Locución" description="La grabación que se escucha en la parada, con su transcripción completa.">
        <AudioEditor audio={data.audio} onChange={(audio) => set({ audio })} />
      </Section>

      <Section title="Imágenes" description="Fotos, ilustraciones y reconstrucciones de la parada. Solo con autoría, licencia y página de origen.">
        <GalleryEditor gallery={data.gallery} name={data.name || "esta parada"} onChange={(gallery) => set({ gallery })} />
      </Section>

      <Section title="Modelos 3D" description="Cada modelo lleva un sello de certeza: lo excavado, lo restituido, la hipótesis o la huella de la prospección.">
        <ModelsEditor models={data.models ?? []} onChange={(models) => set({ models })} />
      </Section>

      <Section title="Vídeos 360°" description="Grabaciones en 360° de la parada. Se preparan con el guion de vídeo 360 y se enlazan por su dirección; no se guardan en las descargas sin conexión.">
        <Videos360Editor videos={data.videos360 ?? []} onChange={(videos360) => set({ videos360 })} />
      </Section>
    </>
  );
}

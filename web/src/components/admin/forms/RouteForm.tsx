"use client";
/** Route form: texts, transport, ordered stops (with the planner's duration) and assistant words. */
import { useId, useState } from "react";
import { adminActions } from "@/state/admin";
import { IllustratedRouteMap } from "@/components/tour/IllustratedRouteMap";
import { slugify } from "@/domain/editorial/records";
import { estimateRoute } from "@/domain/planner";
import type { IllustratedMap, Route, RouteLeg, TransportMode } from "@/domain/types";
import { AudioEditor } from "./StopForm";
import { TRANSPORT_LABEL, formatDuration } from "@/lib/labels";
import { IconChevronDown, IconClose } from "@/components/shell/icons";
import { CheckField, Field, LinesField, NumberField, Section, SelectField, TextField, btnSecondary, inputClass } from "../ui";
import type { FormProps } from "./shared";

/**
 * Car mode: one optional audio per stretch, heard on the way to each stop of the tour. Written to be
 * heard while driving, with nothing to look at (docs/MODO-COCHE.md).
 */
function LegsEditor({ data, set, catalog }: Pick<FormProps<"route">, "data" | "set" | "catalog">) {
  const allStops = catalog.stops ?? [];
  const stopById = new Map(allStops.map((s) => [s.id, s]));
  const siteById = new Map(catalog.sites.map((s) => [s.id, s]));
  const tour: { id: string; name: string }[] = data.tourStopIds?.length
    ? data.tourStopIds.flatMap((id) => {
        const st = stopById.get(id);
        return st ? [{ id, name: st.name }] : [];
      })
    : data.stopIds.flatMap((siteId) => {
        const own = allStops.filter((s) => s.siteId === siteId).sort((a, b) => a.order - b.order);
        const site = siteById.get(siteId);
        return own.length ? own.map((s) => ({ id: s.id, name: s.name })) : site ? [{ id: site.id, name: site.name }] : [];
      });
  const legs = data.legs ?? [];
  const setLeg = (toStopId: string, audio: RouteLeg["audio"] | undefined) => {
    const rest = legs.filter((l) => l.toStopId !== toStopId);
    const next = audio ? [...rest, { toStopId, audio }] : rest;
    // Keep them in tour order, so the record reads like the route.
    const order = new Map(tour.map((t, i) => [t.id, i]));
    next.sort((a, b) => (order.get(a.toStopId) ?? 0) - (order.get(b.toStopId) ?? 0));
    set({ legs: next.length ? next : undefined });
  };
  if (tour.length === 0) return <p className="text-sm text-ink-muted">Añade primero las paradas de la ruta.</p>;
  return (
    <ol className="flex flex-col gap-3">
      {tour.map((t, i) => {
        const index = legs.findIndex((l) => l.toStopId === t.id);
        const leg = index === -1 ? undefined : legs[index];
        return (
          <li key={t.id}>
            <details open={Boolean(leg)} className="rounded-xl border border-stone">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-sm font-semibold text-ink">
                <span>
                  {i === 0 ? "Antes de empezar" : "De camino"} a {i + 1}. {t.name}
                </span>
                <span className="text-xs font-normal text-ink-muted">{leg ? "Con audio" : "Sin audio"}</span>
              </summary>
              <div className="px-3 pb-3">
                <AudioEditor audio={leg?.audio} path={`legs.${index === -1 ? legs.length : index}.audio`} defaultLabel="Tramo en audio" onChange={(audio) => setLeg(t.id, audio)} />
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

function TourStopsEditor({ data, set, catalog }: Pick<FormProps<"route">, "data" | "set" | "catalog">) {
  const [adding, setAdding] = useState("");
  const allStops = catalog.stops ?? [];
  const stopById = new Map(allStops.map((s) => [s.id, s]));
  const siteName = new Map(catalog.sites.map((s) => [s.id, s.name]));
  const candidates = data.stopIds.flatMap((siteId) => allStops.filter((s) => s.siteId === siteId).sort((a, b) => a.order - b.order));
  const chosen = data.tourStopIds;
  const move = (i: number, d: -1 | 1) => {
    const next = [...chosen!];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    set({ tourStopIds: next });
  };
  if (!chosen) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-muted">
          Ahora el recorrido pasa por todas las paradas de cada lugar, en su orden
          {candidates.length > 0 ? ` (${candidates.length} paradas)` : ""}. Elige paradas si la ruta solo debe contar algunas.
        </p>
        <button type="button" disabled={candidates.length === 0} onClick={() => set({ tourStopIds: candidates.map((s) => s.id) })} className={`${btnSecondary} self-start`}>
          Elegir paradas
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ol aria-label="Paradas del recorrido guiado en orden" className="flex flex-col gap-2">
        {chosen.map((id, i) => {
          const stop = stopById.get(id);
          return (
            <li key={`${id}-${i}`} className="flex items-center gap-2 rounded-xl border border-stone px-3 py-1.5">
              <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-ink-muted">{i + 1}</span>
              <span className="min-w-0 flex-1 text-sm text-ink">
                {stop ? stop.name : <span className="text-danger">{id} (no está entre las paradas)</span>}
                {stop && <span className="block text-xs text-ink-muted">{siteName.get(stop.siteId)}</span>}
              </span>
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Subir parada ${i + 1} del recorrido`} className="grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted disabled:opacity-30">
                <IconChevronDown width={18} className="rotate-180" />
              </button>
              <button type="button" disabled={i === chosen.length - 1} onClick={() => move(i, 1)} aria-label={`Bajar parada ${i + 1} del recorrido`} className="grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted disabled:opacity-30">
                <IconChevronDown width={18} />
              </button>
              <button type="button" onClick={() => set({ tourStopIds: chosen.filter((_, j) => j !== i) })} aria-label={`Quitar parada ${i + 1} del recorrido`} className="grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted">
                <IconClose width={18} />
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="Añadir parada al recorrido" path="tourStopIds">
            {(control) => (
              <select {...control} value={adding} onChange={(e) => setAdding(e.target.value)} className={inputClass}>
                <option value="">Elige una parada de los lugares de la ruta</option>
                {candidates
                  .filter((s) => !chosen.includes(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {siteName.get(s.siteId)} · {s.order}. {s.name}
                    </option>
                  ))}
              </select>
            )}
          </Field>
        </div>
        <button
          type="button"
          disabled={!adding}
          onClick={() => {
            set({ tourStopIds: [...chosen, adding] });
            setAdding("");
          }}
          className={btnSecondary}
        >
          Añadir
        </button>
      </div>
      <button type="button" onClick={() => set({ tourStopIds: undefined })} className="self-start text-sm font-semibold text-ink-muted underline underline-offset-4 hover:text-ink">
        Volver a todas las paradas de cada lugar
      </button>
    </div>
  );
}

function MapEditor({ data, set, catalog }: Pick<FormProps<"route">, "data" | "set" | "catalog">) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileId = useId();
  const map = data.illustratedMap;
  const allStops = catalog.stops ?? [];
  const tourIds = data.tourStopIds ?? data.stopIds.flatMap((siteId) => allStops.filter((s) => s.siteId === siteId).sort((a, b) => a.order - b.order).map((s) => s.id));
  const stopName = new Map(allStops.map((s) => [s.id, s.name]));
  const patch = (p: Partial<IllustratedMap>) => set({ illustratedMap: { ...(map as IllustratedMap), ...p } });
  const pinFor = (id: string) => map?.pins.find((p) => p.stopId === id);
  const setPin = (id: string, xy: { x?: number; y?: number }) => {
    if (!map) return;
    const current = pinFor(id) ?? { stopId: id, x: 50, y: 50 };
    const next = { ...current, ...xy };
    patch({ pins: [...map.pins.filter((p) => p.stopId !== id), next].sort((a, b) => tourIds.indexOf(a.stopId) - tourIds.indexOf(b.stopId)) });
  };

  async function upload(file: File) {
    setBusy(true);
    setMessage("Subiendo el mapa…");
    const result = await adminActions.uploadImage(file);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    set({
      illustratedMap: {
        alt: map?.alt ?? "",
        caption: map?.caption ?? "Ilustración sin escala. Las posiciones de las paradas son orientativas.",
        credit: map?.credit ?? "",
        pins: map?.pins ?? [],
        src: result.src,
        width: result.width,
        height: result.height,
      },
    });
    setMessage("Mapa subido. Coloca cada parada con sus coordenadas en % (0 a 100, desde la esquina superior izquierda).");
  }

  return (
    <div className="flex flex-col gap-4">
      {map && (
        <IllustratedRouteMap map={map} stopNumbers={new Map(tourIds.map((id, i) => [id, i + 1]))} stopNames={stopName} />
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor={fileId} className="text-sm font-semibold text-ink">
          {map ? "Cambiar la imagen del mapa" : "Subir un mapa ilustrado"}
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
        <p aria-live="polite" className="min-h-5 text-sm text-ink-muted">
          {message ?? ""}
        </p>
      </div>
      {map && (
        <>
          <TextField label="Texto alternativo" value={map.alt} path="illustratedMap.alt" hint="Qué muestra el mapa, para quien no puede verlo." onChange={(alt) => patch({ alt: alt ?? "" })} />
          <TextField label="Pie" value={map.caption} path="illustratedMap.caption" hint="Di que es una ilustración sin escala." onChange={(caption) => patch({ caption: caption ?? "" })} />
          <TextField label="Crédito" value={map.credit} path="illustratedMap.credit" onChange={(credit) => patch({ credit: credit ?? "" })} />
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-ink">Posición de cada parada (% del ancho y del alto)</legend>
            {tourIds.map((id, i) => (
              <div key={id} className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] items-end gap-2">
                <span className="pb-3 text-sm text-ink">
                  {i + 1}. {stopName.get(id) ?? id}
                </span>
                <NumberField label="X" step="0.1" value={pinFor(id)?.x} path="illustratedMap.pins" onChange={(x) => setPin(id, { x })} />
                <NumberField label="Y" step="0.1" value={pinFor(id)?.y} path="illustratedMap.pins" onChange={(y) => setPin(id, { y })} />
              </div>
            ))}
          </fieldset>
          <button type="button" onClick={() => set({ illustratedMap: undefined })} className={`${btnSecondary} self-start`}>
            Quitar el mapa
          </button>
        </>
      )}
    </div>
  );
}

export function RouteForm({ data, set, catalog, isNew, locked }: FormProps<"route">) {
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [adding, setAdding] = useState("");
  const siteById = new Map(catalog.sites.map((s) => [s.id, s]));
  const stops = data.stopIds;
  const moveStop = (index: number, direction: -1 | 1) => {
    const next = [...stops];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    set({ stopIds: next });
  };
  const known = stops.every((id) => siteById.has(id));
  const minutes = known && stops.length > 1 ? estimateRoute(data as Route, { getSite: (id) => siteById.get(id) }).minutes : null;

  return (
    <>
      <Section title="Ruta">
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
            hint={locked ? "Ya está publicada: cambiarla rompería los enlaces que circulan." : `Aparece en /rutas/${data.slug || "…"}`}
            onChange={(slug) => {
              setSlugTouched(true);
              set({ slug: slug ?? "" });
            }}
          />
        </div>
        <TextField label="Tema" value={data.theme} path="theme" onChange={(theme) => set({ theme: theme ?? "" })} />
        <TextField label="Resumen" multiline rows={3} value={data.summary} path="summary" onChange={(summary) => set({ summary: summary ?? "" })} />
        <SelectField<TransportMode>
          label="Transporte"
          value={data.transport}
          path="transport"
          options={(Object.keys(TRANSPORT_LABEL) as TransportMode[]).map((t) => ({ value: t, label: TRANSPORT_LABEL[t] }))}
          onChange={(transport) => set({ transport })}
        />
        <CheckField label="Contenido de demostración" checked={data.demo} onChange={(demo) => set({ demo })} hint="Se muestra con la etiqueta «Demo»." />
      </Section>

      <Section
        title="Paradas"
        description={
          minutes !== null
            ? `Duración estimada por el planificador: ${formatDuration(minutes)} (visitas, trayectos aproximados y márgenes).`
            : "El planificador calcula la duración a partir de las paradas."
        }
      >
        <ol aria-label="Paradas en orden" className="flex flex-col gap-2">
          {stops.map((id, i) => {
            const site = siteById.get(id);
            return (
              <li key={`${id}-${i}`} className="flex items-center gap-2 rounded-xl border border-stone px-3 py-1.5">
                <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-ink-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 text-sm text-ink">
                  {site ? site.name : <span className="text-danger">{id} (no está entre los lugares)</span>}
                  {site && <span className="block text-xs text-ink-muted">{site.locality}</span>}
                </span>
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => moveStop(i, -1)}
                  aria-label={`Subir parada ${i + 1}`}
                  className="grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted disabled:opacity-30"
                >
                  <IconChevronDown width={18} className="rotate-180" />
                </button>
                <button
                  type="button"
                  disabled={i === stops.length - 1}
                  onClick={() => moveStop(i, 1)}
                  aria-label={`Bajar parada ${i + 1}`}
                  className="grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted disabled:opacity-30"
                >
                  <IconChevronDown width={18} />
                </button>
                <button
                  type="button"
                  onClick={() => set({ stopIds: stops.filter((_, j) => j !== i) })}
                  aria-label={`Quitar parada ${i + 1}`}
                  className="grid h-11 w-11 place-items-center rounded-full text-ink-muted hover:bg-surface-muted"
                >
                  <IconClose width={18} />
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Añadir parada" path="stopIds">
              {(control) => (
                <select {...control} value={adding} onChange={(e) => setAdding(e.target.value)} className={inputClass}>
                  <option value="">Elige un lugar</option>
                  {catalog.sites
                    .filter((s) => !stops.includes(s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.locality}
                      </option>
                    ))}
                </select>
              )}
            </Field>
          </div>
          <button
            type="button"
            disabled={!adding}
            onClick={() => {
              set({ stopIds: [...stops, adding] });
              setAdding("");
            }}
            className={btnSecondary}
          >
            Añadir
          </button>
        </div>
      </Section>

      <Section title="Recorrido guiado" description="Las paradas que cuenta el recorrido guiado de la ruta, en orden.">
        <TourStopsEditor data={data} set={set} catalog={catalog} />
      </Section>

      <Section
        title="Modo coche: tramos en audio"
        description="Audios para escuchar de camino a cada parada, en el modo coche. Escríbelos para oír sin mirar: nada de «mira a tu izquierda». El relato de cada parada suena al llegar."
      >
        <LegsEditor data={data} set={set} catalog={catalog} />
      </Section>

      <Section title="Mapa ilustrado" description="Un mapa dibujado del recorrido, sin escala, con sus paradas numeradas.">
        <MapEditor data={data} set={set} catalog={catalog} />
      </Section>

      <Section title="Asistente y avisos">
        <LinesField
          label="Palabras clave"
          optional
          value={data.keywords}
          path="keywords"
          hint="Palabras que llevan al asistente a proponer esta ruta al planificar («corona*» vale para corona, coronas…). Sin tildes."
          onChange={(keywords) => set({ keywords })}
        />
        <LinesField
          label="A tener en cuenta"
          value={data.limitations}
          path="limitations"
          hint="Cuestas, coche necesario, datos sin verificar… Uno por línea."
          onChange={(limitations) => set({ limitations: limitations ?? [] })}
        />
      </Section>
    </>
  );
}

"use client";
/** Home page and assistant settings: towns and themes, the hero, starter questions and vocabulary. */
import type { TransportMode } from "@/domain/types";
import { TRANSPORT_LABEL } from "@/lib/labels";
import { LinesField, Section, SelectField, TextField, btnSecondary } from "../ui";
import type { FormProps } from "./shared";

export function ShowcaseForm({ data, set, catalog }: FormProps<"showcase">) {
  const sites = catalog.sites.map((s) => ({ value: s.id, label: s.name }));
  const areas = [...data.localities, data.regionName].filter(Boolean);
  const examples = data.assistantExamples;
  const setExample = (index: number, patch: Partial<(typeof examples)[number]>) =>
    set({ assistantExamples: examples.map((e, i) => (i === index ? { ...e, ...patch } : e)) });

  return (
    <>
      <Section title="Zona y temas" description="Lo que los lugares eligen en sus campos «Localidad» y «Temas».">
        <LinesField
          label="Localidades"
          value={data.localities}
          path="localities"
          hint="Una por línea, en el orden de los filtros. Si cambias un nombre, revisa los lugares de esa localidad."
          onChange={(localities) => set({ localities: localities ?? [] })}
        />
        <TextField
          label="Nombre de toda la zona"
          value={data.regionName}
          path="regionName"
          hint="La opción «toda la zona» al configurar el viaje, p. ej. «Toledo y Guadamur»."
          onChange={(regionName) => set({ regionName: regionName ?? "" })}
        />
        <LinesField
          label="Temas"
          value={data.themes}
          path="themes"
          hint="En minúsculas, en el orden de los filtros de Explorar y de los intereses de /cuenta."
          onChange={(themes) => set({ themes: themes ?? [] })}
        />
      </Section>

      <Section title="Portada">
        <SelectField label="Lugar de la foto principal" value={data.heroSiteId} path="heroSiteId" options={sites} onChange={(heroSiteId) => set({ heroSiteId })} />
        <TextField label="Titular" value={data.heroTitle} path="heroTitle" onChange={(heroTitle) => set({ heroTitle: heroTitle ?? "" })} />
        <TextField
          label="Entradilla"
          multiline
          rows={2}
          value={data.heroIntro}
          path="heroIntro"
          hint="La web añade: «Explora a tu ritmo, crea un viaje que encaje en tu día o pregunta al asistente.»"
          onChange={(heroIntro) => set({ heroIntro: heroIntro ?? "" })}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Grupo visigodo: título"
            value={data.placeGroups.visigothic.title}
            path="placeGroups.visigothic.title"
            onChange={(title) => set({ placeGroups: { ...data.placeGroups, visigothic: { ...data.placeGroups.visigothic, title: title ?? "" } } })}
          />
          <TextField
            label="Grupo visigodo: frase"
            value={data.placeGroups.visigothic.intro}
            path="placeGroups.visigothic.intro"
            onChange={(intro) => set({ placeGroups: { ...data.placeGroups, visigothic: { ...data.placeGroups.visigothic, intro: intro ?? "" } } })}
          />
          <TextField
            label="Otro patrimonio: título"
            value={data.placeGroups.other.title}
            path="placeGroups.other.title"
            onChange={(title) => set({ placeGroups: { ...data.placeGroups, other: { ...data.placeGroups.other, title: title ?? "" } } })}
          />
          <TextField
            label="Otro patrimonio: frase"
            value={data.placeGroups.other.intro}
            path="placeGroups.other.intro"
            hint="La web añade que cada ficha lo indica como patrimonio no visigodo."
            onChange={(intro) => set({ placeGroups: { ...data.placeGroups, other: { ...data.placeGroups.other, intro: intro ?? "" } } })}
          />
        </div>
      </Section>

      <Section title="Asistente" description="Las preguntas que se ofrecen y lo que dice cuando no puede responder.">
        <TextField
          label="Bienvenida"
          value={data.assistantIntro}
          path="assistantIntro"
          hint="Debajo de «¿Qué quieres descubrir hoy?» en un chat nuevo."
          onChange={(assistantIntro) => set({ assistantIntro: assistantIntro ?? "" })}
        />
        <LinesField
          label="Preguntas de inicio"
          value={data.starterPrompts}
          path="starterPrompts"
          hint="En un chat nuevo; las tres primeras también en la portada. Una por línea."
          onChange={(starterPrompts) => set({ starterPrompts: starterPrompts ?? [] })}
        />
        <LinesField
          label="Preguntas generales de seguimiento"
          value={data.generalPrompts}
          path="generalPrompts"
          hint="Cuando no hay un lugar concreto en pantalla. Una por línea."
          onChange={(generalPrompts) => set({ generalPrompts: generalPrompts ?? [] })}
        />
        <TextField label="Pregunta para familias" value={data.familyPrompt} path="familyPrompt" onChange={(familyPrompt) => set({ familyPrompt: familyPrompt ?? "" })} />
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-ink">Ejemplos cuando no puede responder</legend>
          <p className="text-xs text-ink-muted">«Puedo contarte lo que sí recogen las fichas aprobadas, por ejemplo…» (máximo 6).</p>
          {examples.map((example, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-stone p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] md:items-end">
              <SelectField label="Lugar" value={example.siteId} path={`assistantExamples.${i}.siteId`} options={sites} onChange={(siteId) => setExample(i, { siteId })} />
              <TextField
                label="Tema"
                value={example.topic}
                path={`assistantExamples.${i}.topic`}
                placeholder="cómo apareció el Tesoro de Guarrazar"
                onChange={(topic) => setExample(i, { topic: topic ?? "" })}
              />
              <button type="button" onClick={() => set({ assistantExamples: examples.filter((_, j) => j !== i) })} className={btnSecondary}>
                Quitar<span className="sr-only"> ejemplo {i + 1}</span>
              </button>
            </div>
          ))}
          {examples.length < 6 && (
            <button
              type="button"
              onClick={() => set({ assistantExamples: [...examples, { siteId: sites[0]?.value ?? "", topic: "" }] })}
              className={`${btnSecondary} self-start`}
            >
              Añadir ejemplo
            </button>
          )}
        </fieldset>
        <LinesField
          label="Palabras clave históricas"
          rows={6}
          value={data.heritageKeywords}
          path="heritageKeywords"
          hint="Personas, objetos y hechos de la ruta que marcan una pregunta como histórica («recesvinto», «corona*» para corona, coronas…). Sin tildes."
          onChange={(heritageKeywords) => set({ heritageKeywords: heritageKeywords ?? [] })}
        />
      </Section>

      <Section title="Cómo llegar y ayudas">
        {data.localities.map((town) => (
          <TextField
            key={`there-${town}`}
            label={`Cómo se llega a ${town}`}
            multiline
            rows={2}
            value={data.gettingThere[town]}
            path={`gettingThere.${town}`}
            hint="Lo dice el asistente cuando preguntan cómo llegar a un lugar de esta localidad."
            onChange={(text) => set({ gettingThere: { ...data.gettingThere, [town]: text ?? "" } })}
          />
        ))}
        {areas.map((area) => (
          <TextField
            key={`hint-${area}`}
            label={`Ayuda bajo «${area}»`}
            optional
            value={data.areaHints[area]}
            path={`areaHints.${area}`}
            onChange={(text) => {
              const next = { ...data.areaHints };
              if (text) next[area] = text;
              else delete next[area];
              set({ areaHints: next });
            }}
          />
        ))}
        {(Object.keys(TRANSPORT_LABEL) as TransportMode[]).map((mode) => (
          <TextField
            key={mode}
            label={`Ayuda bajo «${TRANSPORT_LABEL[mode]}»`}
            value={data.transportHints[mode]}
            path={`transportHints.${mode}`}
            onChange={(text) => set({ transportHints: { ...data.transportHints, [mode]: text ?? "" } })}
          />
        ))}
      </Section>
    </>
  );
}

"use client";
/**
 * Service form: a business of the network (restaurant, lodging, car rental, guided visit…).
 * Operational data: dated, never mixed with heritage claims. The app does not take bookings: it
 * links to the business's own booking page or contact.
 */
import { useState } from "react";
import { slugify } from "@/domain/editorial/records";
import { SERVICE_CATEGORIES } from "@/domain/editorial/schema";
import type { ServiceCategory } from "@/domain/types";
import { SERVICE_CATEGORY_LABEL } from "@/lib/labels";
import { CheckField, NumberField, Section, SelectField, TextField } from "../ui";
import { HoursEditor } from "./SiteForm";
import type { FormProps } from "./shared";

const today = () => new Date().toISOString().slice(0, 10);

export function ServiceForm({ data, set, catalog, isNew, locked }: FormProps<"service">) {
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const localities = catalog.showcase.localities.includes(data.locality) || !data.locality ? catalog.showcase.localities : [...catalog.showcase.localities, data.locality];
  const sites = [...catalog.sites].sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <>
      <Section title="Servicio">
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
            hint={locked ? "Ya está publicada: cambiarla rompería los enlaces." : `Aparece en /servicios#${data.slug || "…"}`}
            onChange={(slug) => {
              setSlugTouched(true);
              set({ slug: slug ?? "" });
            }}
          />
          <SelectField<ServiceCategory>
            label="Tipo"
            value={data.category}
            path="category"
            options={SERVICE_CATEGORIES.map((c) => ({ value: c, label: SERVICE_CATEGORY_LABEL[c] }))}
            onChange={(category) => set({ category })}
          />
          <SelectField
            label="Localidad"
            value={data.locality}
            path="locality"
            options={localities.map((l) => ({ value: l, label: l }))}
            hint="Las localidades se definen en «Portada y asistente»."
            onChange={(locality) => set({ locality })}
          />
        </div>
        <TextField label="Qué ofrece" multiline rows={3} value={data.summary} path="summary" hint="Una o dos frases claras, sin superlativos." onChange={(summary) => set({ summary: summary ?? "" })} />
        <CheckField
          label="Empresa adherida a la red"
          checked={data.partner}
          onChange={(partner) => set({ partner })}
          hint="Solo se publican empresas que han firmado la adhesión (salvo los ejemplos)."
        />
        <CheckField
          label="Patrocinado"
          checked={data.sponsored === true}
          onChange={(sponsored) => set({ sponsored: sponsored || undefined })}
          hint="Se rotula «Patrocinado». No cambia el orden en que aparece: el orden sigue criterios públicos."
        />
        <CheckField
          label="Ejemplo (no es una empresa real)"
          checked={data.demo}
          onChange={(demo) => set({ demo })}
          hint="Para probar el planificador. La web lo rotula como ejemplo."
        />
      </Section>

      <Section title="Ubicación">
        <div className="grid gap-4 md:grid-cols-3">
          <NumberField label="Latitud" step="any" value={data.coordinates.lat} path="coordinates.lat" onChange={(lat) => set({ coordinates: { ...data.coordinates, lat } })} />
          <NumberField label="Longitud" step="any" value={data.coordinates.lng} path="coordinates.lng" onChange={(lng) => set({ coordinates: { ...data.coordinates, lng } })} />
          <TextField label="Dirección postal" optional value={data.address} path="address" onChange={(address) => set({ address })} />
        </div>
        <CheckField
          label="Ubicación aproximada"
          checked={data.coordinates.approximate}
          onChange={(approximate) => set({ coordinates: { ...data.coordinates, approximate } })}
        />
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-semibold text-ink">Lugares a los que está vinculado</legend>
          <p className="text-xs text-ink-muted">Por ejemplo, la visita guiada de un yacimiento o el restaurante junto a él. El planificador lo propone con esos lugares.</p>
          <div className="flex max-h-56 flex-col overflow-y-auto rounded-xl border border-stone p-2">
            {sites.map((site) => (
              <CheckField
                key={site.id}
                label={`${site.name} (${site.locality})`}
                checked={data.siteIds.includes(site.id)}
                onChange={(on) => set({ siteIds: on ? [...data.siteIds, site.id] : data.siteIds.filter((id) => id !== site.id) })}
              />
            ))}
          </div>
        </fieldset>
      </Section>

      <Section title="Contacto y reserva" description="La app no cobra ni reserva: enlaza la reserva de la propia empresa o su contacto.">
        <CheckField label="Admite reserva previa" checked={data.reservable} onChange={(reservable) => set({ reservable })} />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Página de reserva"
            optional
            type="url"
            value={data.contact.bookingUrl}
            path="contact.bookingUrl"
            onChange={(bookingUrl) => set({ contact: { ...data.contact, bookingUrl } })}
          />
          <TextField label="Web" optional type="url" value={data.contact.website} path="contact.website" onChange={(website) => set({ contact: { ...data.contact, website } })} />
          <TextField
            label="Teléfono"
            optional
            type="tel"
            value={data.contact.phone}
            path="contact.phone"
            placeholder="+34 925 00 00 00"
            onChange={(phone) => set({ contact: { ...data.contact, phone } })}
          />
          <TextField label="Correo" optional value={data.contact.email} path="contact.email" onChange={(email) => set({ contact: { ...data.contact, email } })} />
        </div>
      </Section>

      <Section title="Precio y público">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField<"" | "1" | "2" | "3" | "4">
            label="Nivel de precio"
            value={data.priceLevel ? (String(data.priceLevel) as "1" | "2" | "3" | "4") : ""}
            path="priceLevel"
            options={[
              { value: "", label: "Sin indicar" },
              { value: "1", label: "€ · económico" },
              { value: "2", label: "€€ · medio" },
              { value: "3", label: "€€€ · alto" },
              { value: "4", label: "€€€€ · muy alto" },
            ]}
            onChange={(v) => set({ priceLevel: v ? (Number(v) as 1 | 2 | 3 | 4) : undefined })}
          />
          <TextField
            label="Nota de precio"
            optional
            value={data.priceNote}
            path="priceNote"
            placeholder="Menú del día 15 € (2026)"
            hint="Con el año: los precios cambian."
            onChange={(priceNote) => set({ priceNote })}
          />
        </div>
        <CheckField label="Adecuado para familias con niños" checked={data.familyFriendly === true} onChange={(familyFriendly) => set({ familyFriendly: familyFriendly || undefined })} />
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
          hint="Sin verificar, la web nunca dice que es accesible."
          onChange={(status) => set({ access: { ...data.access, status, ...(status === "unknown" ? { stepFree: undefined } : {}) } })}
        />
        {data.access.status === "verified" && (
          <CheckField label="Acceso sin escalones" checked={data.access.stepFree === true} onChange={(stepFree) => set({ access: { ...data.access, stepFree } })} />
        )}
      </Section>

      <Section title="Verificación" description="Los datos de servicios cambian: la web muestra cuándo se comprobaron y avisa si hace más de 90 días.">
        <TextField
          label="Comprobado con la empresa el"
          optional
          type="date"
          value={data.checkedOn ?? undefined}
          path="checkedOn"
          hint="Fecha en que la empresa confirmó horario, precio y contacto."
          onChange={(checkedOn) => set({ checkedOn: checkedOn || null })}
        />
        <button type="button" onClick={() => set({ checkedOn: today() })} className="self-start text-sm font-semibold text-ink underline underline-offset-4">
          Marcar como comprobado hoy
        </button>
      </Section>
    </>
  );
}

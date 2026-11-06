/**
 * A complementary service: what it is, why it appears, when its data was checked, and how to
 * book or contact it. The app takes no bookings: "Reservar" opens the business's own page.
 * Examples are labelled; sponsored services are labelled and never ranked higher.
 */
import type { ReactNode } from "react";
import type { Service } from "@/domain/types";
import { isStale } from "@/domain/services";
import { formatShortDate, hoursStatusLabel } from "@/lib/hours";
import { SERVICE_CATEGORY_LABEL, priceLabel } from "@/lib/labels";
import { IconPhone } from "@/components/shell/icons";

const link =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-stone px-3.5 text-sm font-semibold text-ink hover:bg-surface-muted";

export function ExampleBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-warn/40 bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn" title="Servicio de ejemplo: no es una empresa real">
      Ejemplo<span className="sr-only">: no es una empresa real</span>
    </span>
  );
}

export function SponsoredBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-stone px-2 py-0.5 text-xs font-semibold text-ink-muted" title="Visibilidad pagada: no cambia el orden">
      Patrocinado
    </span>
  );
}

/** When the data was checked with the business, said plainly. */
export function checkedText(service: Service): string {
  if (service.demo) return "Ejemplo para probar el planificador: no es una empresa real.";
  if (!service.checkedOn) return "Datos sin comprobar con la empresa: confírmalos antes de ir.";
  const when = formatShortDate(service.checkedOn);
  return isStale(service) ? `Datos comprobados el ${when}, hace más de 90 días: pueden haber cambiado.` : `Datos comprobados con la empresa el ${when}.`;
}

export function ServiceCard({
  service,
  reasons,
  action,
  headingLevel = 3,
  id,
}: {
  service: Service;
  /** Why it appears here (from the ranking). */
  reasons?: readonly string[];
  /** Choose / remove control. */
  action?: ReactNode;
  headingLevel?: 3 | 4;
  id?: string;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  const { bookingUrl, website, phone, email } = service.contact;
  const stale = isStale(service);
  return (
    <article id={id} className="flex scroll-mt-6 flex-col gap-2 rounded-2xl border border-stone bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
        <span className="font-semibold uppercase tracking-wider">{SERVICE_CATEGORY_LABEL[service.category]}</span>
        <span>· {service.locality}</span>
        {service.priceLevel && <span aria-label={`Precio ${["económico", "medio", "alto", "muy alto"][service.priceLevel - 1]}`}>· {priceLabel(service.priceLevel)}</span>}
        {service.demo && <ExampleBadge />}
        {service.sponsored && <SponsoredBadge />}
      </div>
      <Heading className="font-display text-lg leading-snug text-ink">{service.name}</Heading>
      <p className="text-sm leading-relaxed text-ink">{service.summary}</p>
      {reasons && reasons.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Por qué aparece aquí">
          {reasons.map((r) => (
            <li key={r} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-ink">
              {r}
            </li>
          ))}
        </ul>
      )}
      <dl className="grid gap-x-3 gap-y-0.5 text-xs text-ink-muted sm:grid-cols-[auto_1fr]">
        {service.priceNote && (
          <>
            <dt className="font-semibold text-ink">Precio</dt>
            <dd>{service.priceNote}</dd>
          </>
        )}
        <dt className="font-semibold text-ink">Horario</dt>
        <dd>{service.hours.note ?? hoursStatusLabel(service.hours)}</dd>
        <dt className="font-semibold text-ink">Reserva</dt>
        <dd>{service.reservable ? "Admite reserva previa, con la propia empresa" : "Sin reserva"}</dd>
        {service.address && (
          <>
            <dt className="font-semibold text-ink">Dirección</dt>
            <dd>{service.address}</dd>
          </>
        )}
      </dl>
      <p className={`text-xs ${stale || service.demo ? "text-warn" : "text-ink-muted"}`}>{checkedText(service)}</p>
      <div className="flex flex-wrap items-center gap-2">
        {bookingUrl && (
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover">
            Reservar<span className="sr-only"> en la web de {service.name} (se abre en otra pestaña)</span>
          </a>
        )}
        {phone && (
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className={link}>
            <IconPhone width={16} height={16} aria-hidden />
            Llamar<span className="sr-only"> a {service.name}</span>
          </a>
        )}
        {website && (
          <a href={website} target="_blank" rel="noopener noreferrer" className={link}>
            Web<span className="sr-only"> de {service.name} (se abre en otra pestaña)</span>
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className={link}>
            Correo<span className="sr-only"> a {service.name}</span>
          </a>
        )}
        {action}
      </div>
    </article>
  );
}

"use client";
/**
 * Services for the trip, day by day (Mi viaje): where to eat when the lunch break comes, where to
 * sleep before the next day, a rental car, the guided visits and experiences of the day's places,
 * and other services near them. Choosing one is a planner proposal the visitor reviews (a
 * restaurant moves the lunch break there; a lodging moves where the next day starts).
 */
import Link from "next/link";
import { getService } from "@/data/content";
import { suggestForTrip, type ServiceSuggestion, type SlotSuggestions } from "@/domain/services";
import type { ServiceSlot, Trip } from "@/domain/types";
import { formatClock } from "@/domain/time";
import { formatShortDate } from "@/lib/hours";
import { useAppState } from "@/state/store";
import { requestService } from "@/components/tripview/proposals";
import { ServiceCard } from "./ServiceCard";

const choose =
  "inline-flex min-h-11 items-center rounded-full border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary hover:text-on-primary disabled:opacity-50";
const remove = "inline-flex min-h-11 items-center rounded-full border border-stone px-4 text-sm font-semibold text-ink hover:bg-surface-muted disabled:opacity-50";

const SLOT_TITLE: Record<Exclude<ServiceSlot, "activity">, string> = {
  lunch: "Dónde comer",
  overnight: "Dónde dormir",
  car: "Alquiler de coche",
};
const CHOOSE_LABEL: Record<ServiceSlot, string> = {
  lunch: "Comer aquí",
  overnight: "Dormir aquí",
  car: "Elegir este coche",
  activity: "Añadir al día",
};

function whenText(s: SlotSuggestions): string {
  if (s.slot === "lunch" && s.time !== null) return `Hacia las ${formatClock(s.time)}, ${s.where}.`;
  return `${s.where.charAt(0).toUpperCase()}${s.where.slice(1)}.`;
}

function Slot({ trip, day, data, disabled }: { trip: Trip; day: number; data: SlotSuggestions; disabled: boolean }) {
  const slot = data.slot as Exclude<ServiceSlot, "activity">;
  const chosenId = trip.services?.find((s) => s.day === day && s.slot === slot)?.serviceId;
  const chosen = chosenId ? getService(chosenId) : undefined;
  const others = data.options.filter((o) => o.service.id !== chosenId);
  const list = (items: ServiceSuggestion[]) => (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((o) => (
        <li key={o.service.id}>
          <ServiceCard
            service={o.service}
            reasons={o.reasons}
            headingLevel={4}
            action={
              <button type="button" disabled={disabled} onClick={() => requestService(day, slot, o.service.id)} className={choose}>
                {CHOOSE_LABEL[slot]}
              </button>
            }
          />
        </li>
      ))}
    </ul>
  );
  return (
    <section className="flex flex-col gap-2" aria-label={`${SLOT_TITLE[slot]}, día ${day + 1}`}>
      <h4 className="text-sm font-semibold text-ink">
        {SLOT_TITLE[slot]} <span className="font-normal text-ink-muted">· {whenText(data)}</span>
      </h4>
      {chosen ? (
        <>
          <ServiceCard
            service={chosen}
            headingLevel={4}
            action={
              <button type="button" disabled={disabled} onClick={() => requestService(day, slot, null)} className={remove}>
                Quitar del viaje
              </button>
            }
          />
          {others.length > 0 && (
            <details className="rounded-xl border border-stone">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold text-ink">Ver otras opciones ({others.length})</summary>
              <div className="p-3">{list(others)}</div>
            </details>
          )}
        </>
      ) : data.options.length > 0 ? (
        list(data.options)
      ) : (
        <p className="rounded-xl border border-dashed border-stone p-3 text-sm text-ink-muted">Todavía no hay empresas de la red para esto en la zona.</p>
      )}
    </section>
  );
}

export function TripServices({ trip }: { trip: Trip }) {
  const pending = useAppState((s) => s.pendingProposal !== null);
  const days = suggestForTrip(trip);
  const multi = days.length > 1;
  const anything = days.some((d) => d.lunch || d.overnight || d.car || d.activities.length || d.nearby.length);
  if (!anything) return null;

  return (
    <section aria-labelledby="servicios-viaje" className="flex flex-col gap-5 rounded-2xl border border-stone bg-surface-muted/40 p-4 md:p-5">
      <header className="flex flex-col gap-1">
        <h2 id="servicios-viaje" className="font-display text-2xl text-ink">
          Servicios para tu viaje
        </h2>
        <p className="text-sm text-ink-muted">
          Dónde comer, dormir, alquilar un coche y qué visitas guiadas hay en tus paradas. La app no reserva ni cobra: reservas con cada empresa.{" "}
          <Link href="/servicios#como-ordenamos" className="font-semibold text-ink underline underline-offset-4">
            Cómo ordenamos los servicios
          </Link>
          .
        </p>
      </header>

      {days.map((d) => {
        const chosenActivities = (trip.services ?? []).filter((s) => s.day === d.day && s.slot === "activity").map((s) => s.serviceId);
        if (!d.lunch && !d.overnight && !d.car && !d.activities.length && !d.nearby.length) return null;
        return (
          <section key={d.day} aria-label={multi ? `Día ${d.day + 1}` : "Tu día"} className="flex flex-col gap-4">
            {multi && (
              <h3 className="border-b border-stone pb-1 font-display text-xl text-ink">
                Día {d.day + 1}
                {d.date && <span className="ml-2 text-sm font-normal text-ink-muted">{formatShortDate(d.date)}</span>}
              </h3>
            )}
            {d.car && <Slot trip={trip} day={d.day} data={d.car} disabled={pending} />}
            {d.lunch && <Slot trip={trip} day={d.day} data={d.lunch} disabled={pending} />}
            {d.activities.length > 0 && (
              <section className="flex flex-col gap-2" aria-label={`Visitas guiadas y experiencias, día ${d.day + 1}`}>
                <h4 className="text-sm font-semibold text-ink">Visitas guiadas y experiencias en tus paradas</h4>
                <ul className="grid gap-3 md:grid-cols-2">
                  {d.activities.map((o) => {
                    const added = chosenActivities.includes(o.service.id);
                    return (
                      <li key={o.service.id}>
                        <ServiceCard
                          service={o.service}
                          reasons={o.reasons}
                          headingLevel={4}
                          action={
                            <button
                              type="button"
                              disabled={pending}
                              aria-pressed={added}
                              onClick={() => requestService(d.day, "activity", o.service.id)}
                              className={added ? remove : choose}
                            >
                              {added ? "Quitar del día" : CHOOSE_LABEL.activity}
                            </button>
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            {d.overnight && <Slot trip={trip} day={d.day} data={d.overnight} disabled={pending} />}
            {d.nearby.length > 0 && (
              <details className="rounded-xl border border-stone bg-surface">
                <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold text-ink">
                  Cerca de tus paradas: aparcamiento, cafeterías, turismo ({d.nearby.length})
                </summary>
                <ul className="grid gap-3 p-3 md:grid-cols-2">
                  {d.nearby.map((o) => (
                    <li key={o.service.id}>
                      <ServiceCard service={o.service} reasons={o.reasons} headingLevel={4} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        );
      })}
    </section>
  );
}

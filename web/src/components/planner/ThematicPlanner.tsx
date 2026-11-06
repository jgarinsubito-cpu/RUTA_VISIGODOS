"use client";
/**
 * "Organiza tu recorrido": the tailored, theme-based planner. The visitor picks themes, days,
 * where they start, hours, transport, pace and profile; the plan updates as they choose and is
 * proposed to the trip for review (nothing changes until they accept). Where to eat, sleep and
 * rent a car is then chosen day by day in Mi viaje.
 */
import Link from "next/link";
import { useId, useState } from "react";
import { getSite, localities, showcase } from "@/data/content";
import { composeThematicPlan, type ThematicRequest } from "@/domain/thematic";
import { addDays, MAX_DAYS } from "@/domain/planner";
import { parseClock } from "@/domain/time";
import type { TransportMode, TravelPace, TripContext, VisitorProfile } from "@/domain/types";
import { formatShortDate } from "@/lib/hours";
import { TRANSPORT_LABEL } from "@/lib/labels";
import { useAppState } from "@/state/store";
import { requestPlan } from "@/components/tripview/proposals";
import { DayPicker, TimeSelect } from "@/components/shared/DateTimeFields";
import { NonVisigothicBadge } from "@/components/shared/DemoBadge";
import { IconInfo, IconRoute } from "@/components/shell/icons";

const PACE_LABEL: Record<TravelPace, { label: string; hint: string }> = {
  relaxed: { label: "Tranquilo", hint: "Unas 5 horas de visitas al día" },
  balanced: { label: "Equilibrado", hint: "Unas 7 horas al día" },
  full: { label: "Intenso", hint: "Todo el horario" },
};
const PROFILE_LABEL: Record<VisitorProfile, string> = { general: "General", family: "En familia", expert: "Experto" };

const legend = "mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted";
const chip =
  "relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-stone px-4 text-sm text-ink hover:border-ink/40 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:font-semibold has-[:checked]:text-on-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink";

function capitalize(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function Radios<T extends string | number>({ name, value, options, onChange, label }: { name: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <fieldset className="flex flex-col">
      <legend className={legend}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={String(o.value)} className={chip}>
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ThematicPlanner() {
  const id = useId();
  const stored = useAppState((s) => s.context);
  const preferences = useAppState((s) => s.preferences);
  const pending = useAppState((s) => s.pendingProposal !== null);
  const tripStops = useAppState((s) => s.trip.stops.length);
  const themes = showcase().themes;
  const towns = localities();

  const [chosenThemes, setThemes] = useState<string[]>(() => preferences.interests.filter((t) => themes.includes(t)));
  const [days, setDays] = useState(Math.max(1, Math.min(MAX_DAYS, stored.days ?? 1)));
  const [start, setStart] = useState(towns.includes(stored.area) ? stored.area : (towns[0] ?? ""));
  const [pace, setPace] = useState<TravelPace>(preferences.pace ?? "balanced");
  const [includeOther, setIncludeOther] = useState(false);
  const [context, setContext] = useState<TripContext>({ ...stored, startTime: stored.startTime || "09:30", endTime: stored.endTime || "19:00" });
  const [proposed, setProposed] = useState(false);
  const patch = (p: Partial<TripContext>) => setContext((c) => ({ ...c, ...p }));
  const timeError = parseClock(context.endTime) <= parseClock(context.startTime) ? "La hora de fin debe ser posterior a la de inicio." : null;

  const request: ThematicRequest = { themes: chosenThemes, days, start, includeOther, pace, context: { ...context, area: start || context.area } };
  // A few dozen places: composing on every change is instant.
  const plan = timeError ? null : composeThematicPlan(request);

  function propose() {
    if (!plan || plan.entries.length === 0) return;
    const notes = plan.leftovers.length
      ? [`No caben en ${days === 1 ? "el día" : `los ${days} días`}: ${plan.leftovers.map((l) => getSite(l.siteId)?.name ?? l.siteId).join(", ")}. Prueba con más días o un ritmo más intenso.`]
      : [];
    if (requestPlan(plan.entries, plan.context, notes)) setProposed(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
      <header className="flex flex-col gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wider text-accent">Planificador</p>
        <h1 className="font-display text-3xl leading-tight text-ink md:text-4xl">Organiza tu recorrido</h1>
        <p className="max-w-2xl text-lead leading-relaxed text-ink-muted">
          Elige lo que te interesa y cuánto tiempo tienes. Ordenamos los lugares para que la historia se entienda y los trayectos sean cortos. Después, en Mi viaje, eliges dónde comer, dormir y alquilar un coche.
        </p>
        <p className="text-sm text-ink-muted">
          ¿Prefieres un recorrido ya hecho?{" "}
          <Link href="/rutas" className="font-semibold text-ink underline underline-offset-4">
            Ver rutas propuestas
          </Link>
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <form
          className="flex min-w-0 flex-col gap-5 rounded-2xl border border-stone bg-surface p-4 md:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            propose();
          }}
        >
          <fieldset className="flex flex-col">
            <legend className={legend}>¿Qué te interesa?</legend>
            <div className="flex flex-wrap gap-2">
              {themes.map((t) => (
                <label key={t} className={chip}>
                  <input
                    type="checkbox"
                    checked={chosenThemes.includes(t)}
                    onChange={(e) => setThemes((list) => (e.target.checked ? [...list, t] : list.filter((x) => x !== t)))}
                    className="sr-only"
                  />
                  {capitalize(t)}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-ink-muted">Sin elegir ninguno, entran todos los lugares visigodos.</p>
          </fieldset>

          <Radios
            name={`${id}-days`}
            label="¿Cuántos días?"
            value={days}
            onChange={setDays}
            options={Array.from({ length: MAX_DAYS }, (_, i) => ({ value: i + 1, label: i === 0 ? "1 día" : `${i + 1} días` }))}
          />

          <DayPicker value={context.date} onChange={(date) => patch({ date })} legend="Primer día" />
          <p className="-mt-3 text-xs text-ink-muted">Con fecha comprobamos qué abre cada día.</p>

          <div className="grid gap-4 sm:grid-cols-[auto_auto_1fr] sm:items-end">
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-start`} className={legend}>
                Desde
              </label>
              <TimeSelect id={`${id}-start`} value={context.startTime} onChange={(startTime) => patch({ startTime })} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-end`} className={legend}>
                Hasta
              </label>
              <TimeSelect id={`${id}-end`} value={context.endTime} onChange={(endTime) => patch({ endTime })} invalid={Boolean(timeError)} describedBy={timeError ? `${id}-time-error` : undefined} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-town`} className={legend}>
                Empiezas en
              </label>
              <select id={`${id}-town`} value={start} onChange={(e) => setStart(e.target.value)} className="min-h-11 rounded-xl border border-stone bg-surface px-3 text-sm text-ink">
                {towns.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {timeError && (
            <p id={`${id}-time-error`} className="-mt-3 text-sm text-danger">
              {timeError}
            </p>
          )}

          <Radios
            name={`${id}-transport`}
            label="¿Cómo te mueves?"
            value={context.transport}
            onChange={(transport: TransportMode) => patch({ transport })}
            options={(Object.keys(TRANSPORT_LABEL) as TransportMode[]).map((m) => ({ value: m, label: TRANSPORT_LABEL[m] }))}
          />
          <fieldset className="flex flex-col">
            <legend className={legend}>Ritmo</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PACE_LABEL) as TravelPace[]).map((p) => (
                <label key={p} className={chip} title={PACE_LABEL[p].hint}>
                  <input type="radio" name={`${id}-pace`} checked={pace === p} onChange={() => setPace(p)} className="sr-only" />
                  {PACE_LABEL[p].label}
                  <span className="sr-only">: {PACE_LABEL[p].hint}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-ink-muted">{PACE_LABEL[pace].hint}, sin contar la comida.</p>
          </fieldset>
          <Radios
            name={`${id}-profile`}
            label="Viajas"
            value={context.profile}
            onChange={(profile: VisitorProfile) => patch({ profile })}
            options={(Object.keys(PROFILE_LABEL) as VisitorProfile[]).map((p) => ({ value: p, label: PROFILE_LABEL[p] }))}
          />

          <div className="flex flex-col gap-1">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={includeOther} onChange={(e) => setIncludeOther(e.target.checked)} className="h-5 w-5 accent-primary" />
              Incluir patrimonio no visigodo de los mismos temas
            </label>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={context.stepFreeRequired} onChange={(e) => patch({ stepFreeRequired: e.target.checked })} className="h-5 w-5 accent-primary" />
              Necesito acceso sin escalones
            </label>
          </div>
        </form>

        <section aria-labelledby={`${id}-preview`} aria-live="polite" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-col gap-4 rounded-2xl border border-stone bg-surface p-4 md:p-5">
            <h2 id={`${id}-preview`} className="font-display text-2xl text-ink">
              Tu recorrido
            </h2>
            {!plan || plan.entries.length === 0 ? (
              <p className="text-sm text-ink-muted">{plan && plan.matched === 0 ? "Ningún lugar coincide con esos temas. Prueba con otros o incluye el patrimonio no visigodo." : "Ajusta las opciones para ver el recorrido."}</p>
            ) : (
              <>
                <ol className="flex flex-col gap-4">
                  {Array.from({ length: plan.context.days ?? 1 }, (_, d) => {
                    const list = plan.entries.filter((e) => e.day === d);
                    return (
                      <li key={d} className="flex flex-col gap-1.5">
                        <h3 className="text-sm font-semibold text-ink">
                          Día {d + 1}
                          {context.date && <span className="ml-1.5 font-normal text-ink-muted">{formatShortDate(addDays(context.date, d))}</span>}
                        </h3>
                        {list.length === 0 ? (
                          <p className="text-sm text-ink-muted">Libre: no quedan lugares que encajen.</p>
                        ) : (
                          <ol className="flex flex-col gap-1">
                            {list.map((e) => {
                              const site = getSite(e.siteId);
                              return (
                                <li key={e.siteId} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink">
                                  <span className="font-medium">{site?.name ?? e.siteId}</span>
                                  <span className="text-xs text-ink-muted">{site?.locality}</span>
                                  {site && !site.visigothic && <NonVisigothicBadge />}
                                </li>
                              );
                            })}
                          </ol>
                        )}
                      </li>
                    );
                  })}
                </ol>
                <p className="text-xs text-ink-muted">Cada día lleva una hora para comer entre las 13:00 y las 15:00. Verás las horas exactas al revisar.</p>
                {plan.leftovers.length > 0 && (
                  <div className="flex gap-2 rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm text-ink">
                    <IconInfo width={18} height={18} className="mt-0.5 shrink-0 text-warn" />
                    <p>
                      No caben: {plan.leftovers.map((l) => getSite(l.siteId)?.name ?? l.siteId).join(", ")}. Prueba con más días o un ritmo más intenso.
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={propose}
                  disabled={pending}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60"
                >
                  <IconRoute width={18} height={18} />
                  Revisar y añadir a mi viaje
                </button>
                {tripStops > 0 && <p className="text-xs text-ink-muted">Sustituirá las paradas que tienes ahora en tu viaje; lo verás antes de aceptar.</p>}
              </>
            )}
          </div>
          {proposed && tripStops > 0 && !pending && (
            <Link href="/mi-viaje" className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone bg-surface px-5 text-sm font-semibold text-ink hover:bg-surface-muted">
              Ir a Mi viaje y elegir dónde comer y dormir
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}

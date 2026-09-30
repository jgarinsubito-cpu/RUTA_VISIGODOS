"use client";
/**
 * Spanish date and time pickers for the trip settings. Native date/time popups follow the browser's
 * language and theme (English, AM/PM, bright in dark mode), so the common choices are app controls:
 *   DayPicker: "Sin fecha", "Hoy", "Mañana" and the next two weeks as chips, plus "Otra fecha".
 *   TimeSelect: 24-hour times every 30 minutes.
 */
import { useId, useState, useSyncExternalStore } from "react";

const DAYS_AHEAD = 14;

const noSubscribe = () => () => {};

/** Today on this device, or null while prerendering (so the day chips never mismatch on hydration). */
function useToday(): string | null {
  return useSyncExternalStore(noSubscribe, () => isoLocal(new Date()), () => null);
}

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const weekday = new Intl.DateTimeFormat("es-ES", { weekday: "short" });
const dayMonth = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
const longDate = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "Hoy", "Mañana" or "jue", plus "1 oct". */
function dayChip(iso: string, today: string, tomorrow: string): { top: string; bottom: string; full: string } {
  const d = parseIso(iso);
  const top = iso === today ? "Hoy" : iso === tomorrow ? "Mañana" : weekday.format(d).replace(".", "");
  return { top, bottom: dayMonth.format(d).replace(".", ""), full: longDate.format(d) };
}

const chip =
  "flex min-h-14 min-w-16 shrink-0 cursor-pointer snap-start flex-col items-center justify-center rounded-xl border border-stone bg-surface px-3 text-center text-ink transition-colors hover:border-ink/40 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-on-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink";

export function DayPicker({
  value,
  onChange,
  legend = "Fecha",
  focusId,
}: {
  value: string | null;
  onChange: (date: string | null) => void;
  legend?: string;
  /** Id for the control that receives focus from elsewhere ("Elegir fecha"). */
  focusId?: string;
}) {
  const name = useId();
  const otherId = useId();
  const todayIso = useToday();
  const now = todayIso ? parseIso(todayIso) : null;
  const today = todayIso ?? "";
  const tomorrow = now ? isoLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)) : "";
  const days = now ? Array.from({ length: DAYS_AHEAD }, (_, i) => isoLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i))) : [];
  const outside = value !== null && now !== null && !days.includes(value);
  const [showOther, setShowOther] = useState(outside);
  const focusTarget = value === null ? "none" : outside ? "other" : value;

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">{legend}</legend>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        <label className={chip}>
          <input
            type="radio"
            name={name}
            checked={value === null}
            onChange={() => onChange(null)}
            id={focusTarget === "none" ? focusId : undefined}
            className="sr-only"
          />
          <span className="text-sm font-semibold">Sin fecha</span>
        </label>
        {days.map((iso) => {
          const c = dayChip(iso, today, tomorrow);
          return (
            <label key={iso} className={chip}>
              <input
                type="radio"
                name={name}
                checked={value === iso}
                onChange={() => onChange(iso)}
                id={focusTarget === iso ? focusId : undefined}
                aria-label={c.full}
                className="sr-only"
              />
              <span aria-hidden="true" className="text-xs font-semibold capitalize">
                {c.top}
              </span>
              <span aria-hidden="true" className="text-sm">
                {c.bottom}
              </span>
            </label>
          );
        })}
      </div>
      {showOther ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={otherId} className="text-sm text-ink-muted">
            Otra fecha
          </label>
          <input
            id={focusTarget === "other" && focusId ? focusId : otherId}
            type="date"
            lang="es"
            min={today}
            value={outside ? value ?? "" : ""}
            onChange={(e) => onChange(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value) ? e.target.value : null)}
            className="min-h-11 w-full max-w-xs rounded-xl border border-stone bg-surface px-3 text-base text-ink"
          />
          {outside && value && <p className="text-xs text-ink-muted">{longDate.format(parseIso(value))}</p>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowOther(true)}
          className="min-h-11 self-start text-sm font-semibold text-ink underline-offset-4 hover:underline"
        >
          Otra fecha…
        </button>
      )}
    </fieldset>
  );
}

/** 24-hour times every 30 minutes from 06:00 to 23:30 (keeps an off-step current value). */
export function TimeSelect({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const times: string[] = [];
  for (let m = 6 * 60; m < 24 * 60; m += 30) times.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  if (value && !times.includes(value)) times.push(value);
  times.sort();
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className="min-h-11 w-full rounded-xl border border-stone bg-surface px-3 text-base tabular-nums text-ink"
    >
      {times.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

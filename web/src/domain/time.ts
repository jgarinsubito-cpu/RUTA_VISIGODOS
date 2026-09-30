/**
 * Local clock and calendar helpers shared by the planner, the hours labels and the UI.
 * Times are "HH:mm" in Europe/Madrid; dates are calendar dates "YYYY-MM-DD". Pure functions.
 */

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  7: "Dom",
};

export const WEEKDAY_LONG: Record<Weekday, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
  7: "domingo",
};

/** "los lunes", "los sábados": the recurring form used in closure notes. */
export const WEEKDAY_PLURAL: Record<Weekday, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábados",
  7: "domingos",
};

/**
 * ISO weekday (1 = Monday … 7 = Sunday) of a local Europe/Madrid calendar date "YYYY-MM-DD".
 * Computed purely on the calendar date (UTC arithmetic at noon), so DST changes and the
 * runtime's own time zone cannot shift the day. Returns null for malformed dates.
 */
export function isoWeekday(date: string): Weekday | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d, 12));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  const js = dt.getUTCDay();
  return (js === 0 ? 7 : js) as Weekday;
}

/** Minutes from midnight -> "HH:mm". */
export function formatClock(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:mm" -> minutes from midnight. */
export function parseClock(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** "HH:mm" -> minutes from midnight, or null when the string is not a valid clock time. */
export function parseClockStrict(value: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

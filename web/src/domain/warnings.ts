/**
 * Stop warnings: Spanish wording and trip-wide grouping. The planner emits structured
 * StopWarning values; everything a visitor reads about them is rendered here, so the same warning
 * reads the same in the trip, the review dialog and the assistant.
 */
import type { StopWarning, StopWarningCode, TripStop } from "./types";
import { formatClock, WEEKDAY_PLURAL } from "./time";

export const WARN_NO_DATE = "Elige una fecha para comprobar horarios";
export const WARN_EXAMPLE_HOURS = "Horario de ejemplo (no verificado)";
export const WARN_UNKNOWN_HOURS = "Horario sin verificar";
export const WARN_ACCESS = "Accesibilidad sin verificar";
export const WARN_TOO_FAR = "Demasiado lejos para ir a pie";
export const WARN_TRAVEL_ESTIMATE = "Tiempos de desplazamiento aproximados (estimación, no ruta real)";

/** Facts from verified hours are stated; placeholder hours are phrased conditionally and say so. */
function qualify(verified: boolean, fact: string, conditional: string): string {
  return verified ? fact : `Según el horario de ejemplo (no verificado), ${conditional}`;
}

/** Full sentence for one warning at `siteName`. */
export function describeWarning(w: StopWarning, siteName: string): string {
  switch (w.code) {
    case "no-date":
      return WARN_NO_DATE;
    case "example-hours":
      return WARN_EXAMPLE_HOURS;
    case "unknown-hours":
      return WARN_UNKNOWN_HOURS;
    case "access-unverified":
      return WARN_ACCESS;
    case "too-far-walk":
      return WARN_TOO_FAR;
    case "wait":
      return `Espera hasta las ${formatClock(w.until)} (${w.verified ? "abre a esa hora" : "abriría a esa hora según el horario de ejemplo"})`;
    case "closed-day":
      return qualify(w.verified, `${siteName} cierra los ${WEEKDAY_PLURAL[w.weekday]}`, `${siteName} cerraría los ${WEEKDAY_PLURAL[w.weekday]}`);
    case "closed-on-arrival": {
      const close = formatClock(w.close);
      const arrival = formatClock(w.arrival);
      return qualify(
        w.verified,
        `${siteName} cierra a las ${close} y ya estará cerrado al llegar (${arrival})`,
        `${siteName} cerraría a las ${close} y ya estaría cerrado al llegar (${arrival})`,
      );
    }
    case "no-time": {
      const close = formatClock(w.close);
      return qualify(
        w.verified,
        `${siteName} cierra a las ${close} y no da tiempo a la visita`,
        `${siteName} cerraría a las ${close} y no daría tiempo a la visita`,
      );
    }
    case "past-end":
      return `La visita a ${siteName} terminaría a las ${formatClock(w.departure)}, después de tu hora de fin (${w.endTime})`;
  }
}

/** Stable identity for comparing warnings across a before/after proposal. */
export function warningKey(w: StopWarning): string {
  return JSON.stringify(w);
}

/** About the data rather than the schedule: said once when every stop has it. */
const TRIP_WIDE_WHEN_ALL: StopWarningCode[] = ["example-hours", "unknown-hours", "access-unverified"];

export interface WarningGroups {
  /** Warnings said once for the whole trip instead of on each stop. */
  shared: StopWarning[];
  /** Codes to leave out of each stop because `shared` already says them. */
  hiddenCodes: ReadonlySet<StopWarningCode>;
}

/**
 * "Choose a date" is fixed by one date for the whole trip, so it is always trip-wide. Data notes
 * (example hours, unverified access…) move to trip level only when they apply to every stop, so a
 * stop that differs still shows its own label.
 */
export function groupWarnings(stops: TripStop[]): WarningGroups {
  const shared: StopWarning[] = [];
  if (stops.some((s) => s.warnings.some((w) => w.code === "no-date"))) shared.push({ code: "no-date" });
  if (stops.length >= 2) {
    for (const code of TRIP_WIDE_WHEN_ALL) {
      if (stops.every((s) => s.warnings.some((w) => w.code === code))) shared.push({ code } as StopWarning);
    }
  }
  return { shared, hiddenCodes: new Set(shared.map((w) => w.code)) };
}

/** Wording for a trip-wide warning from groupWarnings. */
export function describeSharedWarning(w: StopWarning): string {
  return w.code === "no-date" ? WARN_NO_DATE : `En todas las paradas: ${describeWarning(w, "").toLowerCase()}`;
}

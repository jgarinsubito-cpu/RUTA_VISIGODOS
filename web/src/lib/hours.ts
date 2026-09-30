/**
 * Honest rendering of OpeningInfo / AccessInfo (PLAN.md: unknown is unknown, never "open").
 * Pure helpers; the HoursLabel component renders their output.
 */
import type { AccessInfo, OpeningInfo, TimeWindow } from "@/domain/types";
import { isoWeekday, WEEKDAY_LONG, WEEKDAY_SHORT, WEEKDAYS, type Weekday } from "@/domain/time";

export { isoWeekday, WEEKDAY_LONG, WEEKDAY_SHORT, type Weekday };

export type HoursTone = OpeningInfo["status"];

export interface HoursRow {
  days: string;
  text: string;
}

/** "YYYY-MM-DD" (or ISO datetime) -> "DD/MM/YYYY"; falls back to the raw string. */
export function formatShortDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

export function hoursStatusLabel(info: OpeningInfo): string {
  switch (info.status) {
    case "verified":
      return info.verifiedAt ? `Horario verificado el ${formatShortDate(info.verifiedAt)}` : "Horario verificado";
    case "example":
      return "Horario de ejemplo (no verificado)";
    default:
      return "Sin verificar";
  }
}

export function formatWindows(windows: TimeWindow[]): string {
  return windows.map((w) => `${w.open}–${w.close}`).join(" y ");
}

/** Weekly schedule grouped into consecutive days with identical windows. Empty when unknown. */
export function weeklyRows(info: OpeningInfo): HoursRow[] {
  if (info.status === "unknown") return [];
  if (info.alwaysOpen) return [{ days: "Todos los días", text: "Acceso libre (espacio exterior)" }];
  if (!info.weekly) return [];
  const weekly = info.weekly;
  const textFor = (d: Weekday) => {
    const w = weekly[d];
    return w && w.length > 0 ? formatWindows(w) : "Cerrado";
  };
  const rows: HoursRow[] = [];
  let start: Weekday = 1;
  for (let i = 0; i < WEEKDAYS.length; i++) {
    const day = WEEKDAYS[i];
    const next = WEEKDAYS[i + 1];
    if (next !== undefined && textFor(next) === textFor(day)) continue;
    rows.push({
      days: start === day ? WEEKDAY_SHORT[day] : `${WEEKDAY_SHORT[start]}–${WEEKDAY_SHORT[day]}`,
      text: textFor(day),
    });
    if (next !== undefined) start = next;
  }
  return rows;
}

/** Hours for one date. Never claims "open" for unknown data. */
export function dayHoursText(info: OpeningInfo, date: string): string {
  if (info.status === "unknown") return "Sin verificar";
  if (info.alwaysOpen) return "Acceso libre";
  const weekday = isoWeekday(date);
  if (!info.weekly || weekday === null) return "Sin datos";
  const windows = info.weekly[weekday];
  return windows && windows.length > 0 ? formatWindows(windows) : "Cerrado";
}

function dayLabel(date: string): string {
  const weekday = isoWeekday(date);
  return weekday ? `${WEEKDAY_LONG[weekday]} ${formatShortDate(date)}` : formatShortDate(date);
}

export interface HoursDescription {
  tone: HoursTone;
  statusLabel: string;
  rows: HoursRow[];
  /** Present only when a date is given. */
  day?: { label: string; text: string };
  note?: string;
}

export function describeHours(info: OpeningInfo, date?: string | null): HoursDescription {
  return {
    tone: info.status,
    statusLabel: hoursStatusLabel(info),
    rows: weeklyRows(info),
    day: date ? { label: dayLabel(date), text: dayHoursText(info, date) } : undefined,
    note: info.note,
  };
}

/** Access is only described as accessible when verified as step-free. */
export function accessLabel(access: AccessInfo): string {
  if (access.status !== "verified") return "Sin verificar";
  if (access.stepFree === true) return "Accesible sin escalones (verificado)";
  if (access.stepFree === false) return "Con escalones o barreras (verificado)";
  return "Verificado: consulta la nota";
}

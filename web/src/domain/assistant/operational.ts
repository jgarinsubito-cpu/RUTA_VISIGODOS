/**
 * Honest Spanish descriptions of operational data (hours, access, duration). Example hours are
 * always labelled as such and unknown data is "Sin verificar" — never presented as open/accessible.
 */
import type { OpeningInfo, Site, TimeWindow } from "@/domain/types";

const DAY_SHORT = ["", "lun", "mar", "mié", "jue", "vie", "sáb", "dom"] as const;
type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

function windowsLabel(windows: TimeWindow[]): string {
  return windows.map((w) => `${w.open}–${w.close}`).join(" y ");
}

/** "mar–vie 10:00–14:30 y 16:00–18:30; sáb 10:00–18:30; lun cerrado". */
export function weeklyLabel(weekly: NonNullable<OpeningInfo["weekly"]>): string {
  const groups: { from: Weekday; to: Weekday; label: string }[] = [];
  for (let n = 1; n <= 7; n++) {
    const d = n as Weekday;
    const windows = weekly[d];
    const label = windows && windows.length > 0 ? windowsLabel(windows) : "cerrado";
    const last = groups[groups.length - 1];
    if (last && last.label === label && last.to === d - 1) last.to = d;
    else groups.push({ from: d, to: d, label });
  }
  return groups
    .map((g) => `${g.from === g.to ? DAY_SHORT[g.from] : `${DAY_SHORT[g.from]}–${DAY_SHORT[g.to]}`} ${g.label}`)
    .join("; ");
}

export function hoursSentence(site: Site): string {
  const h = site.hours;
  if (h.status === "unknown") return "Horario: sin verificar. Consulta la web oficial antes de ir.";
  const prefix = h.status === "example" ? "Horario de ejemplo (no verificado)" : `Horario verificado${h.verifiedAt ? ` el ${h.verifiedAt}` : ""}`;
  if (h.alwaysOpen) return `${prefix}: espacio exterior sin horario fijo; las condiciones de acceso están sin verificar.`;
  if (h.weekly) return `${prefix}: ${weeklyLabel(h.weekly)}.`;
  return `${prefix}: sin franjas registradas.`;
}

export function accessSentence(site: Site): string {
  if (site.access.status === "unknown") return "Accesibilidad: sin verificar.";
  if (site.access.stepFree) return "Acceso sin escalones (verificado).";
  return `Acceso con limitaciones (verificado)${site.access.note ? `: ${site.access.note}` : ""}.`;
}

export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Shared Spanish labels and small formatters for UI text. */
import type { SiteKind, TransportMode } from "@/domain/types";

export const KIND_LABEL: Record<SiteKind, string> = {
  museum: "Museo",
  archaeological: "Yacimiento arqueológico",
  monument: "Monumento",
  landscape: "Paisaje y territorio",
  service: "Servicio",
};

export const TRANSPORT_LABEL: Record<TransportMode, string> = {
  walk: "A pie",
  car: "En coche",
};

/** 45 -> "45 min", 60 -> "1 h", 210 -> "3 h 30 min". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function travelLegText(minutes: number, transport?: TransportMode): string {
  const how = transport === "car" ? "en coche" : transport === "walk" ? "a pie" : "de trayecto";
  return `${formatDuration(minutes)} ${how}`;
}

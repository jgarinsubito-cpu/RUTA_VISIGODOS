/** Shared Spanish labels and small formatters for UI text. */
import type { AccessNeed, ServiceCategory, SiteKind, TransportMode, TravelGroup, TravelPace } from "@/domain/types";

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

export const PACE_LABEL: Record<TravelPace, { label: string; hint: string }> = {
  relaxed: { label: "Tranquilo", hint: "Pocas paradas y tiempo de sobra" },
  balanced: { label: "Equilibrado", hint: "Lo esencial sin prisas" },
  full: { label: "Intenso", hint: "Aprovechar al máximo el día" },
};

export const GROUP_LABEL: Record<TravelGroup, string> = {
  solo: "Solo",
  couple: "En pareja",
  family: "Con niños",
  friends: "Con amigos",
  seniors: "Con personas mayores",
};

/** Access needs as visitors would say them, with what the app does about each. */
export const ACCESS_NEED_LABEL: Record<AccessNeed, { label: string; effect: string }> = {
  wheelchair: { label: "Silla de ruedas", effect: "Marcamos las paradas sin acceso sin escalones verificado." },
  "reduced-mobility": { label: "Movilidad reducida", effect: "Marcamos las paradas sin acceso sin escalones verificado." },
  stroller: { label: "Carrito de bebé", effect: "Marcamos las paradas sin acceso sin escalones verificado." },
  "avoid-slopes": { label: "Evitar cuestas", effect: "Te avisamos cuando una ruta a pie tiene cuestas o no sabemos sus pendientes." },
  "rest-stops": { label: "Descansos frecuentes", effect: "El asistente propone menos paradas y más tiempo." },
  "low-vision": { label: "Baja visión", effect: "Puedes activar el texto grande; el asistente lo tiene en cuenta." },
  hearing: { label: "Sordera o hipoacusia", effect: "Toda narración tiene su texto; el asistente lo recuerda." },
  quiet: { label: "Lugares tranquilos", effect: "El asistente lo tiene en cuenta al recomendar." },
};

/** "arqueología" -> "Arqueología". */
export function themeLabel(theme: string): string {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

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

/** Complementary service categories, as visitors read them. */
export const SERVICE_CATEGORY_LABEL: Record<ServiceCategory, string> = {
  restaurant: "Restaurante",
  cafe: "Cafetería",
  lodging: "Alojamiento",
  "car-rental": "Alquiler de coches",
  "guided-visit": "Visita guiada",
  experience: "Experiencia",
  transport: "Transporte",
  shop: "Tienda y productos locales",
  parking: "Aparcamiento",
  "tourist-office": "Oficina de turismo",
};

/** Plural headings for lists of services. */
export const SERVICE_CATEGORY_PLURAL: Record<ServiceCategory, string> = {
  restaurant: "Dónde comer",
  cafe: "Cafeterías",
  lodging: "Dónde dormir",
  "car-rental": "Alquiler de coches",
  "guided-visit": "Visitas guiadas",
  experience: "Experiencias",
  transport: "Transporte",
  shop: "Tiendas y productos locales",
  parking: "Aparcamientos",
  "tourist-office": "Oficinas de turismo",
};

/** "€€" for a price level. */
export function priceLabel(level: 1 | 2 | 3 | 4): string {
  return "€".repeat(level);
}

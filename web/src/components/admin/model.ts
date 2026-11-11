/** Names, addresses and summaries the admin screens share. */
import { buildCatalog, liveData, recordKey, stableJson, type AnyRecord, type RecordStatus } from "@/domain/editorial/records";
import type { RecordDataByKind, RecordKind } from "@/domain/editorial/schema";
import type { Catalog } from "@/domain/types";

export const KIND_INFO: Record<RecordKind, { one: string; many: string; path: string; newLabel: string }> = {
  site: { one: "Lugar", many: "Lugares", path: "/admin/lugares", newLabel: "Nuevo lugar" },
  stop: { one: "Parada", many: "Paradas", path: "/admin/paradas", newLabel: "Nueva parada" },
  service: { one: "Servicio", many: "Servicios", path: "/admin/servicios", newLabel: "Nuevo servicio" },
  piece: { one: "Pieza", many: "Piezas de museo", path: "/admin/piezas", newLabel: "Nueva pieza" },
  claim: { one: "Ficha", many: "Fichas", path: "/admin/fichas", newLabel: "Nueva ficha" },
  story: { one: "Relato", many: "Relatos", path: "/admin/relatos", newLabel: "Nuevo relato" },
  route: { one: "Ruta", many: "Rutas", path: "/admin/rutas", newLabel: "Nueva ruta" },
  showcase: { one: "Portada y asistente", many: "Portada y asistente", path: "/admin/portada", newLabel: "" },
};

export function editPath(record: { kind: RecordKind; id: string }): string {
  return record.kind === "showcase" ? KIND_INFO.showcase.path : `${KIND_INFO[record.kind].path}/${record.id}`;
}

export const STATUS_LABEL: Record<RecordStatus, string> = {
  draft: "Borrador",
  review: "En revisión",
  published: "Publicado",
  retired: "Retirado",
};

/** What a record is called in lists. */
export function recordTitle(record: { kind: RecordKind; data: unknown }): string {
  switch (record.kind) {
    case "site":
      return (record.data as RecordDataByKind["site"]).name || "Lugar sin nombre";
    case "stop":
      return (record.data as RecordDataByKind["stop"]).name || "Parada sin nombre";
    case "service":
      return (record.data as RecordDataByKind["service"]).name || "Servicio sin nombre";
    case "piece":
      return (record.data as RecordDataByKind["piece"]).name || "Pieza sin nombre";
    case "claim": {
      const text = (record.data as RecordDataByKind["claim"]).text || "Ficha sin texto";
      return text.length > 90 ? `${text.slice(0, 88)}…` : text;
    }
    case "story":
      return (record.data as RecordDataByKind["story"]).title || "Relato sin título";
    case "route":
      return (record.data as RecordDataByKind["route"]).name || "Ruta sin nombre";
    default:
      return "Portada y asistente";
  }
}

/** Readable names for the fields an error can point to ("image.alt" → "Foto: texto alternativo"). */
const FIELD_LABEL: Record<string, string> = {
  name: "Nombre",
  slug: "Dirección web",
  locality: "Localidad",
  kind: "Tipo",
  tagline: "Entradilla",
  summary: "Resumen",
  coordinates: "Coordenadas",
  visitMinutes: "Duración de la visita",
  hours: "Horario",
  access: "Accesibilidad",
  themes: "Temas",
  image: "Foto",
  "image.src": "Foto",
  "image.alt": "Foto: texto alternativo",
  "image.author": "Foto: autoría",
  "image.license": "Foto: licencia",
  "image.sourceUrl": "Foto: página de origen",
  "image.focus": "Foto: encuadre",
  category: "Categoría",
  address: "Dirección postal",
  phone: "Teléfono",
  officialUrl: "Web oficial",
  sources: "Fuentes",
  aliases: "Otros nombres",
  suggestedPrompts: "Preguntas sugeridas",
  siteId: "Lugar",
  text: "Texto",
  evidence: "Nivel de evidencia",
  attribution: "Atribución",
  source: "Fuente",
  "source.title": "Fuente: título",
  "source.url": "Fuente: enlace",
  "source.page": "Fuente: página",
  keywords: "Palabras clave",
  title: "Título",
  body: "Texto del relato",
  claimIds: "Fichas",
  audience: "Público",
  minutes: "Minutos",
  theme: "Tema",
  stopIds: "Paradas",
  transport: "Transporte",
  limitations: "Limitaciones",
  localities: "Localidades",
  regionName: "Nombre de toda la zona",
  heroSiteId: "Lugar de portada",
  heroTitle: "Titular de portada",
  heroIntro: "Entradilla de portada",
  placeGroups: "Grupos de lugares",
  assistantIntro: "Bienvenida del asistente",
  starterPrompts: "Preguntas de inicio",
  generalPrompts: "Preguntas generales",
  assistantExamples: "Ejemplos del asistente",
  heritageKeywords: "Palabras clave históricas",
  gettingThere: "Cómo llegar",
  areaHints: "Ayudas de zona",
  transportHints: "Ayudas de transporte",
  familyPrompt: "Pregunta para familias",
  order: "Orden en el lugar",
  radiusMeters: "Radio de llegada",
  indoor: "En interior",
  routeOnly: "Solo en rutas",
  audio: "Locución",
  "audio.src": "Locución: archivo",
  "audio.durationSeconds": "Locución: duración",
  "audio.label": "Locución: etiqueta",
  "audio.transcript": "Locución: transcripción",
  "audio.credit": "Locución: créditos",
  gallery: "Imágenes",
  models: "Modelos 3D",
  illustratedMap: "Mapa ilustrado",
  stopId: "Parada",
  tourStopIds: "Recorrido guiado",
};

export function fieldLabel(path: string): string {
  const parts = path.split(".");
  for (let n = parts.length; n > 0; n--) {
    const label = FIELD_LABEL[parts.slice(0, n).join(".")];
    if (label) return label;
  }
  return path || "Registro";
}

/** Top-level fields whose working copy differs from what the web shows. */
export function changedFields(record: AnyRecord, live: Catalog | null): string[] {
  const before = liveData(live, record.kind, record.id) as Record<string, unknown> | undefined;
  if (!before) return [];
  const after = record.data as Record<string, unknown>;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((k) => stableJson(before[k]) !== stableJson(after[k])).map(fieldLabel);
}

/** The catalog with every working copy (drafts and reviews): what editors try out before review. */
export function previewCatalog(records: readonly AnyRecord[], live: Catalog | null, override?: AnyRecord): Catalog {
  const list = override ? [...records.filter((r) => recordKey(r) !== recordKey(override)), override] : records;
  return buildCatalog(list, live, { mode: "preview" });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" }).format(new Date(iso));
}

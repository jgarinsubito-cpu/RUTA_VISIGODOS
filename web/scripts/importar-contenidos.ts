/**
 * Importa los contenidos definitivos de la Ruta Visigoda (recorridos, paradas, relatos, locuciones,
 * fotos, ilustraciones y modelos 3D) al formato del gestor de contenidos (docs/ADMIN.md).
 *
 * Uso (desde web/):
 *   npx tsx scripts/importar-contenidos.ts --origen <carpeta con data.json, img/, audio/, 3d/>
 *     [--config ../contenidos/config-importacion.json] [--salida ../contenidos/salida]
 *     [--copiar-medios]   copia fotos, audios y modelos a web/public
 *     [--subir]           sube los registros al gestor «en revisión» (necesita variables de entorno)
 *     [--actualizar]      con --subir: también reemplaza registros que ya existen (vuelven a revisión)
 *     [--incluir-borradores]  incluye afirmaciones aún no validadas (solo para previsualizar; nunca con --subir)
 *
 * Nunca publica nada: los registros entran «en revisión» y solo un validador los publica en /admin.
 * Comprueba todo con las mismas reglas que el gestor (schema.ts y validate.ts) antes de escribir.
 *
 * Entradas opcionales del equipo de contenidos (en la carpeta de la configuración):
 *   creditos-imagenes.csv  autor, licencia y URL de cada imagen; sin ellos, la imagen no se publica.
 *   afirmaciones.json      afirmaciones validadas por parada; sin ellas, los relatos no entran como
 *                          historias (el gestor exige que cada historia cite al menos una).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseCatalog } from "@/domain/editorial/schema";
import { validateCatalog } from "@/domain/editorial/validate";
import { recordsFromCatalog } from "@/domain/editorial/records";
import type {
  Catalog,
  EvidenceLevel,
  OpeningInfo,
  PlaceImage,
  PlaceTone,
  Route,
  Showcase,
  Site,
  SiteKind,
  Story,
  TransportMode,
  ValidatedClaim,
} from "@/domain/types";

/* ---------- Tipos de la fuente (data.json del prototipo) ---------- */

interface Modelo3dFuente {
  file: string;
  name: string;
  status: string;
  cls?: string;
  text?: string;
  src?: string;
}
interface ParadaFuente {
  id: string;
  route: string;
  k?: string | number;
  n?: string | number;
  name: string;
  sub?: string;
  zone?: string;
  title?: string;
  text?: string;
  guion?: string;
  audio?: string;
  audiolabel?: string;
  photos?: string[] | string;
  hero?: string;
  lat?: string | number;
  lon?: string | number;
  approx?: boolean;
  coordnote?: string;
  info?: string;
  models3d?: Modelo3dFuente[];
  fig3d?: { img: string; cap?: string; src?: string };
}
interface RecorridoFuente {
  id: string;
  name: string;
  sub?: string;
  place?: string;
  illus?: { img: string; w: number; h: number; cap?: string };
}
interface FichaImagen {
  title?: string;
  ref?: string;
  table?: [string, string][];
  body?: [string, string][];
}
interface Fuente {
  stops: ParadaFuente[];
  routes: RecorridoFuente[];
  fichas: Record<string, FichaImagen>;
}

/* ---------- Configuración ---------- */

interface ConfigRecorrido {
  id: string;
  nombre: string;
  tema: string;
  resumen: string;
  transporte: TransportMode;
  tipo: SiteKind;
  visigodo: boolean;
  tono: PlaceTone;
  temas: string[];
  limitaciones: string[];
}
interface ConfigParada {
  visigodo?: boolean;
  tipo?: SiteKind;
  tono?: PlaceTone;
  localidad?: string;
  nombre?: string;
  revisar?: string;
}
interface Config {
  recorridos: Record<string, ConfigRecorrido>;
  paradas: Record<string, ConfigParada>;
  portada: {
    localidades: string[];
    zona: string;
    temas: string[];
    paradaPortada: string;
    tituloPortada: string;
    introPortada: string;
    comoLlegar: Record<string, string>;
    ayudaZonas: Record<string, string>;
    ayudaTransporte: { walk: string; car: string };
  };
}

/** Afirmación validada, tal como la entrega el equipo de contenidos (afirmaciones.json). */
interface AfirmacionEntrada {
  id: string;
  /** borrador · validada · pendiente-fuente. Solo las validadas llegan al gestor. */
  estado?: string;
  parada: string;
  texto: string;
  nivel: EvidenceLevel;
  atribucion?: string;
  fuente: { titulo: string; pagina?: string; url?: string };
  palabrasClave: string[];
}

interface Credito {
  archivo: string;
  paradas: string;
  alt: string;
  pie: string;
  autor: string;
  licencia: string;
  url_fuente: string;
}

/* ---------- Utilidades ---------- */

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const webDir = path.resolve(__dirname, "..");
const origen = option("origen");
if (!origen) {
  console.error("Falta --origen <carpeta con data.json>");
  process.exit(1);
}
const configPath = path.resolve(option("config", path.join(webDir, "../contenidos/config-importacion.json"))!);
const configDir = path.dirname(configPath);
const salida = path.resolve(option("salida", path.join(configDir, "salida"))!);

/** Identificador válido para el gestor: minúsculas sin tildes, números y guiones. */
function idFrom(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/, "");
}

/** Corta un texto en el último final de frase que quepa en `max` caracteres. */
function cutAtSentence(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const end = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
  return end > max / 3 ? slice.slice(0, end + 1) : `${slice.slice(0, max - 1).trimEnd()}…`;
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Reparte los párrafos en bloques de como máximo `max` caracteres, sin partir párrafos si se puede. */
function chunkParagraphs(paras: string[], max: number): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const p of paras) {
    const piece = p.length > max ? cutAtSentence(p, max) : p;
    if (current && current.length + 2 + piece.length > max) {
      chunks.push(current);
      current = piece;
    } else current = current ? `${current}\n\n${piece}` : piece;
  }
  if (current) chunks.push(current);
  return chunks;
}

function probe(file: string): { duration?: number; width?: number; height?: number } {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration:stream=width,height", "-of", "json", file],
      { encoding: "utf8" },
    );
    const json = JSON.parse(out) as { format?: { duration?: string }; streams?: { width?: number; height?: number }[] };
    const stream = json.streams?.find((s) => s.width);
    return { duration: json.format?.duration ? Number(json.format.duration) : undefined, width: stream?.width, height: stream?.height };
  } catch {
    return {};
  }
}

function readCsv(file: string): Record<string, string>[] {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((f) => f.trim()));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const csvField = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/* ---------- Lectura ---------- */

const fuente = JSON.parse(fs.readFileSync(path.join(origen, "data.json"), "utf8")) as Fuente;
const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as Config;

const creditosPath = path.join(configDir, "creditos-imagenes.csv");
const creditos = new Map<string, Credito>();
if (fs.existsSync(creditosPath)) {
  for (const row of readCsv(creditosPath)) creditos.set(row.archivo, row as unknown as Credito);
}

const afirmacionesPath = path.join(configDir, "afirmaciones.json");
const todasLasAfirmaciones: AfirmacionEntrada[] = fs.existsSync(afirmacionesPath)
  ? (JSON.parse(fs.readFileSync(afirmacionesPath, "utf8")) as AfirmacionEntrada[])
  : [];
if (flag("incluir-borradores") && flag("subir")) {
  console.error("--incluir-borradores es solo para previsualizar: no se puede combinar con --subir.");
  process.exit(1);
}
// Solo las afirmaciones validadas por Rojas / Urbs Regia entran en el gestor.
const afirmaciones = flag("incluir-borradores") ? todasLasAfirmaciones : todasLasAfirmaciones.filter((a) => a.estado === "validada");
const afirmacionesSinValidar = todasLasAfirmaciones.length - afirmaciones.length;

/* ---------- Informe ---------- */

const avisos = {
  coordenadas: [] as string[],
  revisar: [] as string[],
  historiasPartidas: [] as string[],
  historiasSinAfirmaciones: [] as string[],
  imagenesSinCredito: new Set<string>(),
  mediosQueFaltan: [] as string[],
  otros: [] as string[],
};

/* ---------- Conversión ---------- */

const siteId = (p: ParadaFuente) => `site-parada-${idFrom(p.id)}`;
const photosOf = (p: ParadaFuente): string[] =>
  Array.isArray(p.photos) ? p.photos : typeof p.photos === "string" && p.photos.trim().startsWith("[") ? (JSON.parse(p.photos) as string[]) : [];

function coordinatesOf(p: ParadaFuente, all: ParadaFuente[]): Site["coordinates"] {
  const lat = Number(p.lat);
  const lng = Number(p.lon);
  const note = p.coordnote ?? "";
  if (p.lat !== undefined && p.lat !== "" && Number.isFinite(lat) && Number.isFinite(lng)) {
    const field = /toma de campo/i.test(note) && !/provisional|pendiente|aproximad/i.test(note);
    const approximate = Boolean(p.approx) || !field;
    return { lat, lng, approximate };
  }
  const located = all.filter((o) => o.route === p.route && o.lat !== undefined && o.lat !== "" && Number.isFinite(Number(o.lat)));
  if (located.length === 0) throw new Error(`La parada ${p.id} no tiene coordenadas ni paradas vecinas con coordenadas.`);
  const c = {
    lat: Number((located.reduce((s, o) => s + Number(o.lat), 0) / located.length).toFixed(6)),
    lng: Number((located.reduce((s, o) => s + Number(o.lon), 0) / located.length).toFixed(6)),
    approximate: true,
  };
  avisos.coordenadas.push(`${p.id} (${p.name}): sin coordenada; se usa provisionalmente el centro de su recorrido (${c.lat}, ${c.lng}).`);
  return c;
}

function imageFor(file: string, stopName: string): PlaceImage | undefined {
  const credit = creditos.get(file);
  const full = path.join(origen!, "img", `${file}.jpg`);
  if (!fs.existsSync(full)) {
    avisos.mediosQueFaltan.push(`img/${file}.jpg`);
    return undefined;
  }
  if (!credit?.autor || !credit.licencia || !/^https:\/\//.test(credit.url_fuente ?? "")) {
    avisos.imagenesSinCredito.add(file);
    return undefined;
  }
  const { width, height } = probe(full);
  if (!width || !height) {
    avisos.otros.push(`No se pudo leer el tamaño de img/${file}.jpg.`);
    return undefined;
  }
  return {
    src: `/images/ruta/${file}.jpg`,
    width,
    height,
    alt: (credit.alt || stopName).slice(0, 300),
    author: credit.autor.slice(0, 200),
    license: credit.licencia.slice(0, 80),
    sourceUrl: credit.url_fuente,
    ...(credit.pie ? { caption: credit.pie.slice(0, 300) } : {}),
  };
}

const sites: Site[] = [];
const stories: Story[] = [];
const claims: ValidatedClaim[] = [];
const routes: Route[] = [];
const extensiones: Record<string, unknown>[] = [];
const imagenesUsadas = new Map<string, Set<string>>();

const recorridos = fuente.routes.filter((r) => config.recorridos[r.id]);
for (const r of fuente.routes) if (!config.recorridos[r.id]) avisos.otros.push(`El recorrido «${r.id}» no está en la configuración: no se importa.`);

for (const recorrido of recorridos) {
  const cfg = config.recorridos[recorrido.id];
  const paradas = fuente.stops
    .filter((p) => p.route === recorrido.id)
    .sort((a, b) => Number(a.k ?? a.n ?? 0) - Number(b.k ?? b.n ?? 0));

  paradas.forEach((p, index) => {
    const over = config.paradas[p.id] ?? {};
    if (over.revisar) avisos.revisar.push(`${p.id} (${p.name}): ${over.revisar}`);
    const id = siteId(p);
    const name = (over.nombre ?? p.name).slice(0, 120);
    const relato = paragraphs(p.text ?? "");
    const summary = relato.length ? cutAtSentence(relato[0], 1200) : (p.sub || name);

    // Audio: duración real para el tiempo de visita y la extensión de locución.
    let audioSeconds: number | undefined;
    if (p.audio) {
      const file = path.join(origen!, "audio", p.audio);
      if (fs.existsSync(file)) audioSeconds = probe(file).duration;
      else avisos.mediosQueFaltan.push(`audio/${p.audio}`);
    }
    const visitMinutes = Math.min(600, Math.max(5, Math.round((audioSeconds ?? 0) / 60) + 5));

    const photos = photosOf(p);
    const heroFile = p.hero && fs.existsSync(path.join(origen!, "img", `${p.hero}.jpg`)) ? p.hero : photos[0];
    for (const f of new Set([heroFile, ...photos].filter(Boolean) as string[])) {
      imagenesUsadas.set(f, (imagenesUsadas.get(f) ?? new Set()).add(p.id));
    }

    const note = [p.info ? cutAtSentence(p.info, 300) : "", "Horario y condiciones de visita pendientes de verificar."].filter(Boolean).join(" ");
    const hours: OpeningInfo = { status: "unknown", note: note.slice(0, 400) };

    const site: Site = {
      id,
      slug: idFrom(`${recorrido.id}-${index + 1}-${name}`).slice(0, 80).replace(/-+$/, ""),
      name,
      locality: over.localidad ?? p.zone ?? "",
      kind: over.tipo ?? cfg.tipo,
      visigothic: over.visigodo ?? cfg.visigodo,
      tagline: (p.sub || p.title || name).slice(0, 200),
      summary,
      coordinates: coordinatesOf(p, fuente.stops),
      visitMinutes,
      hours,
      access: { status: "unknown" },
      themes: cfg.temas,
      claimIds: [],
      storyIds: [],
      imageTone: over.tono ?? cfg.tono,
      category: `${cfg.nombre} · parada ${index + 1}`.slice(0, 80),
      demo: false,
    };
    const image = heroFile ? imageFor(heroFile, name) : undefined;
    if (image) site.image = image;
    sites.push(site);

    // Relato → historias, solo si hay afirmaciones validadas de esta parada.
    const own = afirmaciones.filter((a) => a.parada === p.id);
    for (const a of own) {
      claims.push({
        id: a.id,
        siteId: id,
        text: a.texto,
        evidence: a.nivel,
        ...(a.atribucion ? { attribution: a.atribucion } : {}),
        source: { title: a.fuente.titulo, ...(a.fuente.pagina ? { page: a.fuente.pagina } : {}), ...(a.fuente.url ? { url: a.fuente.url } : {}) },
        status: "published",
        version: 1,
        keywords: a.palabrasClave,
      });
    }
    const partes = chunkParagraphs(relato, 1500);
    if (partes.length > 1) avisos.historiasPartidas.push(`${p.id} (${name}): el relato pasa de 1.500 caracteres y se divide en ${partes.length} historias.`);
    if (own.length === 0 && relato.length) {
      avisos.historiasSinAfirmaciones.push(p.id);
    } else if (own.length) {
      if (own.length > 10) avisos.otros.push(`${p.id}: tiene ${own.length} afirmaciones; cada historia cita solo las 10 primeras.`);
      partes.forEach((body, i) => {
        stories.push({
          id: `story-${idFrom(p.id)}${partes.length > 1 ? `-${i + 1}` : ""}`,
          siteId: id,
          title: `${p.title || name}${partes.length > 1 ? ` (${i + 1}/${partes.length})` : ""}`.slice(0, 120),
          body,
          claimIds: own.slice(0, 10).map((a) => a.id),
          audience: "general",
          minutes: Math.min(30, Math.max(1, Math.round(body.split(/\s+/).length / 180))),
        });
      });
    }

    // Lo que el modelo actual aún no admite: queda listo para la entidad Parada.
    extensiones.push({
      siteId: id,
      paradaOrigen: p.id,
      recorrido: cfg.id,
      orden: index + 1,
      relato: { titulo: p.title || name, texto: p.text ?? "" },
      locucion: p.audio
        ? {
            archivo: p.audio,
            src: `/media/audio/${p.audio}`,
            etiqueta: p.audiolabel ?? "Locución",
            duracionSeg: audioSeconds ? Math.round(audioSeconds) : null,
            transcripcion: p.guion || null,
            nota: p.guion ? null : "Este audio es el relato leído; no hay guion aparte.",
          }
        : null,
      galeria: [...new Set([heroFile, ...photos].filter(Boolean) as string[])].map((f) => {
        const c = creditos.get(f);
        return {
          archivo: f,
          src: `/images/ruta/${f}.jpg`,
          alt: c?.alt || fuente.fichas[f]?.title || name,
          pie: c?.pie || null,
          autor: c?.autor || null,
          licencia: c?.licencia || null,
          urlFuente: c?.url_fuente || null,
        };
      }),
      modelos3d: (p.models3d ?? []).map((m) => ({
        archivo: m.file.replace(/\.glb$/, ".json"),
        src: `/media/3d/${m.file.replace(/\.glb$/, ".json")}`,
        nombre: m.name,
        certeza: m.status,
        texto: m.text ?? null,
        fuente: m.src ?? null,
      })),
      figura: p.fig3d ?? null,
      notaCoordenadas: p.coordnote ?? null,
    });
  });

  const stopIds = paradas.map(siteId);
  routes.push({
    id: cfg.id,
    slug: idFrom(cfg.nombre),
    name: cfg.nombre,
    theme: cfg.tema,
    summary: cfg.resumen,
    stopIds,
    transport: cfg.transporte,
    limitations: cfg.limitaciones,
    demo: false,
  });
  if (recorrido.illus) {
    extensiones.push({ recorrido: cfg.id, mapaIlustrado: { ...recorrido.illus, src: `/images/ruta/${path.basename(recorrido.illus.img)}` } });
  }
  if (recorrido.id === "concilios") {
    avisos.otros.push("Las 6 paradas del Museo de los Concilios comparten la coordenada del museo: en interiores se eligen a mano (o por QR), no por geocerca.");
  }
}

for (const a of afirmaciones) {
  if (!fuente.stops.some((p) => p.id === a.parada)) avisos.otros.push(`La afirmación ${a.id} apunta a una parada que no existe («${a.parada}»).`);
}

// Las listas de afirmaciones e historias de cada lugar se derivan, como hace el gestor al publicar.
for (const site of sites) {
  site.claimIds = claims.filter((c) => c.siteId === site.id).map((c) => c.id);
  site.storyIds = stories.filter((s) => s.siteId === site.id).map((s) => s.id);
}

const heroSite = sites.find((s) => s.id === `site-parada-${idFrom(config.portada.paradaPortada)}`) ?? sites[0];
const showcase: Showcase = {
  localities: config.portada.localidades,
  regionName: config.portada.zona,
  themes: config.portada.temas,
  heroSiteId: heroSite.id,
  heroTitle: config.portada.tituloPortada,
  heroIntro: config.portada.introPortada,
  placeGroups: {
    visigothic: { title: "Huella visigoda", intro: "Los lugares donde se conserva o se estudia la Toledo visigoda." },
    other: { title: "Para completar la visita", intro: "Patrimonio de otras épocas a lo largo de la ruta." },
  },
  assistantIntro: "Pregúntame por la ruta o pídeme que organice tu visita a Toledo, Guadamur y el territorio de Guarrazar.",
  starterPrompts: ["¿Qué es el Tesoro de Guarrazar?", "¿Qué era la Vega Baja?", "Medio día en Toledo a pie", "La ruta del territorio en coche"],
  generalPrompts: [
    "¿Qué es el Tesoro de Guarrazar?",
    "¿Por qué Toledo fue la capital del reino visigodo?",
    "¿Qué se ve hoy en el yacimiento de Guarrazar?",
    "Planifica la ruta del territorio en coche",
  ],
  assistantExamples: [{ siteId: heroSite.id, topic: "qué se ha excavado en el santuario de Guarrazar" }],
  heritageKeywords: [
    "visigod*", "rey", "reyes", "reina", "corona*", "concilio*", "tesoro*", "recesvinto", "recaredo", "leovigildo",
    "wamba", "suintila", "rodrigo", "palacio*", "palatino", "capital", "corte", "reino", "votiva*", "capitel*",
    "reaprovecha*", "obispo*", "iglesia", "basilica*", "santuario", "xenodochium", "peregrino*", "manantial",
    "necropolis", "suburbio", "credo", "plomo", "mina*", "molino*",
  ],
  gettingThere: config.portada.comoLlegar,
  areaHints: config.portada.ayudaZonas,
  transportHints: config.portada.ayudaTransporte,
  familyPrompt: "Plan con niños por Toledo y Guarrazar",
};
avisos.otros.push("Los textos de portada y del asistente (preguntas de inicio, ejemplos, vocabulario) son provisionales: revísalos en «Portada y asistente».");

const catalog: Catalog = { sites, claims, stories, routes, showcase };

/* ---------- Comprobaciones con las reglas del gestor ---------- */

const parsed = parseCatalog(catalog);
const schemaErrors = parsed.ok ? [] : parsed.errors.map((e) => `${e.path}: ${e.message}`);
const issues = parsed.ok ? validateCatalog(parsed.value) : [];
const errores = [...schemaErrors, ...issues.filter((i) => i.severity === "error").map((i) => `${i.kind} ${i.id}: ${i.message}`)];
// Advertencias agrupadas por mensaje: la misma advertencia en 30 paradas se lee como una línea.
const advertencias = [
  ...issues
    .filter((i) => i.severity === "warning")
    .reduce((groups, i) => groups.set(i.message, [...(groups.get(i.message) ?? []), i.id]), new Map<string, string[]>()),
].map(([message, ids]) => `${message} (${ids.length}: ${ids.map((id) => id.replace(/^site-parada-/, "")).join(", ")})`);

/* ---------- Salida ---------- */

fs.mkdirSync(salida, { recursive: true });
const registros = recordsFromCatalog(catalog).map((r) => ({ ...r, status: "review" as const }));
fs.writeFileSync(path.join(salida, "catalogo.json"), JSON.stringify(catalog, null, 2));
fs.writeFileSync(path.join(salida, "registros.json"), JSON.stringify(registros, null, 2));
fs.writeFileSync(path.join(salida, "extensiones.json"), JSON.stringify(extensiones, null, 2));

// Plantilla de créditos: todas las imágenes usadas, con lo que ya se sabe de cada una.
const plantilla = ["archivo,paradas,alt,pie,autor,licencia,url_fuente"];
for (const [file, stops] of [...imagenesUsadas].sort(([a], [b]) => a.localeCompare(b))) {
  const prev = creditos.get(file);
  const ficha = fuente.fichas[file];
  const creditoFicha = ficha?.table?.find(([k]) => /cr[eé]dito/i.test(k))?.[1] ?? "";
  const tipoFicha = ficha?.table?.find(([k]) => /^tipo$/i.test(k))?.[1] ?? "";
  // El texto de las fichas de foto es descriptivo; solo el de las ilustraciones sirve de pie.
  const pieFicha = ficha?.ref ? (ficha.body?.find(([t]) => t === "p")?.[1] ?? "") : "";
  plantilla.push(
    [
      file,
      [...stops].join(" "),
      prev?.alt || ficha?.title || "",
      prev?.pie || [tipoFicha, pieFicha].filter(Boolean).join(". "),
      prev?.autor || creditoFicha,
      prev?.licencia || "",
      prev?.url_fuente || "",
    ]
      .map((v) => csvField(v.slice(0, 600)))
      .join(","),
  );
}
fs.writeFileSync(path.join(salida, "creditos-imagenes.plantilla.csv"), `﻿${plantilla.join("\n")}\n`);

const lista = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join("\n") : "- Nada.");
const informe = `# Informe de importación

Generado el ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC desde \`${origen}\`.

## Resultado

| Qué | Cantidad |
| --- | --- |
| Recorridos | ${routes.length} |
| Paradas (lugares) | ${sites.length} |
| Afirmaciones | ${claims.length}${afirmacionesSinValidar ? ` (${afirmacionesSinValidar} más sin validar, fuera de la importación)` : ""}${flag("incluir-borradores") ? " (incluye borradores: solo previsualización)" : ""} |
| Historias | ${stories.length} |
| Paradas con imagen publicable | ${sites.filter((s) => s.image).length} |
| Registros para el gestor (en revisión) | ${registros.length} |

**Comprobación con las reglas del gestor:** ${errores.length === 0 ? "sin errores; se puede importar." : `${errores.length} errores; corrígelos antes de importar.`}

## Errores que bloquean la publicación

${lista(errores)}

## Advertencias del gestor

${lista(advertencias)}

## Relatos que aún no entran como historias

El gestor exige que cada historia cite al menos una afirmación validada de su parada. Estas paradas tienen relato pero ninguna afirmación validada en \`afirmaciones.json\`; su relato está completo en \`extensiones.json\` y en la ficha se ve el primer párrafo como descripción.

${lista(avisos.historiasSinAfirmaciones)}

## Relatos divididos

${lista(avisos.historiasPartidas)}

## Imágenes sin créditos completos (no se publican)

Faltan autor, licencia o URL de origen en \`creditos-imagenes.csv\`. Plantilla con todas las imágenes: \`creditos-imagenes.plantilla.csv\`.

${lista([...avisos.imagenesSinCredito].sort())}

## Coordenadas provisionales

${lista(avisos.coordenadas)}

## Decisiones a confirmar

${lista(avisos.revisar)}

## Medios que faltan en el origen

${lista(avisos.mediosQueFaltan)}

## Otros avisos

${lista(avisos.otros)}

## Pendiente de la entidad Parada

El modelo actual no tiene campos para la locución grabada, su transcripción, la galería, los modelos 3D ni el mapa ilustrado. Todo está en \`extensiones.json\`, enlazado a cada lugar por \`siteId\`, listo para cuando exista la entidad Parada.
`;
fs.writeFileSync(path.join(salida, "informe.md"), informe);

/* ---------- Medios ---------- */

if (flag("copiar-medios")) {
  const copy = (from: string, to: string) => {
    if (!fs.existsSync(from)) return;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  };
  for (const file of imagenesUsadas.keys()) copy(path.join(origen, "img", `${file}.jpg`), path.join(webDir, "public/images/ruta", `${file}.jpg`));
  for (const r of recorridos) if (r.illus) copy(path.join(origen, r.illus.img), path.join(webDir, "public/images/ruta", path.basename(r.illus.img)));
  for (const p of fuente.stops) {
    if (p.audio) copy(path.join(origen, "audio", p.audio), path.join(webDir, "public/media/audio", p.audio));
    for (const m of p.models3d ?? []) {
      const json = m.file.replace(/\.glb$/, ".json");
      copy(path.join(origen, "3d", json), path.join(webDir, "public/media/3d", json));
    }
  }
  console.log("Medios copiados a web/public/images/ruta y web/public/media.");
}

/* ---------- Subida al gestor ---------- */

async function subir() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.GESTOR_EMAIL;
  const password = process.env.GESTOR_PASSWORD;
  if (!url || !key || !email || !password) {
    throw new Error("Para --subir hacen falta NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, GESTOR_EMAIL y GESTOR_PASSWORD.");
  }
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const login = await db.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error(`No se pudo iniciar sesión: ${login.error.message}`);
  const existing = await db.from("content_records").select("kind,id");
  if (existing.error) throw new Error(`No se pudieron leer los registros: ${existing.error.message}`);
  const taken = new Set((existing.data ?? []).map((r: { kind: string; id: string }) => `${r.kind}:${r.id}`));
  const nuevos = registros.filter((r) => !taken.has(`${r.kind}:${r.id}`));
  const repetidos = registros.filter((r) => taken.has(`${r.kind}:${r.id}`));
  if (nuevos.length) {
    const { error } = await db.from("content_records").insert(nuevos);
    if (error) throw new Error(`No se pudieron crear los registros: ${error.message}`);
  }
  let actualizados = 0;
  if (flag("actualizar")) {
    for (const r of repetidos) {
      const { error } = await db.from("content_records").update({ data: r.data, status: "review" }).eq("kind", r.kind).eq("id", r.id);
      if (error) throw new Error(`No se pudo actualizar ${r.kind} ${r.id}: ${error.message}`);
      actualizados++;
    }
  }
  console.log(
    `Gestor: ${nuevos.length} registros nuevos en revisión` +
      (flag("actualizar") ? `, ${actualizados} actualizados.` : `, ${repetidos.length} ya existían y no se han tocado (usa --actualizar).`),
  );
}

console.log(`Importación: ${routes.length} recorridos, ${sites.length} paradas, ${claims.length} afirmaciones, ${stories.length} historias.`);
console.log(errores.length ? `${errores.length} errores: ver ${path.join(salida, "informe.md")}` : "Sin errores con las reglas del gestor.");
console.log(`Salida en ${salida}`);

if (flag("subir")) {
  if (errores.length) {
    console.error("No se sube nada mientras haya errores.");
    process.exit(1);
  }
  subir().catch((e: Error) => {
    console.error(e.message);
    process.exit(1);
  });
} else if (errores.length) {
  process.exitCode = 1;
}

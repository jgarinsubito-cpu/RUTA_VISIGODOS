/**
 * Shape checks for content coming from the content store: a published catalog snapshot (read by
 * every visitor request) and the records editors save in the admin. Field limits keep one bad
 * record from breaking pages; cross-record rules (links, clashes) live in ./validate.
 *
 * Errors are reported in Spanish (zod's "es" locale): editors read them in the admin.
 */
import { z } from "zod";
import type { Catalog, Route, Service, Showcase, Site, Stop, Story, ValidatedClaim } from "@/domain/types";

const LOCALE = z.locales.es().localeError;

/** zod's Spanish messages, with plainer words for the cases editors meet most. */
const SPANISH: z.core.$ZodErrorMap = (issue) => {
  if (issue.code === "too_small" && issue.origin === "string" && issue.minimum === 1) return "Obligatorio";
  if (issue.code === "invalid_type" && issue.input === undefined) return "Obligatorio";
  if (issue.code === "invalid_type" && typeof issue.input === "number" && Number.isNaN(issue.input)) return "Escribe un número";
  if (issue.code === "too_big" && issue.origin === "string") return `Demasiado largo: máximo ${issue.maximum} caracteres`;
  if (issue.code === "too_big" && issue.origin === "array") return `Demasiados: máximo ${issue.maximum}`;
  return LOCALE(issue);
};

const text = (max: number) => z.string().trim().min(1).max(max);
const id = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas sin tildes, números y guiones");
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .regex(/^https:\/\/[^\s"'<>]+$/, "Debe ser una dirección https://");
/** Bundled demo images live under /images; uploads are https URLs in the content image store. */
const imageSrc = z
  .string()
  .trim()
  .max(500)
  .regex(/^(\/images\/[\w./-]+|https:\/\/[^\s"'<>]+)$/, "Debe ser una ruta /images/… o una dirección https://");
/** Bundled media live under /media; uploads are https URLs in the content media store. */
const mediaSrc = z
  .string()
  .trim()
  .max(500)
  .regex(/^(\/media\/[\w./-]+|https:\/\/[^\s"'<>]+)$/, "Debe ser una ruta /media/… o una dirección https://");
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora en formato HH:MM");

export const SourceRefSchema = z.object({
  title: text(300),
  page: text(40).optional(),
  url: httpsUrl.optional(),
});

const TimeWindowSchema = z
  .object({ open: clock, close: clock })
  .refine((w) => w.open < w.close, "La hora de cierre debe ser posterior a la de apertura");
const DaySchema = z.array(TimeWindowSchema).max(4).optional();

export const OpeningInfoSchema = z.object({
  status: z.enum(["verified", "example", "unknown"]),
  weekly: z.object({ 1: DaySchema, 2: DaySchema, 3: DaySchema, 4: DaySchema, 5: DaySchema, 6: DaySchema, 7: DaySchema }).optional(),
  verifiedAt: text(40).optional(),
  note: text(400).optional(),
  alwaysOpen: z.boolean().optional(),
});

export const PlaceImageSchema = z.object({
  src: imageSrc,
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
  alt: text(300),
  author: text(200),
  license: text(80),
  sourceUrl: httpsUrl,
  caption: text(300).optional(),
  focus: z
    .string()
    .regex(/^\d{1,3}% \d{1,3}%$/, "Formato «50% 40%»")
    .optional(),
});

const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  approximate: z.boolean(),
});

const siteShape = {
  id,
  slug: id,
  name: text(120),
  locality: text(80),
  kind: z.enum(["museum", "archaeological", "monument", "landscape", "service"]),
  visigothic: z.boolean(),
  tagline: text(200),
  summary: text(1200),
  coordinates: CoordinatesSchema,
  visitMinutes: z.number().int().min(5).max(600),
  hours: OpeningInfoSchema,
  access: z.object({ status: z.enum(["verified", "unknown"]), stepFree: z.boolean().optional(), note: text(400).optional() }),
  themes: z.array(text(40)).max(10),
  imageTone: z.enum(["ochre", "moss", "terracotta", "umber", "stone", "slate"]),
  imageCredit: text(200).optional(),
  image: PlaceImageSchema.optional(),
  category: text(80).optional(),
  address: text(200).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{6,20}$/, "Teléfono con prefijo, por ejemplo +34 925 00 00 00")
    .optional(),
  officialUrl: httpsUrl.optional(),
  sources: z.array(SourceRefSchema).max(10).optional(),
  aliases: z.array(text(80)).max(20).optional(),
  suggestedPrompts: z.array(text(140)).max(6).optional(),
  narrativeOrder: z.number().int().min(1).max(99).optional(),
  demo: z.boolean(),
};

/** A place as an editor writes it: claim and story links are derived when the catalog is built. */
export const SiteDataSchema = z.object(siteShape);
export const SiteSchema = z.object({ ...siteShape, claimIds: z.array(id).max(200), storyIds: z.array(id).max(200) });

const claimShape = {
  id,
  siteId: id,
  text: text(800),
  evidence: z.enum(["D", "I", "H", "T"]),
  attribution: text(300).optional(),
  source: SourceRefSchema,
  keywords: z.array(text(60)).max(30),
};

/** A claim as an editor writes it: its publication status and version come from the workflow. */
export const ClaimDataSchema = z.object(claimShape);
export const ClaimSchema = z.object({
  ...claimShape,
  status: z.enum(["draft", "review", "published", "superseded"]),
  version: z.number().int().min(1),
});

export const StorySchema = z.object({
  id,
  siteId: id,
  stopId: id.optional(),
  title: text(120),
  body: text(1500),
  claimIds: z.array(id).min(1, "Elige al menos una ficha").max(10),
  audience: z.enum(["general", "family", "expert"]),
  minutes: z.number().int().min(1).max(30),
});

export const StopModelSchema = z.object({
  src: mediaSrc,
  name: text(120),
  certainty: z.enum(["excavated", "restored", "hypothesis", "geophysical"]),
  description: text(1200),
  source: text(300).optional(),
  iosSrc: mediaSrc.optional(),
});

export const StopVideo360Schema = z.object({
  src: mediaSrc,
  srcMobile: mediaSrc.optional(),
  poster: z.union([imageSrc, mediaSrc]).optional(),
  name: text(120),
  description: text(1200),
  durationSeconds: z.number().int().min(1).max(3600),
  startYaw: z.number().min(-180).max(180).optional(),
  credit: text(200).optional(),
});

const percent = z.number().min(0).max(100);
export const IllustratedMapSchema = z.object({
  src: imageSrc,
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
  alt: text(300),
  caption: text(400),
  credit: text(300),
  pins: z.array(z.object({ stopId: id, x: percent, y: percent })).max(60),
});

export const RouteSchema = z.object({
  id,
  slug: id,
  name: text(120),
  theme: text(200),
  summary: text(800),
  stopIds: z.array(id).min(2, "Una ruta necesita al menos dos paradas").max(15),
  transport: z.enum(["walk", "car"]),
  keywords: z.array(text(60)).max(30).optional(),
  limitations: z.array(text(200)).max(10),
  tourStopIds: z.array(id).max(60).optional(),
  illustratedMap: IllustratedMapSchema.optional(),
  demo: z.boolean(),
});

export const StopAudioSchema = z.object({
  src: mediaSrc,
  durationSeconds: z.number().int().min(1).max(7200),
  label: text(60),
  transcript: text(12000),
  credit: text(200).optional(),
});

const stopShape = {
  id,
  siteId: id,
  order: z.number().int().min(1).max(200),
  name: text(120),
  tagline: text(200).optional(),
  coordinates: CoordinatesSchema.optional(),
  radiusMeters: z.number().int().min(10).max(1000).optional(),
  indoor: z.boolean().optional(),
  routeOnly: z.boolean().optional(),
  audio: StopAudioSchema.optional(),
  gallery: z.array(PlaceImageSchema).max(30),
  models: z.array(StopModelSchema).max(12).optional(),
  videos360: z.array(StopVideo360Schema).max(6).optional(),
};

/** A stop as an editor writes it: its story list is derived when the catalog is built. */
export const StopDataSchema = z.object(stopShape);
export const StopSchema = z.object({ ...stopShape, storyIds: z.array(id).max(50) });

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ]{6,20}$/, "Teléfono con prefijo, por ejemplo +34 925 00 00 00");

export const SERVICE_CATEGORIES = [
  "restaurant",
  "cafe",
  "lodging",
  "car-rental",
  "guided-visit",
  "experience",
  "transport",
  "shop",
  "parking",
  "tourist-office",
] as const;

/** A complementary service (where to eat, sleep, rent a car…), kept by staff in the content admin. */
export const ServiceSchema = z.object({
  id,
  slug: id,
  name: text(120),
  category: z.enum(SERVICE_CATEGORIES),
  locality: text(80),
  coordinates: CoordinatesSchema,
  address: text(200).optional(),
  summary: text(400),
  hours: OpeningInfoSchema,
  access: z.object({ status: z.enum(["verified", "unknown"]), stepFree: z.boolean().optional(), note: text(400).optional() }),
  priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  priceNote: text(120).optional(),
  contact: z.object({
    bookingUrl: httpsUrl.optional(),
    website: httpsUrl.optional(),
    phone: phone.optional(),
    email: z.string().trim().email("Correo no válido").optional(),
  }),
  reservable: z.boolean(),
  siteIds: z.array(id).max(20),
  familyFriendly: z.boolean().optional(),
  partner: z.boolean(),
  sponsored: z.boolean().optional(),
  checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato AAAA-MM-DD").nullable(),
  image: PlaceImageSchema.optional(),
  demo: z.boolean(),
});

const groupCopy = z.object({ title: text(80), intro: text(300) });

export const ShowcaseSchema = z.object({
  localities: z.array(text(60)).min(1, "Indica al menos una localidad").max(12),
  regionName: text(80),
  themes: z.array(text(40)).min(1).max(30),
  heroSiteId: id,
  heroTitle: text(120),
  heroIntro: text(400),
  placeGroups: z.object({ visigothic: groupCopy, other: groupCopy }),
  assistantIntro: text(300),
  starterPrompts: z.array(text(140)).min(1).max(8),
  generalPrompts: z.array(text(140)).min(1).max(8),
  assistantExamples: z.array(z.object({ siteId: id, topic: text(140) })).max(6),
  heritageKeywords: z.array(text(60)).max(200),
  gettingThere: z.record(z.string(), text(300)),
  areaHints: z.record(z.string(), text(200)),
  transportHints: z.object({ walk: text(200), car: text(200) }),
  familyPrompt: text(140),
});

export const CatalogSchema = z.object({
  sites: z.array(SiteSchema).max(500),
  // Versions published before stops existed have none.
  stops: z.array(StopSchema).max(2000).default([]),
  // Versions published before services existed have none.
  services: z.array(ServiceSchema).max(2000).optional(),
  claims: z.array(ClaimSchema).max(5000),
  stories: z.array(StorySchema).max(2000),
  routes: z.array(RouteSchema).max(100),
  showcase: ShowcaseSchema,
});

export type SiteData = Omit<Site, "claimIds" | "storyIds">;
export type ClaimData = Omit<ValidatedClaim, "status" | "version">;
export type StopData = Omit<Stop, "storyIds">;

/** What an editor saves for each kind of record. */
export interface RecordDataByKind {
  site: SiteData;
  stop: StopData;
  service: Service;
  claim: ClaimData;
  story: Story;
  route: Route;
  showcase: Showcase;
}
export type RecordKind = keyof RecordDataByKind;
export const RECORD_KINDS = ["site", "stop", "service", "claim", "story", "route", "showcase"] as const satisfies readonly RecordKind[];

const DATA_SCHEMAS: Record<RecordKind, z.ZodType> = {
  site: SiteDataSchema,
  stop: StopDataSchema,
  service: ServiceSchema,
  claim: ClaimDataSchema,
  story: StorySchema,
  route: RouteSchema,
  showcase: ShowcaseSchema,
};

export interface FieldError {
  /** Dotted path of the field, e.g. "image.alt" or "starterPrompts.2". */
  path: string;
  message: string;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] };

function toErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message }));
}

/** Check one record's data before it is saved; unknown keys are dropped. */
export function parseRecordData<K extends RecordKind>(kind: K, data: unknown): ParseResult<RecordDataByKind[K]> {
  const parsed = DATA_SCHEMAS[kind].safeParse(data, { error: SPANISH });
  // The schemas mirror the domain types; weekly hours keys are "1"…"7" in JSON and 1…7 in TypeScript.
  return parsed.success ? { ok: true, value: parsed.data as RecordDataByKind[K] } : { ok: false, errors: toErrors(parsed.error) };
}

/** Check a whole catalog (a stored snapshot) before it is installed. */
export function parseCatalog(data: unknown): ParseResult<Catalog> {
  const parsed = CatalogSchema.safeParse(data, { error: SPANISH });
  return parsed.success ? { ok: true, value: parsed.data as Catalog } : { ok: false, errors: toErrors(parsed.error) };
}

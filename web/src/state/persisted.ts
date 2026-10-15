/**
 * What the store keeps on this device, validated on the way in. Stored data comes from older app
 * versions, other tabs or a hand-edited browser, so every part is checked on its own: a corrupt
 * part falls back to its default instead of discarding everything (or crashing a screen).
 *
 * v2 changed stop warnings from text to structured values. A v1 trip is rebuilt by the planner
 * from the same stops and settings; nothing else about it changes.
 */
import { z } from "zod";
import { getSite, validArea } from "@/data/content";
import { schedule } from "@/domain/planner";
import { ACCESS_NEEDS, ASSISTANT_MODES, type AssistantMode, type ChatMessage, type TourProgress, type Trip, type TripContext, type VisitorPreferences } from "@/domain/types";

export const STORAGE_KEY = "ruta-visigoda:v2";
export const LEGACY_STORAGE_KEY = "ruta-visigoda:v1";

/** Oldest conversations beyond this are dropped so storage cannot fill up with chats. */
export const MAX_CONVERSATIONS = 30;
/** Messages kept per conversation (the most recent ones). */
export const MAX_MESSAGES = 60;

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const weekday = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)]);

export const TripContextSchema = z.object({
  // Towns are content: an area the current catalog no longer has becomes the whole region.
  area: z.string().trim().min(1).max(80).transform(validArea),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  startTime: clock,
  endTime: clock,
  profile: z.enum(["general", "family", "expert"]),
  transport: z.enum(["walk", "car"]),
  stepFreeRequired: z.boolean(),
});

const StopWarningSchema = z.discriminatedUnion("code", [
  z.object({ code: z.literal("no-date") }),
  z.object({ code: z.literal("example-hours") }),
  z.object({ code: z.literal("unknown-hours") }),
  z.object({ code: z.literal("access-unverified") }),
  z.object({ code: z.literal("wait"), until: z.number(), verified: z.boolean() }),
  z.object({ code: z.literal("closed-day"), weekday, verified: z.boolean() }),
  z.object({ code: z.literal("closed-on-arrival"), close: z.number(), arrival: z.number(), verified: z.boolean() }),
  z.object({ code: z.literal("no-time"), close: z.number(), verified: z.boolean() }),
  z.object({ code: z.literal("too-far-walk"), km: z.number() }),
  z.object({ code: z.literal("past-end"), departure: z.number(), endTime: z.string() }),
]);

const TripStopSchema = z.object({
  siteId: z.string(),
  arrival: z.number(),
  visitStart: z.number().optional(),
  departure: z.number(),
  travelMinutesFromPrevious: z.number(),
  status: z.enum(["scheduled", "provisional"]),
  warnings: z.array(StopWarningSchema),
});

const TripSchema = z.object({
  id: z.string(),
  revision: z.number().int().nonnegative(),
  context: TripContextSchema,
  stops: z.array(TripStopSchema),
  sourceRouteId: z.string().optional(),
  updatedAt: z.string(),
});

/** Answers are re-validated when rendered (citations re-read from content); keep their shape loose. */
const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  text: z.string(),
  answer: z.looseObject({ text: z.string(), citations: z.array(z.unknown()), placeIds: z.array(z.string()) }).optional(),
  createdAt: z.string(),
});

const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(ChatMessageSchema),
  updatedAt: z.string(),
});

export const PreferencesSchema = z.object({
  interests: z.array(z.string().max(40)).max(20),
  pace: z.enum(["relaxed", "balanced", "full"]).nullable(),
  group: z.enum(["solo", "couple", "family", "friends", "seniors"]).nullable(),
  accessNeeds: z.array(z.enum(ACCESS_NEEDS)).max(ACCESS_NEEDS.length),
});

const TourSchema = z.object({
  routeId: z.string(),
  mode: z.enum(["live", "virtual"]),
  currentIndex: z.number().int().nonnegative(),
  visitedSiteIds: z.array(z.string()),
  startedAt: z.string(),
  updatedAt: z.string(),
});

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface PersistedState {
  context: TripContext;
  trip: Trip;
  previousTrip: Trip | null;
  savedSiteIds: string[];
  conversations: Conversation[];
  activeConversationId: string | null;
  tour: TourProgress | null;
  preferences: VisitorPreferences;
  assistantMode: AssistantMode;
}

function field<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** Newest conversations first, capped, each keeping only its most recent messages. */
export function boundConversations(conversations: Conversation[]): Conversation[] {
  const sorted = conversations.length > MAX_CONVERSATIONS
    ? [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, MAX_CONVERSATIONS)
    : conversations;
  return sorted.map((c) => (c.messages.length > MAX_MESSAGES ? { ...c, messages: c.messages.slice(-MAX_MESSAGES) } : c));
}

function readParts(raw: Record<string, unknown>): Partial<PersistedState> {
  const out: Partial<PersistedState> = {};
  const context = field(TripContextSchema, raw.context);
  if (context) out.context = context;
  const trip = field(TripSchema, raw.trip);
  if (trip) out.trip = trip;
  const previousTrip = field(TripSchema.nullable(), raw.previousTrip);
  if (previousTrip !== undefined) out.previousTrip = previousTrip;
  const saved = field(z.array(z.string()), raw.savedSiteIds);
  if (saved) out.savedSiteIds = saved.filter((id) => getSite(id));
  const conversations = field(z.array(ConversationSchema), raw.conversations);
  if (conversations) out.conversations = boundConversations(conversations as Conversation[]);
  const active = field(z.string().nullable(), raw.activeConversationId);
  if (active !== undefined) out.activeConversationId = active;
  const tour = field(TourSchema.nullable(), raw.tour);
  if (tour !== undefined) out.tour = tour;
  const preferences = field(PreferencesSchema, raw.preferences);
  if (preferences) out.preferences = preferences;
  const assistantMode = field(z.enum(ASSISTANT_MODES), raw.assistantMode);
  if (assistantMode) out.assistantMode = assistantMode;
  return out;
}

function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Validated v2 state, or null when there is nothing usable. */
export function parseStored(raw: string | null): Partial<PersistedState> | null {
  const json = parseJson(raw);
  return json ? readParts(json) : null;
}

/**
 * v1 → v2: keep everything that still validates and rebuild the trip's stops with the planner
 * (same stops, order and settings), since v1 stored warnings as text.
 */
export function migrateV1(raw: string | null): Partial<PersistedState> | null {
  const json = parseJson(raw);
  if (!json) return null;
  const rest = { ...json };
  delete rest.trip;
  delete rest.previousTrip;
  const out = readParts(rest);
  const legacy = json.trip as { id?: unknown; revision?: unknown; context?: unknown; stops?: unknown; sourceRouteId?: unknown } | undefined;
  const context = field(TripContextSchema, legacy?.context);
  const ids = Array.isArray(legacy?.stops)
    ? legacy.stops.map((s) => (s as { siteId?: unknown })?.siteId).filter((id): id is string => typeof id === "string" && getSite(id) !== undefined)
    : [];
  if (context) {
    const revision = typeof legacy?.revision === "number" ? legacy.revision + 1 : 1;
    out.trip = {
      id: typeof legacy?.id === "string" ? legacy.id : "trip-local",
      revision,
      context,
      stops: ids.length > 0 ? schedule(ids, context).stops : [],
      ...(typeof legacy?.sourceRouteId === "string" ? { sourceRouteId: legacy.sourceRouteId } : {}),
      updatedAt: new Date().toISOString(),
    };
  }
  out.previousTrip = null;
  return out;
}

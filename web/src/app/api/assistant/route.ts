/**
 * POST /api/assistant — validates the request, answers with the assistant engine and returns an
 * AssistantAnswer as JSON. API keys stay server-side; model failures degrade to the local composer.
 */
import { z } from "zod";
import { answerQuestion } from "@/domain/assistant";
import { ACCESS_NEEDS, TRIP_AREAS, type AssistantRequest } from "@/domain/types";
import { createTokenBucket } from "@/lib/rateLimit";

export const runtime = "nodejs";

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const RequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) }))
    .max(20)
    .default([]),
  context: z.object({
    area: z.enum(TRIP_AREAS),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    startTime: clock,
    endTime: clock,
    profile: z.enum(["general", "family", "expert"]),
    transport: z.enum(["walk", "car"]),
    stepFreeRequired: z.boolean(),
  }),
  selectedSiteId: z.string().max(100).nullable().optional(),
  tripSiteIds: z.array(z.string().max(100)).max(50).default([]),
  preferences: z
    .object({
      interests: z.array(z.string().max(40)).max(20),
      pace: z.enum(["relaxed", "balanced", "full"]).nullable(),
      group: z.enum(["solo", "couple", "family", "friends", "seniors"]).nullable(),
      accessNeeds: z.array(z.enum(ACCESS_NEEDS)).max(ACCESS_NEEDS.length),
    })
    .optional(),
});

function badRequest(error: string, issues?: unknown) {
  return Response.json({ error, ...(issues ? { issues } : {}) }, { status: 400 });
}

/** Rejected before parsing. The UI sends at most 10 history turns of ≤ 4000 characters (~45 KB of UTF-8). */
const MAX_BODY_BYTES = 96 * 1024;

/** Model calls per client: bursts of 8, then one every 7.5 s (8 per minute). */
const modelBucket = createTokenBucket({ capacity: 8, refillPerSecond: 8 / 60 });
/**
 * Model calls for the whole instance (60 per minute). Client keys come from headers a caller can
 * forge when no proxy overwrites them, so this cap bounds the paid path whatever the key says.
 */
const globalBucket = createTokenBucket({ capacity: 60, refillPerSecond: 1 });

/**
 * The hop the nearest proxy saw (last X-Forwarded-For entry): entries to its left are whatever
 * the client sent. Only meaningful behind a proxy; the global cap covers direct exposure.
 */
function clientKey(request: Request): string {
  const hops = request.headers.get("x-forwarded-for")?.split(",").map((h) => h.trim()).filter(Boolean) ?? [];
  return hops.at(-1) || request.headers.get("x-real-ip") || "anonymous";
}

function tooLarge() {
  return Response.json({ error: "La petición es demasiado grande." }, { status: 413 });
}

export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return tooLarge();
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return badRequest("No se pudo leer la petición.");
  }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return tooLarge();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return badRequest("El cuerpo de la petición no es JSON válido.");
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      "Petición no válida.",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  const req: AssistantRequest = parsed.data;
  const key = clientKey(request);
  // Over the limit the visitor still gets the deterministic local answer.
  const answer = await answerQuestion(req, { allowModel: () => modelBucket(key) && globalBucket("all") });
  return Response.json(answer, { headers: { "Cache-Control": "no-store" } });
}

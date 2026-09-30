/** Pure helpers for the assistant workspace (text parsing, context labels, request building). */
import type { AssistantAnswer, AssistantRequest, ChatMessage, SiteId, TripContext, VisitorProfile, VisitorPreferences } from "@/domain/types";
import { getPublishedClaim } from "@/data/content";
import { formatShortDate } from "@/lib/hours";
import { TRANSPORT_LABEL } from "@/lib/labels";

export type TextPart = { type: "text"; value: string } | { type: "place"; siteId: SiteId };

const TOKEN_RE = /\[\[([a-z0-9][a-z0-9-]*)\]\]/gi;

/** Split one paragraph into plain text and [[site-id]] place tokens. */
export function parseInline(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: "text", value: text.slice(last, index) });
    parts.push({ type: "place", siteId: match[1] });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

/**
 * When the text right before a place token already names the place ("…la Huerta de Guarrazar
 * [[site-guarrazar]]"), drop that name from the text so the link carries it and it is not repeated.
 */
export function mergePlaceNames(parts: TextPart[], nameOf: (id: SiteId) => string | undefined): TextPart[] {
  const out: TextPart[] = [];
  for (const part of parts) {
    const prev = out[out.length - 1];
    const name = part.type === "place" ? nameOf(part.siteId) : undefined;
    if (part.type === "place" && name && prev?.type === "text") {
      const trimmed = prev.value.replace(/\s+$/, "");
      if (trimmed.toLowerCase().endsWith(name.toLowerCase())) {
        const rest = trimmed.slice(0, trimmed.length - name.length);
        if (rest) out[out.length - 1] = { type: "text", value: rest };
        else out.pop();
      }
    }
    out.push(part);
  }
  return out;
}

/** Paragraphs are separated by blank lines; empty ones are dropped. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Plain text for history/aria: "[[site-x]]" becomes the site name when known. */
export function plainText(text: string, nameOf: (id: SiteId) => string | undefined): string {
  return text.replace(TOKEN_RE, (_, id: string) => nameOf(id) ?? "");
}

export const PROFILE_LABEL: Record<VisitorProfile, string> = {
  general: "General",
  family: "En familia",
  expert: "Experto",
};

export const PROFILE_HINT: Record<VisitorProfile, string> = {
  general: "Explicaciones claras con lo esencial.",
  family: "Relatos breves y paradas cómodas para niños.",
  expert: "Más detalle, matices y fuentes.",
};

export const AREAS: TripContext["area"][] = ["Toledo", "Guadamur", "Toledo y Guadamur"];

export function whenLabel(ctx: TripContext): string {
  return ctx.date ? `${formatShortDate(ctx.date)} · ${ctx.startTime}–${ctx.endTime}` : "Sin fecha";
}

export function whoLabel(ctx: TripContext): string {
  return ctx.stepFreeRequired ? `${PROFILE_LABEL[ctx.profile]} · Sin escalones` : PROFILE_LABEL[ctx.profile];
}

/** "Toledo y Guadamur · Sin fecha · General · A pie". */
export function contextLine(ctx: TripContext): string {
  return [ctx.area, whenLabel(ctx), whoLabel(ctx), TRANSPORT_LABEL[ctx.transport]].join(" · ");
}

export function sameContext(a: TripContext, b: TripContext): boolean {
  return (
    a.area === b.area &&
    a.date === b.date &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    a.profile === b.profile &&
    a.transport === b.transport &&
    a.stepFreeRequired === b.stepFreeRequired
  );
}

export const HISTORY_LIMIT = 10;

function isPublished(claimId: string): boolean {
  return getPublishedClaim(claimId) !== undefined;
}

export function buildRequest(
  message: string,
  previous: ChatMessage[],
  context: TripContext,
  selectedSiteId: SiteId | null,
  tripSiteIds: SiteId[],
  preferences?: VisitorPreferences,
): AssistantRequest {
  const hasPreferences =
    preferences && (preferences.interests.length > 0 || preferences.pace || preferences.group || preferences.accessNeeds.length > 0);
  return {
    message,
    history: previous
      .slice(-HISTORY_LIMIT)
      // A saved answer whose sources were since withdrawn must not be replayed as context.
      .filter((m) => !m.answer || m.answer.citations.every((c) => isPublished(c.claimId)))
      .map((m) => ({ role: m.role, text: m.text.slice(0, 4000) })),
    context,
    selectedSiteId,
    tripSiteIds,
    ...(hasPreferences ? { preferences } : {}),
  };
}

/** Minimal runtime check of the /api/assistant response before it reaches the store. */
export function isAnswer(value: unknown): value is AssistantAnswer {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<AssistantAnswer>;
  return (
    typeof v.text === "string" &&
    Array.isArray(v.citations) &&
    Array.isArray(v.placeIds) &&
    Array.isArray(v.suggestedPrompts) &&
    typeof v.abstained === "boolean"
  );
}

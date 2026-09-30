/**
 * Core domain model for Ruta Visigoda (see ../../../PLAN.md, "Core data and editorial workflow").
 * UI components consume these types; business rules live in src/domain, never in components.
 */

/** Localities the demo covers. The single source for types, request validation and filters. */
export const LOCALITIES = ["Toledo", "Guadamur"] as const;
export type Locality = (typeof LOCALITIES)[number];

/** Areas a visitor can choose for a trip: one locality or the whole demo region. */
export const TRIP_AREAS = [...LOCALITIES, "Toledo y Guadamur"] as const;
export type TripArea = (typeof TRIP_AREAS)[number];

export type SiteId = string;
export type ClaimId = string;
export type StoryId = string;
export type RouteId = string;

/** Evidence status from the brief: Documentado / Interpretación / Hipótesis / Tradición. */
export type EvidenceLevel = "D" | "I" | "H" | "T";

export type PublicationStatus = "draft" | "review" | "published" | "superseded";

export interface Coordinates {
  lat: number;
  lng: number;
  /** True when coordinates are approximate and still need field verification. */
  approximate: boolean;
}

export interface SourceRef {
  title: string;
  page?: string;
  url?: string;
}

export interface ValidatedClaim {
  id: ClaimId;
  siteId: SiteId;
  text: string;
  evidence: EvidenceLevel;
  /** Required for I (interpretations): whose interpretation it is. */
  attribution?: string;
  source: SourceRef;
  status: PublicationStatus;
  version: number;
  /** Search keywords (lowercase, unaccented) used by retrieval. */
  keywords: string[];
}

export interface Story {
  id: StoryId;
  siteId: SiteId;
  title: string;
  body: string;
  claimIds: ClaimId[];
  audience: "general" | "family" | "expert";
  minutes: number;
}

/** Opening windows in local Europe/Madrid time, e.g. { open: "10:00", close: "14:00" }. */
export interface TimeWindow {
  open: string;
  close: string;
}

export interface OpeningInfo {
  /**
   * "verified": checked against an official source at verifiedAt.
   * "example": placeholder data for the demo; must never be shown as live.
   * "unknown": no data; planner must treat stop as provisional.
   */
  status: "verified" | "example" | "unknown";
  /** Keyed by ISO weekday 1 (Mon) … 7 (Sun). Missing day = closed. */
  weekly?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, TimeWindow[]>>;
  verifiedAt?: string;
  note?: string;
  /** Exterior sites with free access all day. */
  alwaysOpen?: boolean;
}

export interface AccessInfo {
  status: "verified" | "unknown";
  stepFree?: boolean;
  note?: string;
}

export type SiteKind = "museum" | "archaeological" | "monument" | "landscape" | "service";

/** Photo placeholder tone: a design token (--tone-*), never a hard-coded colour. */
export type PlaceTone = "ochre" | "moss" | "terracotta" | "umber" | "stone" | "slate";

/** Licensed photograph of a place, with the attribution its licence requires. */
export interface PlaceImage {
  /** Path under /public. */
  src: string;
  width: number;
  height: number;
  alt: string;
  author: string;
  /** Short licence name, e.g. "CC BY-SA 4.0" or "Dominio público". */
  license: string;
  /** File page with the full licence and author details. */
  sourceUrl: string;
  /** Visible note when the image does not show the place itself (e.g. a 19th-century print). */
  caption?: string;
  /** CSS object-position for crops, e.g. "50% 40%". */
  focus?: string;
}

export interface Site {
  id: SiteId;
  slug: string;
  name: string;
  locality: Locality;
  kind: SiteKind;
  /** false = non-Visigothic heritage or services, must be labelled as such. */
  visigothic: boolean;
  tagline: string;
  summary: string;
  coordinates: Coordinates;
  visitMinutes: number;
  hours: OpeningInfo;
  access: AccessInfo;
  themes: string[];
  claimIds: ClaimId[];
  storyIds: StoryId[];
  /** Placeholder tone: shown while the photo loads, and instead of it when there is none. */
  imageTone: PlaceTone;
  imageCredit?: string;
  image?: PlaceImage;
  /** Place-card category, e.g. "Sinagoga · Museo Sefardí". */
  category?: string;
  /** Street address as published by the place or tourism office. */
  address?: string;
  /** Public contact phone in international format. */
  phone?: string;
  officialUrl?: string;
  /**
   * Where the description and practical data come from. These are not evidence claims: history
   * shown to visitors or the assistant still comes only from published claims.
   */
  sources?: SourceRef[];
  /**
   * Extra ways visitors name the place (lowercase, unaccented), e.g. "tesoro de guarrazar". The name
   * and distinctive slug words are matched automatically; list only what they would miss.
   */
  aliases?: string[];
  /** Follow-up questions the assistant offers while this place is in focus. */
  suggestedPrompts?: string[];
  /** Demo fixture: must be visibly identified in the UI. */
  demo: boolean;
}

export interface Route {
  id: RouteId;
  slug: string;
  name: string;
  theme: string;
  summary: string;
  stopIds: SiteId[];
  /** Duration is never stored: it comes from the planner (routeMinutes) so it cannot drift. */
  transport: TransportMode;
  /** Words that point the assistant to this route in a plan request (router syntax: "corona*"). */
  keywords?: string[];
  limitations: string[];
  demo: boolean;
}

export type TransportMode = "walk" | "car";

/**
 * Guided tour progress on this device. "live": stops are reached by walking into their zone
 * (geofence) or by hand; "virtual": the visitor steps through from anywhere.
 */
export interface TourProgress {
  routeId: RouteId;
  mode: "live" | "virtual";
  /** Index in the route's stops of the stop being shown. */
  currentIndex: number;
  /** Stops reached, in the order they were reached. */
  visitedSiteIds: SiteId[];
  startedAt: string;
  updatedAt: string;
}
export type VisitorProfile = "general" | "family" | "expert";

/** How full a day the visitor wants: the assistant proposes fewer or more stops. */
export type TravelPace = "relaxed" | "balanced" | "full";
/** Who the visitor travels with, for tone and suggestions. */
export type TravelGroup = "solo" | "couple" | "family" | "friends" | "seniors";

/**
 * Access needs to take into account in recommendations. Most catalog access data is unverified,
 * so these never make a place "accessible": they make the app say what is unknown for that need.
 */
export const ACCESS_NEEDS = [
  "wheelchair",
  "reduced-mobility",
  "stroller",
  "avoid-slopes",
  "rest-stops",
  "low-vision",
  "hearing",
  "quiet",
] as const;
export type AccessNeed = (typeof ACCESS_NEEDS)[number];

/** Needs that require step-free access: they switch on the planner's step-free check. */
export const STEP_FREE_NEEDS: readonly AccessNeed[] = ["wheelchair", "reduced-mobility", "stroller"];

/** Visitor preferences that shape recommendations (Explorar order, assistant, route choice). */
export interface VisitorPreferences {
  /** Site themes the visitor cares about (catalog `themes`). */
  interests: string[];
  pace: TravelPace | null;
  group: TravelGroup | null;
  accessNeeds: AccessNeed[];
}

export const EMPTY_PREFERENCES: VisitorPreferences = { interests: [], pace: null, group: null, accessNeeds: [] };

/** Trip constraints: the "Dónde / Cuándo / Quién / Transporte" pill in the assistant workspace. */
export interface TripContext {
  area: TripArea;
  /** ISO date YYYY-MM-DD (Europe/Madrid). */
  date: string | null;
  /** HH:mm local. */
  startTime: string;
  /** HH:mm local; end of available time. */
  endTime: string;
  profile: VisitorProfile;
  transport: TransportMode;
  stepFreeRequired: boolean;
}

export type StopStatus = "scheduled" | "provisional";

/**
 * Why a stop is provisional or cannot be scheduled. Structured so the UI can group trip-wide notes
 * (e.g. one "choose a date" prompt instead of one per stop); domain/warnings.ts renders the text.
 * Clock values are minutes from midnight. `verified` = the site's hours are verified, so the text
 * can state them as fact; otherwise it is phrased conditionally.
 */
export type StopWarning =
  | { code: "no-date" }
  | { code: "example-hours" }
  | { code: "unknown-hours" }
  | { code: "access-unverified" }
  | { code: "wait"; until: number; verified: boolean }
  | { code: "closed-day"; weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; verified: boolean }
  | { code: "closed-on-arrival"; close: number; arrival: number; verified: boolean }
  | { code: "no-time"; close: number; verified: boolean }
  | { code: "too-far-walk"; km: number }
  | { code: "past-end"; departure: number; endTime: string };

export type StopWarningCode = StopWarning["code"];

export interface TripStop {
  siteId: SiteId;
  /** Minutes from midnight, computed by the planner. */
  arrival: number;
  /** Start of the visit when the planner waits for the site to open (otherwise equal to arrival). */
  visitStart?: number;
  departure: number;
  travelMinutesFromPrevious: number;
  status: StopStatus;
  warnings: StopWarning[];
}

export interface Trip {
  id: string;
  /** Monotonic; every accepted change creates a new revision. */
  revision: number;
  context: TripContext;
  stops: TripStop[];
  sourceRouteId?: RouteId;
  updatedAt: string;
}

/** Result of asking the planner to insert or change stops. Nothing is applied until accepted. */
export interface ItineraryProposal {
  ok: boolean;
  /** Human-readable reason when !ok (e.g. "El sitio cierra antes de poder llegar"). */
  reason?: string;
  baseRevision: number;
  before: TripStop[];
  after: TripStop[];
  added: SiteId[];
  removed: SiteId[];
  /** Trip-wide notes (e.g. travel times are estimates); per-stop warnings live on the stops. */
  warnings: string[];
  /** Context the `after` schedule was computed with; becomes trip.context on accept. */
  context: TripContext;
  /** Set when the proposal replaces the trip with a curated route. */
  routeId?: RouteId;
}

/** Curated entry points: which place leads the home page and which questions get people started. */
export interface Showcase {
  heroSiteId: SiteId;
  /** Starter questions on the home composer and the empty assistant. */
  starterPrompts: string[];
  /** Follow-up questions when nothing more specific applies. */
  generalPrompts: string[];
  /** What the assistant offers when it cannot answer; each topic is shown with its place token. */
  assistantExamples: { siteId: SiteId; topic: string }[];
}

/** Assistant contract shared by /api/assistant and the chat UI. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Assistant only. */
  answer?: AssistantAnswer;
  createdAt: string;
}

export interface Citation {
  claimId: ClaimId;
  evidence: EvidenceLevel;
  sourceTitle: string;
  page?: string;
  attribution?: string;
}

export interface AssistantAnswer {
  intent: "heritage" | "travel" | "mixed" | "unknown";
  /** Markdown-light text; place refs appear as [[site-id]] tokens resolvable to Site cards. */
  text: string;
  citations: Citation[];
  placeIds: SiteId[];
  suggestedPrompts: string[];
  /** Optional explicit suggestion; the UI must ask the visitor before applying it. */
  suggestedAction?: { type: "add-stop"; siteId: SiteId } | { type: "use-route"; routeId: RouteId };
  /** True when evidence was insufficient; UI shows an honest "no consta" state. */
  abstained: boolean;
  provider: "local" | "anthropic" | "deepseek";
}

export interface AssistantRequest {
  message: string;
  history: { role: "user" | "assistant"; text: string }[];
  context: TripContext;
  selectedSiteId?: SiteId | null;
  tripSiteIds: SiteId[];
  /** Interests, pace, group and access needs to tailor recommendations (never evidence). */
  preferences?: VisitorPreferences;
}

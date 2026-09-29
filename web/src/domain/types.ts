/**
 * Core domain model for Ruta Visigoda (see ../../../PLAN.md, "Core data and editorial workflow").
 * UI components consume these types; business rules live in src/domain, never in components.
 */

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

export interface Site {
  id: SiteId;
  slug: string;
  name: string;
  locality: "Toledo" | "Guadamur";
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
  /** CSS gradient used as image placeholder until licensed photography exists. */
  imageTone: string;
  imageCredit?: string;
  officialUrl?: string;
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
  estimatedMinutes: number;
  transport: TransportMode;
  limitations: string[];
  demo: boolean;
}

export type TransportMode = "walk" | "car";
export type VisitorProfile = "general" | "family" | "expert";

/** Trip constraints: the "Dónde / Cuándo / Quién / Transporte" pill in the assistant workspace. */
export interface TripContext {
  area: "Toledo" | "Guadamur" | "Toledo y Guadamur";
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

export interface TripStop {
  siteId: SiteId;
  /** Minutes from midnight, computed by the planner. */
  arrival: number;
  /** Start of the visit when the planner waits for the site to open (otherwise equal to arrival). */
  visitStart?: number;
  departure: number;
  travelMinutesFromPrevious: number;
  status: StopStatus;
  warnings: string[];
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
  warnings: string[];
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
  provider: "local" | "anthropic";
}

export interface AssistantRequest {
  message: string;
  history: { role: "user" | "assistant"; text: string }[];
  context: TripContext;
  selectedSiteId?: SiteId | null;
  tripSiteIds: SiteId[];
}

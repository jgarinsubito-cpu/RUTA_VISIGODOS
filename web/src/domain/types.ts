/**
 * Core domain model for Ruta Visigoda (see ../../../PLAN.md, "Core data and editorial workflow").
 * UI components consume these types; business rules live in src/domain, never in components.
 */

/** A town the route covers, one of the catalog's `Showcase.localities` (content, not code). */
export type Locality = string;

/** Area a visitor can choose for a trip: one locality or the whole region (`Showcase.regionName`). */
export type TripArea = string;

export type SiteId = string;
export type ClaimId = string;
export type StoryId = string;
export type RouteId = string;
export type StopId = string;
export type ServiceId = string;

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
  /** The stop of its place this story is told at (guided tour); absent = the place as a whole. */
  stopId?: StopId;
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
  /** Path under /public (bundled demo) or a public URL in the content image store (admin uploads). */
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
  /**
   * Place in the story of the route, for the tailored planner: lower goes first within a town
   * (e.g. the museum that introduces the period before the sites). Absent: no preference.
   */
  narrativeOrder?: number;
  /** Demo fixture: must be visibly identified in the UI. */
  demo: boolean;
}

/* ---------- Complementary services (tourist layer) ---------- */

/**
 * Where to eat, sleep, rent a car… Operational data that changes: always shown with the date it
 * was last checked with the business, and never mixed with heritage claims. Businesses join the
 * network (`partner`) before they are published; examples (`demo`) are labelled as such.
 */
export type ServiceCategory =
  | "restaurant"
  | "cafe"
  | "lodging"
  | "car-rental"
  | "guided-visit"
  | "experience"
  | "transport"
  | "shop"
  | "parking"
  | "tourist-office";

export interface ServiceContact {
  /** The business's own booking page: the app does not take bookings or payments. */
  bookingUrl?: string;
  website?: string;
  /** International format. */
  phone?: string;
  email?: string;
}

export interface Service {
  id: ServiceId;
  slug: string;
  name: string;
  category: ServiceCategory;
  locality: Locality;
  coordinates: Coordinates;
  address?: string;
  /** One or two plain sentences: what it offers. */
  summary: string;
  hours: OpeningInfo;
  access: AccessInfo;
  /** Orientative price level, from € to €€€€. */
  priceLevel?: 1 | 2 | 3 | 4;
  /** E.g. "Menú del día 14 € (2026)", "Desde 45 € la noche". */
  priceNote?: string;
  contact: ServiceContact;
  /** Can be booked in advance (through the contact above). */
  reservable: boolean;
  /** Places this service belongs to: a guided visit of a site, the restaurant next to it. */
  siteIds: SiteId[];
  familyFriendly?: boolean;
  /** Joined the network (signed the adhesion). Only partners are published, except examples. */
  partner: boolean;
  /** Paid visibility: always labelled, and it never changes the order of results. */
  sponsored?: boolean;
  /** Date (YYYY-MM-DD) the data was last checked with the business; null: never checked. */
  checkedOn: string | null;
  image?: PlaceImage;
  /** Fictional example for trying the planner: must be labelled, never look like a real business. */
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
  /**
   * Guided tour order, stop by stop. Absent: every stop of each place in `stopIds`, in their order
   * (a place without stops is one stop). Lets a route use only some stops of a place.
   */
  tourStopIds?: StopId[];
  /** Illustrated map of the route, with its tour stops pinned. */
  illustratedMap?: IllustratedMap;
  demo: boolean;
}

/**
 * How much of a 3D model rests on what was found: the seal every reconstruction carries
 * (PLAN: "excavado, restituido o hipótesis"; plus the footprint of a geophysical survey).
 */
export type ModelCertainty = "excavated" | "restored" | "hypothesis" | "geophysical";

/** A 3D model shown at a stop (glTF/GLB), with what it shows and how sure it is. */
export interface StopModel {
  /** Path under /media (bundled) or a public URL in the content media store. */
  src: string;
  name: string;
  certainty: ModelCertainty;
  /** What is found and what is proposed, in plain words. Required. */
  description: string;
  /** What the model is based on (panel, excavation report, publication). */
  source?: string;
  /** USDZ version for augmented reality on iPhone. */
  iosSrc?: string;
}

/**
 * A 360° video recorded at a stop (equirectangular, 2:1): the visitor looks around by dragging,
 * with the keys or by moving the phone. Streamed, never part of an offline download (too large).
 */
export interface StopVideo360 {
  /** Web version for screens wider than a phone (3840×1920 H.264, see docs/VIDEO360.md). */
  src: string;
  /** Lighter version for phones (2560×1280); absent: `src` is used everywhere. */
  srcMobile?: string;
  /** Still frame shown before playing (an image path or URL). */
  poster?: string;
  name: string;
  /** What it shows, in words: required, for visitors who cannot see it. */
  description: string;
  durationSeconds: number;
  /** Where the camera looks first, in degrees from the video's centre (positive: to the right). */
  startYaw?: number;
  credit?: string;
}

/**
 * An illustrated (not to scale) map of a route, with a numbered pin per tour stop. Pins are
 * percentages of the image size.
 */
export interface IllustratedMap {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  credit: string;
  pins: { stopId: StopId; x: number; y: number }[];
}

/** Recorded narration of a stop: the file, how long it lasts and its full text (accessibility). */
export interface StopAudio {
  /** Path under /media (bundled) or a public URL in the content media store. */
  src: string;
  durationSeconds: number;
  /** What the player calls it, e.g. "Locución". */
  label: string;
  /** Full text of the recording, shown on demand: required, for deaf visitors and noisy places. */
  transcript: string;
  credit?: string;
}

/**
 * A point inside a place where the guided tour stops (the brief's "punto de interés"): a dig area,
 * a room, a viewpoint. The planner works with places; the tour, the audio and the stop-by-stop
 * stories work with stops.
 */
export interface Stop {
  id: StopId;
  siteId: SiteId;
  /** Order inside its place, from 1. */
  order: number;
  name: string;
  tagline?: string;
  /** Where the arrival zone is. Absent: the place's coordinates are used and arrival is manual. */
  coordinates?: Coordinates;
  /** Arrival zone radius in metres; absent = the default for the place's kind. */
  radiusMeters?: number;
  /** Indoors (a museum room): GPS is not reliable, so the stop is chosen by hand (or QR). */
  indoor?: boolean;
  /** Told only on routes that pass through the place, not in the place's own guided visit. */
  routeOnly?: boolean;
  audio?: StopAudio;
  /** Licensed images with credits, in display order. */
  gallery: PlaceImage[];
  /** 3D models, each with its certainty seal. */
  models?: StopModel[];
  /** 360° videos recorded at the stop. */
  videos360?: StopVideo360[];
  /** Derived from the stories that point to this stop. */
  storyIds: StoryId[];
}

export type TransportMode = "walk" | "car";

/**
 * Guided tour progress on this device. "live": stops are reached by walking into their zone
 * (geofence) or by hand; "virtual": the visitor steps through from anywhere.
 */
export interface TourProgress {
  /** What is being toured: a route ("route-…") or the stops of one place ("site-…"). */
  tourId: RouteId | SiteId;
  mode: "live" | "virtual";
  /** Index in the tour's stops of the stop being shown. */
  currentIndex: number;
  /** Tour stops reached (stop ids, or place ids for places without stops), in arrival order. */
  visitedStopIds: string[];
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
  /** Number of days of the trip (1 when absent). Every day runs from startTime to endTime. */
  days?: number;
  /** Keep a lunch break in each day's schedule (the tailored planner turns it on). */
  lunchBreak?: boolean;
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
  /** Day of the trip, from 0 (absent: the first day). */
  day?: number;
}

/** Moments of a day a service fills. */
export type ServiceSlot = "lunch" | "overnight" | "car" | "activity";

/** A service the visitor chose for the trip. */
export interface TripService {
  serviceId: ServiceId;
  /** Day it belongs to; for "overnight", the night after that day. */
  day: number;
  slot: ServiceSlot;
}

/** A pause the planner keeps in a day (lunch), with where it happens when a restaurant is chosen. */
export interface TripBreak {
  day: number;
  kind: "lunch";
  start: number;
  end: number;
  travelMinutesFromPrevious: number;
  serviceId?: ServiceId;
}

export interface Trip {
  id: string;
  /** Monotonic; every accepted change creates a new revision. */
  revision: number;
  context: TripContext;
  stops: TripStop[];
  /** Pauses kept in the schedule (computed by the planner). */
  breaks?: TripBreak[];
  /** Services chosen for the trip. */
  services?: TripService[];
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
  /** Pauses of the `after` schedule. */
  breaks?: TripBreak[];
  /** Services of the trip after the change (absent: unchanged). */
  services?: TripService[];
}

/** Title and one-line introduction of a group of places on the home page. */
export interface PlaceGroupCopy {
  title: string;
  intro: string;
}

/**
 * Curated entry points and the route's own vocabulary: which towns and themes exist, which place
 * and words lead the home page, and which questions get people started.
 */
export interface Showcase {
  /** Towns the route covers, in display order. Every place names one of them. */
  localities: Locality[];
  /** The whole area, offered as the "everywhere" trip choice, e.g. "Toledo y Guadamur". */
  regionName: string;
  /** Place themes in chip order (lowercase, e.g. "arqueología"). Every theme a place uses is listed. */
  themes: string[];
  heroSiteId: SiteId;
  heroTitle: string;
  heroIntro: string;
  /** Home page groups: Visigothic places first, then other heritage near the route. */
  placeGroups: { visigothic: PlaceGroupCopy; other: PlaceGroupCopy };
  /** One line under the greeting of an empty assistant chat. */
  assistantIntro: string;
  /** Starter questions on the home composer and the empty assistant. */
  starterPrompts: string[];
  /** Follow-up questions when nothing more specific applies. */
  generalPrompts: string[];
  /** What the assistant offers when it cannot answer; each topic is shown with its place token. */
  assistantExamples: { siteId: SiteId; topic: string }[];
  /**
   * Content vocabulary that marks a historical question (people, objects, events of this route),
   * lowercase and unaccented; a trailing "*" matches any word with that prefix.
   */
  heritageKeywords: string[];
  /** How a place in each locality is reached, said when a visitor asks how to get there. */
  gettingThere: Record<Locality, string>;
  /** Hints under the visit-area and transport choices of the chat context. */
  areaHints: Record<TripArea, string>;
  transportHints: Record<TransportMode, string>;
  /** Follow-up offered to visitors travelling with children. */
  familyPrompt: string;
}

/**
 * Everything visitors and the assistant see, as one published version: the bundled demo catalog or
 * a snapshot published from the admin. Claims here are published ones only.
 */
export interface Catalog {
  sites: Site[];
  /** Stops inside places; versions published before stops existed have none. */
  stops: Stop[];
  /** Complementary services; versions published before services existed have none. */
  services?: Service[];
  claims: ValidatedClaim[];
  stories: Story[];
  routes: Route[];
  showcase: Showcase;
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
  /**
   * Open mode only: the text includes general knowledge from the model, not from published claims.
   * The UI labels it as unverified.
   */
  generalKnowledge?: boolean;
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
  /** "strict" (default): history only from published claims. "open": see ASSISTANT_MODES. */
  mode?: AssistantMode;
}

/**
 * strict: historical statements only from published claims; off-topic questions are declined.
 * open: the model may add general knowledge, labelled as unverified, and answer related questions.
 * Unverified hours and access are never stated as fact in either mode.
 */
export const ASSISTANT_MODES = ["strict", "open"] as const;
export type AssistantMode = (typeof ASSISTANT_MODES)[number];

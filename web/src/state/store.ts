"use client";
/**
 * Client application state: one source of truth shared by chat, place panel, map and trip
 * (MINDTRIP-FLOW-ANALYSIS.md, "State and implementation implications").
 *
 * Device-local persistence only. The UI must say "Guardado en este dispositivo", never "en la nube".
 */
import { useSyncExternalStore } from "react";
import { EMPTY_PREFERENCES, type AssistantMode, type ChatMessage, type ItineraryProposal, type RouteId, type SiteId, type TourProgress, type Trip, type TripContext, type VisitorPreferences } from "@/domain/types";
import { needsStepFree } from "@/domain/recommend";
import { applyProposal, emptyTrip } from "@/domain/planner";
import { formatClock } from "@/domain/time";
import { showcase, validArea } from "@/data/content";
import {
  boundConversations,
  LEGACY_STORAGE_KEY,
  migrateV1,
  parseStored,
  STORAGE_KEY,
  type Conversation,
  type PersistedState,
} from "./persisted";

export type { Conversation } from "./persisted";

export interface AppState {
  context: TripContext;
  trip: Trip;
  /** Previous accepted revision, for one-step undo. */
  previousTrip: Trip | null;
  /** Pending proposal awaiting visitor acceptance (shown as a before/after preview). */
  pendingProposal: ItineraryProposal | null;
  savedSiteIds: SiteId[];
  /** Place shown in the contextual panel; shared by chat, map and lists. */
  selectedSiteId: SiteId | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  /** Transient confirmation toast, e.g. "Añadido a tu viaje · 11:30" with undo. */
  notice: { id: string; text: string; undoable: boolean } | null;
  /** Guided tour in progress, if any (resumable). */
  tour: TourProgress | null;
  /** Interests, pace, group and access needs (this device; synced to an account if signed in). */
  preferences: VisitorPreferences;
  /** How strictly the assistant keeps to published sources (this device). */
  assistantMode: AssistantMode;
}

/** A new visitor's trip settings: the whole region of the current catalog, today unset, 10:00–18:00. */
export function defaultContext(): TripContext {
  return {
    area: showcase().regionName,
    date: null,
    startTime: "10:00",
    endTime: "18:00",
    profile: "general",
    transport: "walk",
    stepFreeRequired: false,
  };
}

function initialState(): AppState {
  const context = defaultContext();
  return {
    context,
    trip: emptyTrip(context),
    previousTrip: null,
    pendingProposal: null,
    savedSiteIds: [],
    selectedSiteId: null,
    conversations: [],
    activeConversationId: null,
    notice: null,
    tour: null,
    preferences: EMPTY_PREFERENCES,
    assistantMode: "strict",
  };
}

let state: AppState = initialState();
let hydrated = false;
const listeners = new Set<() => void>();

/** Same trip settings (the visitor's "Dónde / Cuándo / Quién / Transporte" choices). */
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

/**
 * Another tab wrote the shared device-local state: adopt it so this tab never writes an older trip
 * back. Transient UI (pending proposal, toast, selection) stays local; a pending proposal built on
 * the older revision is then rejected as stale by applyProposal.
 */
function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  const parsed = parseStored(e.newValue);
  const { pendingProposal, notice, selectedSiteId } = state;
  state = parsed ? { ...state, ...parsed, pendingProposal, notice, selectedSiteId } : { ...initialState(), pendingProposal, notice, selectedSiteId };
  lastPersisted = persistedPart(state);
  listeners.forEach((l) => l());
}

/** Read this device's saved state; a v1 save is migrated once and rewritten as v2. */
function readDevice(): Partial<PersistedState> | null {
  const current = parseStored(window.localStorage.getItem(STORAGE_KEY));
  if (current) return current;
  const legacy = migrateV1(window.localStorage.getItem(LEGACY_STORAGE_KEY));
  if (legacy) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
  return legacy;
}

/** Keep the trip area among the current catalog's choices (towns can be renamed in the admin). */
function withValidArea(s: AppState): AppState {
  const area = validArea(s.context.area);
  const tripArea = validArea(s.trip.context.area);
  if (area === s.context.area && tripArea === s.trip.context.area) return s;
  return { ...s, context: { ...s.context, area }, trip: { ...s.trip, context: { ...s.trip.context, area: tripArea } } };
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = readDevice();
    if (stored) state = { ...state, ...stored, pendingProposal: null, notice: null, selectedSiteId: null };
  } catch {
    // Storage unavailable or corrupt: continue with in-memory state.
  }
  // Runs on first render, after CatalogProvider installed the published catalog.
  state = withValidArea(state);
  lastPersisted = persistedPart(state);
  window.addEventListener("storage", onStorage);
}

function persistedPart(s: AppState): PersistedState {
  const { context, trip, previousTrip, savedSiteIds, conversations, activeConversationId, tour, preferences, assistantMode } = s;
  return { context, trip, previousTrip, savedSiteIds, conversations, activeConversationId, tour, preferences, assistantMode };
}

/** Last state written, so selection and toasts (which are not stored) do not rewrite storage. */
let lastPersisted: PersistedState | null = null;
/** The visitor is told once per session when this device cannot save. */
let saveFailureShown = false;

function persist() {
  const next = persistedPart(state);
  const prev = lastPersisted;
  if (prev && (Object.keys(next) as (keyof PersistedState)[]).every((k) => next[k] === prev[k])) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    lastPersisted = next;
  } catch {
    // Quota or private mode: the state stays in memory; say so once rather than fail silently.
    if (!saveFailureShown) {
      saveFailureShown = true;
      state = {
        ...state,
        notice: { id: newId("n"), text: "No se pudo guardar en este dispositivo: los cambios se perderán al cerrar.", undoable: false },
      };
    }
  }
}

function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  if (typeof window !== "undefined") persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverSnapshot = initialState();

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => {
      hydrate();
      return selector(state);
    },
    () => selector(serverSnapshot),
  );
}

export function getAppState(): AppState {
  hydrate();
  return state;
}

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/** Feedback specific to the change: "Añadido a tu viaje · 11:30", "Quitado de tu viaje"… */
function acceptedText(proposal: ItineraryProposal, trip: Trip): string {
  const routeChange = proposal.routeId !== undefined;
  if (!routeChange && proposal.added.length === 1 && proposal.removed.length === 0) {
    const stop = trip.stops.find((st) => st.siteId === proposal.added[0]);
    if (stop) return `Añadido a tu viaje · ${formatClock(stop.visitStart ?? stop.arrival)}`;
  }
  if (!routeChange && proposal.removed.length === 1 && proposal.added.length === 0) return "Quitado de tu viaje";
  return "Viaje actualizado";
}

export const actions = {
  selectSite(siteId: SiteId | null) {
    setState((s) => ({ ...s, selectedSiteId: siteId }));
  },

  toggleSaved(siteId: SiteId) {
    setState((s) => {
      const saved = s.savedSiteIds.includes(siteId);
      return {
        ...s,
        savedSiteIds: saved ? s.savedSiteIds.filter((id) => id !== siteId) : [...s.savedSiteIds, siteId],
        notice: { id: newId("n"), text: saved ? "Quitado de Guardados" : "Guardado en este dispositivo", undoable: false },
      };
    });
  },

  /**
   * Record the visitor's preferences. An empty trip has nothing to reschedule, so it adopts them
   * directly (planner additions read trip.context); a trip with stops changes only via a proposal.
   */
  setContext(patch: Partial<TripContext>) {
    setState((s) => {
      const context = { ...s.context, ...patch };
      if (s.trip.stops.length > 0) return { ...s, context };
      return {
        ...s,
        context,
        trip: { ...s.trip, context, revision: s.trip.revision + 1, updatedAt: new Date().toISOString() },
      };
    });
  },

  /**
   * Record preferences. Step-free needs (wheelchair, reduced mobility, stroller) switch on the
   * planner's step-free check through setContext, so a trip with stops is still only re-planned
   * by a reviewed proposal.
   */
  setAssistantMode(assistantMode: AssistantMode) {
    setState((s) => ({ ...s, assistantMode }));
  },
  setPreferences(preferences: VisitorPreferences) {
    setState((s) => ({ ...s, preferences }));
    const stepFree = needsStepFree(preferences.accessNeeds);
    if (stepFree !== state.context.stepFreeRequired) actions.setContext({ stepFreeRequired: stepFree });
  },

  /** Show a planner proposal for review. Nothing changes in the trip until acceptProposal. */
  propose(proposal: ItineraryProposal) {
    setState((s) => ({ ...s, pendingProposal: proposal }));
  },

  dismissProposal() {
    setState((s) => ({ ...s, pendingProposal: null }));
  },

  acceptProposal(): { ok: true } | { ok: false; error: string } {
    const { trip, pendingProposal } = state;
    if (!pendingProposal) return { ok: false, error: "none" };
    const result = applyProposal(trip, pendingProposal, new Date().toISOString());
    if ("error" in result) {
      setState((s) => ({
        ...s,
        pendingProposal: null,
        notice: { id: newId("n"), text: "Tu viaje cambió mientras revisabas. Vuelve a intentarlo.", undoable: false },
      }));
      return { ok: false, error: result.error };
    }
    setState((s) => ({
      ...s,
      previousTrip: s.trip,
      trip: result,
      // Keep preferences the visitor changed but has not applied unless this proposal changes the settings.
      context: sameContext(result.context, s.trip.context) ? s.context : result.context,
      pendingProposal: null,
      notice: { id: newId("n"), text: acceptedText(pendingProposal, result), undoable: true },
    }));
    return { ok: true };
  },

  undo() {
    setState((s) =>
      s.previousTrip
        ? {
            ...s,
            trip: { ...s.previousTrip, revision: s.trip.revision + 1 },
            context: sameContext(s.context, s.trip.context) ? s.previousTrip.context : s.context,
            previousTrip: null,
            notice: { id: newId("n"), text: "Cambio deshecho", undoable: false },
          }
        : s,
    );
  },

  clearNotice() {
    setState((s) => ({ ...s, notice: null }));
  },

  notify(text: string) {
    setState((s) => ({ ...s, notice: { id: newId("n"), text, undoable: false } }));
  },

  newConversation(): string {
    const id = newId("chat");
    setState((s) => ({
      ...s,
      conversations: boundConversations([{ id, title: "Nuevo chat", messages: [], updatedAt: new Date().toISOString() }, ...s.conversations]),
      activeConversationId: id,
    }));
    return id;
  },

  openConversation(id: string | null) {
    setState((s) => ({ ...s, activeConversationId: id }));
  },

  appendMessage(conversationId: string, message: ChatMessage) {
    setState((s) => ({
      ...s,
      conversations: boundConversations(
        s.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                title: c.messages.length === 0 && message.role === "user" ? message.text.slice(0, 48) : c.title,
                messages: [...c.messages, message],
                updatedAt: message.createdAt,
              }
            : c,
        ),
      ),
    }));
  },

  /** Start (or restart) a guided tour of a route, or of the stops of one place, at a stop. */
  startTour(tourId: RouteId | SiteId, mode: TourProgress["mode"], startIndex = 0) {
    const now = new Date().toISOString();
    setState((s) => ({
      ...s,
      tour: { tourId, mode, currentIndex: startIndex, visitedStopIds: [], startedAt: now, updatedAt: now },
    }));
  },

  /** Show another stop of the tour (manual next/previous). */
  setTourStop(index: number) {
    setState((s) =>
      s.tour ? { ...s, tour: { ...s.tour, currentIndex: Math.max(0, index), updatedAt: new Date().toISOString() } } : s,
    );
  },

  /** The visitor reached a stop (geofence or "Ya estoy aquí"): record it and show it. */
  markTourArrival(stopId: string, index: number) {
    setState((s) =>
      s.tour
        ? {
            ...s,
            tour: {
              ...s.tour,
              currentIndex: index,
              visitedStopIds: s.tour.visitedStopIds.includes(stopId) ? s.tour.visitedStopIds : [...s.tour.visitedStopIds, stopId],
              updatedAt: new Date().toISOString(),
            },
          }
        : s,
    );
  },

  endTour() {
    setState((s) => ({ ...s, tour: null }));
  },

  deleteConversation(id: string) {
    setState((s) => ({
      ...s,
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
    }));
  },
};

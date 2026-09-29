"use client";
/**
 * Client application state: one source of truth shared by chat, place panel, map and trip
 * (MINDTRIP-FLOW-ANALYSIS.md, "State and implementation implications").
 *
 * Device-local persistence only. The UI must say "Guardado en este dispositivo", never "en la nube".
 */
import { useSyncExternalStore } from "react";
import type { ChatMessage, ItineraryProposal, SiteId, Trip, TripContext } from "@/domain/types";
import { applyProposal, emptyTrip, formatClock } from "@/domain/planner";

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

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
}

const STORAGE_KEY = "ruta-visigoda:v1";

export const DEFAULT_CONTEXT: TripContext = {
  area: "Toledo y Guadamur",
  date: null,
  startTime: "10:00",
  endTime: "18:00",
  profile: "general",
  transport: "walk",
  stepFreeRequired: false,
};

function initialState(): AppState {
  return {
    context: DEFAULT_CONTEXT,
    trip: emptyTrip(DEFAULT_CONTEXT),
    previousTrip: null,
    pendingProposal: null,
    savedSiteIds: [],
    selectedSiteId: null,
    conversations: [],
    activeConversationId: null,
    notice: null,
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

function readStored(raw: string | null): Partial<AppState> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Another tab wrote the shared device-local state: adopt it so this tab never writes an older trip
 * back. Transient UI (pending proposal, toast, selection) stays local; a pending proposal built on
 * the older revision is then rejected as stale by applyProposal.
 */
function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  const parsed = readStored(e.newValue);
  const { pendingProposal, notice, selectedSiteId } = state;
  state = parsed ? { ...state, ...parsed, pendingProposal, notice, selectedSiteId } : { ...initialState(), pendingProposal, notice, selectedSiteId };
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const parsed = readStored(window.localStorage.getItem(STORAGE_KEY));
    if (parsed) state = { ...state, ...parsed, pendingProposal: null, notice: null, selectedSiteId: null };
  } catch {
    // Storage unavailable or corrupt: continue with in-memory state.
  }
  window.addEventListener("storage", onStorage);
}

function persist() {
  try {
    const { context, trip, previousTrip, savedSiteIds, conversations, activeConversationId } = state;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ context, trip, previousTrip, savedSiteIds, conversations, activeConversationId }),
    );
  } catch {
    // Ignore quota/private-mode failures; state stays in memory.
  }
}

function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  persist();
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
  const routeChange = (proposal as { routeId?: string }).routeId !== undefined;
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
      conversations: [{ id, title: "Nuevo chat", messages: [], updatedAt: new Date().toISOString() }, ...s.conversations],
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
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              title: c.messages.length === 0 && message.role === "user" ? message.text.slice(0, 48) : c.title,
              messages: [...c.messages, message],
              updatedAt: message.createdAt,
            }
          : c,
      ),
    }));
  },

  deleteConversation(id: string) {
    setState((s) => ({
      ...s,
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
    }));
  },
};

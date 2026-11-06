"use client";
/**
 * Trip changes from the trip, map and saved screens. Every change is a planner proposal that the
 * visitor reviews in ProposalReview; nothing here mutates the trip directly.
 */
import type { ItineraryProposal, ServiceId, ServiceSlot, SiteId, Trip, TripContext } from "@/domain/types";
import { proposeAdd, proposeMove, proposeMoveToDay, proposePlan, proposeRemove, proposeService, reschedule, type PlanEntry } from "@/domain/planner";
import { actions, getAppState } from "@/state/store";

const FAILED = "No se pudo calcular el cambio en tu viaje. Inténtalo de nuevo.";

/** Build a proposal from the current trip and open it for review. Ignored while another is pending. */
export function proposeChange(make: (trip: Trip) => ItineraryProposal): boolean {
  const { trip, pendingProposal } = getAppState();
  if (pendingProposal) return false;
  try {
    actions.propose(make(trip));
    return true;
  } catch {
    actions.notify(FAILED);
    return false;
  }
}

export function requestAdd(siteId: SiteId) {
  const { trip } = getAppState();
  if (trip.stops.some((s) => s.siteId === siteId)) {
    actions.notify("Ya está en tu viaje");
    return;
  }
  proposeChange((t) => proposeAdd(t, siteId));
}

export function requestRemove(siteId: SiteId) {
  proposeChange((t) => proposeRemove(t, siteId));
}

export function requestMove(siteId: SiteId, toIndex: number) {
  proposeChange((t) => proposeMove(t, siteId, toIndex));
}

export function requestMoveToDay(siteId: SiteId, day: number) {
  proposeChange((t) => proposeMoveToDay(t, siteId, day));
}

/** Choose a service for a day's slot (or remove it with `serviceId` null). */
export function requestService(day: number, slot: ServiceSlot, serviceId: ServiceId | null) {
  proposeChange((t) => proposeService(t, { day, slot, serviceId }));
}

/** Replace the trip with a composed plan (the tailored planner). */
export function requestPlan(entries: PlanEntry[], context: TripContext, notes: string[] = []): boolean {
  actions.setContext(context);
  return proposeChange((t) => proposePlan(t, entries, context, notes));
}

export function sameContext(a: TripContext, b: TripContext): boolean {
  return (
    a.area === b.area &&
    a.date === b.date &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime &&
    a.profile === b.profile &&
    a.transport === b.transport &&
    a.stepFreeRequired === b.stepFreeRequired &&
    (a.days ?? 1) === (b.days ?? 1) &&
    Boolean(a.lunchBreak) === Boolean(b.lunchBreak)
  );
}

/**
 * Change trip constraints: record them with setContext (an empty trip adopts them there, since
 * there is nothing to review), then, if the trip has stops, ask the planner to reschedule for review.
 */
export function requestContextChange(next: TripContext) {
  const { trip, pendingProposal } = getAppState();
  if (pendingProposal) return;
  actions.setContext(next);
  if (trip.stops.length === 0) {
    actions.notify("Preferencias del viaje actualizadas en este dispositivo");
    return;
  }
  proposeChange((t) => reschedule(t, next));
}

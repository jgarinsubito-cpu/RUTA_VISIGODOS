"use client";
/**
 * Sending logic for the assistant workspace: appends the visitor's message to the active
 * conversation (creating one if needed), calls POST /api/assistant with a 25 s timeout and appends
 * the answer. Failures keep the question so the visitor can retry without retyping.
 */
import { useRef, useState } from "react";
import type { ChatMessage } from "@/domain/types";
import { actions, getAppState, newId, useAppState } from "@/state/store";
import { buildRequest, isAnswer } from "./format";

export const TIMEOUT_MS = 25_000;

export interface AssistantFailure {
  conversationId: string;
  text: string;
  previous: ChatMessage[];
  timedOut: boolean;
}

export function useAssistant() {
  const [pendingConversationId, setPending] = useState<string | null>(null);
  // Per conversation: sending in one chat must not discard another chat's retry option.
  const [failures, setFailures] = useState<Record<string, AssistantFailure>>({});
  const busy = useRef(false);

  async function run(conversationId: string, text: string, previous: ChatMessage[]) {
    busy.current = true;
    setPending(conversationId);
    setFailures((all) => {
      if (!(conversationId in all)) return all;
      const next = { ...all };
      delete next[conversationId];
      return next;
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const s = getAppState();
      const body = buildRequest(
        text,
        previous,
        s.context,
        s.selectedSiteId,
        s.trip.stops.map((st) => st.siteId),
        s.preferences,
      );
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const answer: unknown = await res.json();
      if (!isAnswer(answer)) throw new Error("Respuesta no válida");
      actions.appendMessage(conversationId, {
        id: newId("m"),
        role: "assistant",
        text: answer.text,
        answer,
        createdAt: new Date().toISOString(),
      });
    } catch {
      const failed: AssistantFailure = { conversationId, text, previous, timedOut: controller.signal.aborted };
      setFailures((all) => ({ ...all, [conversationId]: failed }));
    } finally {
      clearTimeout(timer);
      busy.current = false;
      setPending(null);
    }
  }

  /** Returns false when nothing was sent (empty text or a request already in flight). */
  function send(raw: string): boolean {
    const text = raw.trim();
    if (!text || busy.current) return false;
    const state = getAppState();
    let conversation = state.conversations.find((c) => c.id === state.activeConversationId);
    const conversationId = conversation?.id ?? actions.newConversation();
    conversation = getAppState().conversations.find((c) => c.id === conversationId);
    const previous = conversation?.messages ?? [];
    actions.appendMessage(conversationId, {
      id: newId("m"),
      role: "user",
      text,
      createdAt: new Date().toISOString(),
    });
    void run(conversationId, text, previous);
    return true;
  }

  const activeId = useAppState((s) => s.activeConversationId);
  const failure = activeId ? (failures[activeId] ?? null) : null;

  /** Retry the failed request of the active conversation. */
  function retry() {
    if (!failure || busy.current) return;
    void run(failure.conversationId, failure.text, failure.previous);
  }

  return { send, retry, failure, pendingConversationId, sending: pendingConversationId !== null };
}

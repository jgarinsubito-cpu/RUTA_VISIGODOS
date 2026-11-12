"use client";
/**
 * Assistant workspace (/asistente), modelled on Mindtrip /chat: conversation title menu, context
 * pill and trip button on top; empty state or message list in the middle (the only scrolling
 * region); composer at the bottom; place panel beside the chat on lg+ or as a sheet below lg.
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { getSite } from "@/data/content";
import { reschedule } from "@/domain/planner";
import { actions, getAppState, useAppState } from "@/state/store";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { IconInfo, IconTrip } from "@/components/shell/icons";
import { PlacePanel } from "@/components/place/PlacePanel";
import { AssistantMessage } from "./AssistantMessage";
import { Composer } from "./Composer";
import { ContextPill, type Segment } from "./ContextPill";
import { ConversationMenu } from "./ConversationMenu";
import { EmptyState } from "./EmptyState";
import { contextLine, sameContext } from "./format";
import { PlaceSheet } from "@/components/place/PlaceSheet";
import { SignupPrompt } from "@/components/account/SignupPrompt";
import { prefersReducedMotion } from "@/lib/motion";
import { useAssistant } from "./useAssistant";
import { consumeAskHandoff } from "./askHandoff";
import { NearbyControl } from "@/components/nearby/NearbyControl";

function prefillFor(siteId: string | null): string {
  const site = siteId ? getSite(siteId) : undefined;
  return site ? `Cuéntame sobre ${site.name}` : "";
}

function recalculate() {
  const s = getAppState();
  if (s.pendingProposal) return;
  try {
    actions.propose(reschedule(s.trip, s.context));
  } catch {
    actions.notify("No se pudo calcular el cambio en tu viaje. Inténtalo de nuevo.");
  }
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-display text-xs text-on-primary">
        RV
      </span>
      <span className="inline-flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-sm text-ink-muted">
        <span aria-hidden="true" className="flex gap-1">
          {[0, 150, 300].map((d) => (
            <span
              key={d}
              className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-bounce"
              style={{ animationDelay: `${d}ms` }}
            />
          ))}
        </span>
        Buscando en las fichas…
      </span>
    </div>
  );
}

export function AssistantWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteParam = searchParams.get("site");
  const qParam = searchParams.get("q");

  const context = useAppState((s) => s.context);
  const trip = useAppState((s) => s.trip);
  const pendingProposal = useAppState((s) => s.pendingProposal !== null);
  const selectedSiteId = useAppState((s) => s.selectedSiteId);
  const conversations = useAppState((s) => s.conversations);
  const activeId = useAppState((s) => s.activeConversationId);
  const active = conversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const { send, retry, failure, pendingConversationId, sending } = useAssistant();
  const [openSegment, setOpenSegment] = useState<Segment | null>(null);
  const [text, setText] = useState(() => prefillFor(siteParam));
  const [seenSite, setSeenSite] = useState(siteParam);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const handledQ = useRef<string | null>(null);

  // ?site=<id> arriving while mounted (e.g. "Preguntar sobre este lugar"): prefill, don't send.
  if (siteParam !== seenSite) {
    setSeenSite(siteParam);
    const prefill = prefillFor(siteParam);
    if (prefill) setText(prefill);
  }

  const handleUrl = useEffectEvent((site: string | null, q: string | null) => {
    if (!site && !q) {
      handledQ.current = null;
      return;
    }
    if (site && getSite(site)) {
      // Desktop shows the panel beside the chat. Below lg the panel is a modal sheet that would
      // cover the composer the visitor came to use, so only prefill and focus it there.
      const desktop = window.matchMedia(DESKTOP_QUERY).matches;
      actions.selectSite(desktop ? site : null);
      // After any open sheet unmounts and its focus trap has restored focus.
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
    // ?q= is sent only when it is an in-app hand-off from Explorar; any other link just prefills.
    if (q && handledQ.current !== q) {
      handledQ.current = q;
      const question = q.slice(0, 1000);
      if (consumeAskHandoff(q.trim())) {
        actions.openConversation(null);
        send(question);
      } else {
        requestAnimationFrame(() => {
          setText(question);
          inputRef.current?.focus({ preventScroll: true });
        });
      }
    }
    router.replace("/asistente", { scroll: false });
  });

  useEffect(() => handleUrl(siteParam, qParam), [siteParam, qParam]);

  const lastId = messages.at(-1)?.id;
  const showTyping = sending && pendingConversationId === (active?.id ?? null);
  const showFailure = failure !== null && failure.conversationId === active?.id;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // The empty state always opens at the top so its heading is visible.
    if (lastId === undefined && !showTyping && !showFailure) {
      el.scrollTop = 0;
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [lastId, showTyping, showFailure, activeId]);

  function onSend(value: string) {
    if (send(value)) setText("");
  }

  // Empty trips adopt new preferences in actions.setContext; with stops, the banner offers a recalculation.
  function onSegmentChange(next: Segment | null) {
    setOpenSegment(next);
  }

  const diverged = trip.stops.length > 0 && !sameContext(context, trip.context);
  const panelSiteId = selectedSiteId && getSite(selectedSiteId) ? selectedSiteId : null;
  const panelOpen = panelSiteId !== null;
  const empty = messages.length === 0;
  const lastAssistant = messages.at(-1)?.role === "assistant";

  const threeCol = panelOpen && isDesktop
    ? {
        grid: "2xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
        pill: "2xl:order-2 2xl:col-span-1",
        trip: "2xl:order-3",
      }
    : {
        grid: "lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
        pill: "lg:order-2 lg:col-span-1",
        trip: "lg:order-3",
      };

  return (
    <>
      <div className="flex h-[calc(100dvh-var(--mobile-nav)-env(safe-area-inset-bottom))] min-h-0 md:h-dvh">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-stone bg-ivory px-3 py-2 md:px-6">
            <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 ${threeCol.grid}`}>
              <div className="order-1 min-w-0">
                <ConversationMenu />
              </div>
              <ContextPill
                context={context}
                open={openSegment}
                onOpenChange={onSegmentChange}
                className={`order-3 col-span-2 justify-self-stretch ${threeCol.pill} lg:justify-self-center`}
              />
              <div className={`order-2 flex items-center gap-2 justify-self-end ${threeCol.trip}`}>
              <NearbyControl variant="icon" />
              <Link
                href="/mi-viaje"
                className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border border-stone bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
              >
                <IconTrip width={18} height={18} />
                {trip.stops.length > 0 ? (
                  <>
                    Mi viaje ({trip.stops.length})<span className="sr-only"> paradas</span>
                  </>
                ) : (
                  "Crear un viaje"
                )}
              </Link>
              </div>
            </div>
            <p className="sr-only" aria-live="polite">
              Preferencias: {contextLine(context)}
            </p>
          </header>

          {diverged && (
            <div role="status" className="border-b border-stone bg-warn-soft px-3 py-2 md:px-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-2 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-2">
                  <IconInfo width={18} height={18} className="mt-0.5 shrink-0 text-warn" />
                  Has cambiado tus preferencias; tu viaje sigue calculado con las anteriores.
                </p>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => actions.setContext(trip.context)}
                    className="min-h-11 rounded-full border border-stone bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
                  >
                    Mantener las anteriores
                  </button>
                  <button
                    type="button"
                    disabled={pendingProposal}
                    onClick={recalculate}
                    className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60"
                  >
                    Recalcular mi viaje
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {empty && !showTyping && !showFailure ? (
              <EmptyState onPrompt={onSend} onConfigure={() => onSegmentChange("who")} disabled={sending} />
            ) : (
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6">
                <h1 className="sr-only">Asistente de la ruta: {active?.title ?? "Nuevo chat"}</h1>
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-surface-muted px-4 py-2.5 text-body text-ink">
                        <span className="sr-only">Tú: </span>
                        {m.text}
                      </p>
                    </div>
                  ) : (
                    <AssistantMessage
                      key={m.id}
                      text={m.text}
                      answer={m.answer}
                      latest={m.id === lastId}
                      sending={sending}
                      onPrompt={onSend}
                    />
                  ),
                )}
                {showTyping && <TypingIndicator />}
                {showFailure && (
                  <div role="alert" className="flex flex-col gap-3 rounded-xl border border-warn/40 bg-warn-soft p-4 text-sm text-ink">
                    <p className="flex items-start gap-2">
                      <IconInfo width={18} height={18} className="mt-0.5 shrink-0 text-warn" />
                      <span>
                        {failure.timedOut && "La respuesta está tardando demasiado. "}
                        El asistente no está disponible ahora. Puedes seguir explorando la ruta.
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={retry}
                        disabled={sending}
                        className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60"
                      >
                        Reintentar
                      </button>
                      <Link
                        href="/"
                        className="inline-flex min-h-11 items-center rounded-full border border-stone bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
                      >
                        Explorar la ruta
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="sr-only" aria-live="polite">
            {showTyping ? "El asistente está preparando la respuesta." : lastAssistant ? "Respuesta del asistente disponible." : ""}
          </p>

          <Composer value={text} onChange={setText} onSend={onSend} sending={sending} inputRef={inputRef} />
        </div>

        {panelSiteId && isDesktop && (
          <aside aria-label="Ficha del lugar" className="flex min-h-0 w-[420px] shrink-0 flex-col border-l border-stone">
            <PlacePanel key={panelSiteId} siteId={panelSiteId} variant="panel" onClose={() => actions.selectSite(null)} />
          </aside>
        )}
      </div>

      {panelSiteId && !isDesktop && <PlaceSheet variant="fullscreen" siteId={panelSiteId} onClose={() => actions.selectSite(null)} />}
      <SignupPrompt ready={!sending && lastAssistant && !pendingProposal && !(panelSiteId && !isDesktop)} />
    </>
  );
}

/** Suspense fallback while search params resolve on the client. */
export function WorkspaceFallback() {
  return (
    <div className="flex h-[calc(100dvh-var(--mobile-nav)-env(safe-area-inset-bottom))] flex-col md:h-dvh" aria-busy="true">
      <div className="h-[6.5rem] border-b border-stone lg:h-[3.75rem]" />
      <div className="grid flex-1 place-items-center text-sm text-ink-muted">Cargando el asistente…</div>
    </div>
  );
}

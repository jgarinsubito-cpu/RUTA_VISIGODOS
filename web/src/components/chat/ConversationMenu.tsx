"use client";
/**
 * Conversation title with a dropdown (Mindtrip "Nuevo chat ▾"): start a new chat, reopen a recent
 * one or delete the current one (with inline confirmation). Conversations live on this device.
 */
import { useId, useRef, useState } from "react";
import { actions, useAppState } from "@/state/store";
import { IconChat, IconPlus } from "@/components/shell/icons";
import { usePopover } from "./usePopover";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const item = "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm";

export function ConversationMenu() {
  const conversations = useAppState((s) => s.conversations);
  const activeId = useAppState((s) => s.activeConversationId);
  const active = conversations.find((c) => c.id === activeId) ?? null;
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const refocusDelete = useRef(false);
  const menuId = useId();
  const title = active?.title || "Nuevo chat";

  function close(returnFocus = true) {
    setOpen(false);
    setConfirming(false);
    if (returnFocus) triggerRef.current?.focus();
  }
  usePopover(open, panelRef, triggerRef, () => close(false));

  const recent = conversations.filter((c) => c.messages.length > 0).slice(0, 10);

  return (
    <div className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        className="flex min-h-11 max-w-full items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink hover:bg-surface-muted"
      >
        <span className="sr-only">Conversación: </span>
        <span className="truncate">{title}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={menuId}
          role="dialog"
          aria-label="Conversaciones"
          tabIndex={-1}
          className="absolute left-0 top-full z-30 mt-2 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-1 rounded-2xl border border-stone bg-surface p-2 shadow-lg"
        >
          <button
            type="button"
            data-autofocus
            onClick={() => {
              actions.openConversation(null);
              close();
            }}
            className={`${item} font-semibold text-ink hover:bg-surface-muted`}
          >
            <IconPlus width={18} height={18} />
            Nuevo chat
          </button>

          {recent.length > 0 && (
            <div className="border-t border-stone pt-1">
              <p className="px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wider text-ink-muted">
                Chats recientes en este dispositivo
              </p>
              <ul className="max-h-64 overflow-y-auto">
                {recent.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-current={c.id === activeId ? "true" : undefined}
                      onClick={() => {
                        actions.openConversation(c.id);
                        close();
                      }}
                      className={`${item} ${c.id === activeId ? "bg-surface-muted font-semibold text-ink" : "text-ink-muted hover:bg-surface-muted hover:text-ink"}`}
                    >
                      <IconChat width={16} height={16} className="shrink-0" />
                      <span className="truncate">{c.title}</span>
                      {c.id === activeId && <span className="sr-only"> (actual)</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {active && (
            <div className="border-t border-stone pt-1">
              {confirming ? (
                <div role="group" aria-label="Confirmar eliminación" className="flex flex-col gap-2 px-3 py-2">
                  <p className="text-sm text-ink">¿Eliminar este chat? Se borrará de este dispositivo.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      ref={(el) => el?.focus()}
                      onClick={() => {
                        actions.deleteConversation(active.id);
                        actions.notify("Chat eliminado de este dispositivo");
                        close();
                      }}
                      className="min-h-11 rounded-full border border-danger px-4 text-sm font-semibold text-danger hover:bg-surface-muted"
                    >
                      Eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        refocusDelete.current = true;
                        setConfirming(false);
                      }}
                      className="min-h-11 rounded-full border border-stone px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  ref={(el) => {
                    if (el && refocusDelete.current) {
                      refocusDelete.current = false;
                      el.focus();
                    }
                  }}
                  onClick={() => setConfirming(true)}
                  className={`${item} font-medium text-danger hover:bg-surface-muted`}
                >
                  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                  </svg>
                  Eliminar chat
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

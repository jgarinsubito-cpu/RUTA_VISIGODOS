"use client";
/**
 * Transient confirmation (state.notice). Always-mounted polite live region; auto-dismisses after
 * ~5 s (paused while hovered or focused). Offers "Deshacer" when the notice is undoable.
 * Sits above the mobile bottom navigation, and above a place sheet's action bar when one is open.
 */
import { useEffect, useState } from "react";
import { actions, getAppState, useAppState, type AppState } from "@/state/store";
import { IconClose } from "@/components/shell/icons";

const DISMISS_MS = 5000;
const UNDO_DISMISS_MS = 8000;

type Notice = NonNullable<AppState["notice"]>;

/** Keyed by notice id: the pause state belongs to one notice and never leaks into the next. */
function ToastBody({ notice }: { notice: Notice }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = notice.id;
    const t = window.setTimeout(
      () => {
        if (getAppState().notice?.id === id) actions.clearNotice();
      },
      notice.undoable ? UNDO_DISMISS_MS : DISMISS_MS,
    );
    return () => window.clearTimeout(t);
  }, [notice, paused]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-xl bg-ink py-1.5 pl-4 pr-1.5 text-sm text-ivory shadow-lg"
    >
      <p className="flex-1 py-2">{notice.text}</p>
      {notice.undoable && (
        <button
          type="button"
          onClick={() => {
            setPaused(false);
            actions.undo();
          }}
          className="min-h-11 rounded-lg px-3 font-semibold text-accent-soft underline-offset-2 hover:underline"
        >
          Deshacer
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setPaused(false);
          actions.clearNotice();
        }}
        aria-label="Cerrar aviso"
        className="grid h-11 w-11 place-items-center rounded-lg text-ivory/80 hover:text-ivory"
      >
        <IconClose width={18} height={18} />
      </button>
    </div>
  );
}

export function NoticeToast() {
  const notice = useAppState((s) => s.notice);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-toast-region
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--mobile-nav)+0.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6"
    >
      {notice && <ToastBody key={notice.id} notice={notice} />}
    </div>
  );
}

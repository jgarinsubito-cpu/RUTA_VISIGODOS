"use client";
/**
 * Mobile/tablet place sheet wrapping PlacePanel. Modal: focus trapped, Escape closes, focus returns
 * to the chip, card or marker that opened it. A proposal review stacks its own trap on top, so
 * ProposalReview owns the keyboard while it is open.
 *   "fullscreen": covers the chat, with a "Volver al chat" back button.
 *   "bottom": sheet over the map with a backdrop that closes it.
 */
import { useId, useRef } from "react";
import { getSite } from "@/data/content";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useSheetFlag } from "@/lib/useSheetFlag";
import { IconChevronLeft, IconClose } from "@/components/shell/icons";
import { PlacePanel } from "./PlacePanel";

export function PlaceSheet({
  siteId,
  onClose,
  variant,
}: {
  siteId: string;
  onClose: () => void;
  variant: "fullscreen" | "bottom";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Stays active under a proposal review: the stacked trap hands keys to the dialog on top.
  useFocusTrap(ref, true, onClose);
  useSheetFlag();
  const name = getSite(siteId)?.name ?? "Lugar";

  const panel = (
    <div className="min-h-0 flex-1">
      <PlacePanel key={siteId} siteId={siteId} variant="panel" />
    </div>
  );

  if (variant === "fullscreen") {
    return (
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed inset-0 z-40 flex flex-col bg-ivory pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
      >
        <div className="flex items-center gap-2 border-b border-stone bg-surface px-2 py-1">
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full pl-1 pr-3 text-sm font-semibold text-primary hover:bg-surface-muted"
          >
            <IconChevronLeft width={20} height={20} />
            Volver al chat
          </button>
          <p id={titleId} className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-ink-muted">
            <span className="sr-only">Ficha del lugar: </span>
            {name}
          </p>
        </div>
        {panel}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end">
      <div aria-hidden="true" className="absolute inset-0 bg-scrim" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-ivory pb-[env(safe-area-inset-bottom)] shadow-xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-stone bg-surface px-4 pb-1.5 pt-2">
          <span aria-hidden="true" className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-stone" />
          <p id={titleId} className="min-w-0 truncate pt-1 text-sm font-semibold text-ink">
            {name}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            <IconClose width={18} height={18} />
            Cerrar
          </button>
        </div>
        {panel}
      </div>
    </div>
  );
}

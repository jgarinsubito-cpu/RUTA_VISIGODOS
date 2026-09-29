"use client";
/**
 * Mobile/tablet full-height place sheet over the chat. Modal: focus trapped, Escape closes, focus
 * returns to the chip or card that opened it. A proposal review stacks its own trap on top.
 */
import { useId, useRef } from "react";
import { getSite } from "@/data/catalog";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useSheetFlag } from "@/lib/useSheetFlag";
import { IconChevronLeft } from "@/components/shell/icons";
import { PlacePanel } from "@/components/place/PlacePanel";

export function PlaceSheet({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Stays active under a proposal review: the stacked trap hands keys to the dialog on top.
  useFocusTrap(ref, true, onClose);
  useSheetFlag();
  const name = getSite(siteId)?.name ?? "Lugar";

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
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full pl-1 pr-3 text-sm font-semibold text-olive hover:bg-surface-muted"
        >
          <IconChevronLeft width={20} height={20} />
          Volver al chat
        </button>
        <p id={titleId} className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-ink-muted">
          <span className="sr-only">Ficha del lugar: </span>
          {name}
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <PlacePanel key={siteId} siteId={siteId} variant="panel" />
      </div>
    </div>
  );
}

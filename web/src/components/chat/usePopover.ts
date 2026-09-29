"use client";
/**
 * Non-modal popover behaviour (disclosure pattern): moves focus into the panel when it opens,
 * closes on Escape (returning focus to the trigger), on outside pointer-down and when focus leaves.
 */
import { useEffect, useEffectEvent, type RefObject } from "react";

export function usePopover(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const first = panel.querySelector<HTMLElement>(
      "[data-autofocus], input:not([disabled]), button:not([disabled]), a[href]",
    );
    (first ?? panel).focus();

    function inside(target: EventTarget | null) {
      return target instanceof Node && (panel?.contains(target) || triggerRef.current?.contains(target));
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close();
      triggerRef.current?.focus();
    }
    function onPointer(e: PointerEvent) {
      if (!inside(e.target)) close();
    }
    function onFocusOut(e: FocusEvent) {
      if (e.relatedTarget && !inside(e.relatedTarget)) close();
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    panel.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      panel.removeEventListener("focusout", onFocusOut);
    };
  }, [open, panelRef, triggerRef]);
}

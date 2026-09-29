"use client";
/**
 * Modal focus management: moves focus into `ref` while active, traps Tab/Shift+Tab,
 * calls onEscape on Escape, locks body scroll and returns focus to the previously focused
 * element on close. An element with [data-autofocus] inside the container receives initial focus.
 *
 * Traps stack: when a dialog opens over another (a proposal review over a place sheet), only the
 * top trap handles keys, and the one below keeps its opener instead of being torn down. When the
 * top trap closes and its opener is gone (e.g. "Añadir" became "En tu viaje"), focus falls back
 * to the trap below, or to #main when there is none.
 */
import { useEffect, useEffectEvent, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface TrapEntry {
  node: HTMLElement;
}

const stack: TrapEntry[] = [];

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  const escape = useEffectEvent(() => onEscape?.());

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    const entry: TrapEntry = { node };
    stack.push(entry);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);

    (node.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0] ?? node).focus();

    function onKey(e: KeyboardEvent) {
      if (stack[stack.length - 1] !== entry) return;
      if (e.key === "Escape") {
        e.preventDefault();
        escape();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || !node.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !node.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      const index = stack.indexOf(entry);
      if (index >= 0) stack.splice(index, 1);
      const below = stack[stack.length - 1];
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
      else if (below && document.contains(below.node)) below.node.focus({ preventScroll: true });
      else document.getElementById("main")?.focus({ preventScroll: true });
    };
  }, [active, ref]);
}

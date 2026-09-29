"use client";
/** Reactive matchMedia. Returns false on the server and during hydration (mobile-first). */
import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Breakpoint where trip and map screens switch to side-by-side layouts (Tailwind `lg`). */
export const DESKTOP_QUERY = "(min-width: 1024px)";

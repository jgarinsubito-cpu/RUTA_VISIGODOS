"use client";
/**
 * Marks <body data-sheet> while a full-screen place sheet is open so fixed overlays (the notice
 * toast) can move above the sheet's Guardar / Añadir bar instead of covering it.
 */
import { useEffect } from "react";

let open = 0;

export function useSheetFlag() {
  useEffect(() => {
    open += 1;
    document.body.dataset.sheet = "open";
    return () => {
      open -= 1;
      if (open === 0) delete document.body.dataset.sheet;
    };
  }, []);
}

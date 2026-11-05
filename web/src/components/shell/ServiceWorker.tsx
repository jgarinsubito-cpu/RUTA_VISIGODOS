"use client";
/**
 * Registers the service worker (public/sw.js) that keeps the app and downloaded tours working
 * without coverage. Production only: in development it would serve stale pages.
 */
import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Without a service worker the app works online as before.
    });
  }, []);
  return null;
}

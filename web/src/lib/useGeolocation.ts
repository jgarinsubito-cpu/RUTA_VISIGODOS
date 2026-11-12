"use client";
/**
 * Watches the device position while `enabled` (only after the visitor asks for it). The position
 * stays in memory on this device: it is never stored or sent anywhere.
 */
import { useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";
import type { GeoFix } from "@/domain/geo";

export type GeoStatus = "off" | "locating" | "on" | "denied" | "unavailable";

const noSubscribe = () => () => {};

/**
 * `onFix` (optional) is called with each new position, from the browser's callback: for state that
 * reacts to movement (an arrival), without an effect that sets state on every fix.
 */
export function useGeolocation(enabled: boolean, onFix?: (fix: GeoFix) => void): { fix: GeoFix | null; status: GeoStatus } {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [error, setError] = useState<"denied" | "unavailable" | null>(null);
  const supported = useSyncExternalStore(
    noSubscribe,
    () => "geolocation" in navigator,
    () => true,
  );

  const notify = useEffectEvent((f: GeoFix) => onFix?.(f));

  useEffect(() => {
    if (!enabled || !supported) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setError(null);
        const next = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        setFix(next);
        notify(next);
      },
      (err) => setError(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled, supported]);

  const status: GeoStatus = !enabled ? "off" : !supported ? "unavailable" : (error ?? (fix ? "on" : "locating"));
  return { fix: enabled && !error ? fix : null, status };
}

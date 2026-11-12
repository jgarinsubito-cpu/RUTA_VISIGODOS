"use client";
/**
 * Watches the position for proximity alerts while the visitor has them on and the app is open
 * (domain/nearby.ts has the rules). Mounted once in AppShell. The position stays in memory on
 * this device: only the place that is close is kept, never where the visitor was.
 *
 * Paused on guided-tour screens: the tour detects arrival at its own stops.
 */
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { getSite, sites } from "@/data/content";
import { nextNearbyAlert, stillNear } from "@/domain/nearby";
import { useGeolocation } from "@/lib/useGeolocation";
import { actions, getAppState, useAppState } from "@/state/store";

export function isTourScreen(pathname: string): boolean {
  return /\/(recorrido|visita|coche)$/.test(pathname);
}

export function NearbyWatcher() {
  const pathname = usePathname();
  const enabled = useAppState((s) => s.nearby.enabled);
  const live = useAppState((s) => s.nearbyLive);
  const watching = enabled && live && !isTourScreen(pathname);
  const { fix, status } = useGeolocation(watching);
  const lastAlertAt = useRef<number | null>(null);

  // Alerts turned on in an earlier visit resume only if the browser already allows location:
  // the app never opens with a permission prompt the visitor did not ask for.
  useEffect(() => {
    if (!enabled || live || !navigator.permissions?.query) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((p) => {
        if (!cancelled && p.state === "granted") actions.resumeNearby();
      })
      .catch(() => {
        // Without the Permissions API the visitor resumes them from the control.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, live]);

  useEffect(() => {
    actions.setNearbyStatus(enabled && live ? status : "off");
  }, [enabled, live, status]);

  useEffect(() => {
    if (!fix) return;
    const s = getAppState();
    if (s.nearbyAlert) {
      const site = getSite(s.nearbyAlert.siteId);
      if (site && stillNear(site, fix)) return;
      actions.dismissNearbyAlert();
    }
    // Places the visitor is already looking at or touring need no alert.
    const exclude = new Set([s.selectedSiteId, s.tour?.tourId].filter((id): id is string => Boolean(id)));
    const now = Date.now();
    const alert = nextNearbyAlert(sites(), fix, s.nearby, now, lastAlertAt.current, exclude);
    if (alert) {
      lastAlertAt.current = now;
      actions.showNearbyAlert(alert);
    }
  }, [fix]);

  return null;
}

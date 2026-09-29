"use client";
/**
 * Leaflet map (client-only; import `MapView` from "@/components/map", which wraps this with
 * next/dynamic ssr:false). Markers are divIcons (no image assets): numbered for trip stops,
 * square for non-Visigothic heritage, enlarged + ringed when selected. Trip order is a polyline.
 * Markers are keyboard-focusable buttons with titles; pages provide the accessible lists.
 *
 * TILES: the public OpenStreetMap tile server is used for the demo only. Its usage policy forbids
 * heavy production use: a tile provider must be chosen and licensed before production (PLAN.md,
 * "Keep mapping display … behind provider interfaces").
 */
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getSite } from "@/data/catalog";
import type { MapViewProps } from "./types";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const DEFAULT_CENTER: L.LatLngExpression = [39.84, -4.07];

function markerIcon(opts: { number?: number; visigothic: boolean; selected: boolean }) {
  const base = opts.number !== undefined ? 32 : 24;
  const size = opts.selected ? base + 8 : base;
  const shape = opts.visigothic ? "rounded-full" : "rounded-md";
  const ring = opts.selected ? "ring-4 ring-gold/60" : "";
  const html =
    opts.number !== undefined
      ? `<span class="grid h-full w-full place-items-center border-2 border-surface bg-olive text-sm font-semibold text-on-olive shadow-md ${shape} ${ring}">${opts.number}</span>`
      : `<span class="grid h-full w-full place-items-center border-2 bg-surface shadow-md ${shape} ${ring} ${
          opts.visigothic ? "border-olive" : "border-dashed border-ink-muted"
        }"><span class="h-2 w-2 ${shape} ${opts.visigothic ? "bg-olive" : "bg-ink-muted"}"></span></span>`;
  return L.divIcon({
    html,
    className: "rv-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface MarkerEntry {
  marker: L.Marker;
  name: string;
  number?: number;
  visigothic: boolean;
  approximate: boolean;
}

function markerTitle(entry: MarkerEntry, selected: boolean): string {
  return [
    entry.number !== undefined ? `Parada ${entry.number}: ${entry.name}` : entry.name,
    entry.visigothic ? "" : "patrimonio no visigodo",
    entry.approximate ? "ubicación aproximada" : "",
    selected ? "seleccionado" : "",
  ]
    .filter(Boolean)
    .join(", ");
}

/** Update one marker in place (setIcon reuses the divIcon element, so keyboard focus survives). */
function applySelection(entry: MarkerEntry, selected: boolean) {
  const { marker } = entry;
  marker.setIcon(markerIcon({ number: entry.number, visigothic: entry.visigothic, selected }));
  marker.setZIndexOffset(selected ? 1000 : entry.number !== undefined ? 500 : 0);
  const el = marker.getElement();
  if (!el) return;
  const title = markerTitle(entry, selected);
  el.setAttribute("title", title);
  el.setAttribute("aria-label", title);
  if (selected) el.setAttribute("aria-current", "true");
  else el.removeAttribute("aria-current");
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MapView({ siteIds, tripSiteIds = [], selectedSiteId = null, onSelect, className = "" }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const fitKeyRef = useRef<string>("");
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selectedSiteId);
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
    selectedRef.current = selectedSiteId;
  });

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const animate = !prefersReducedMotion();
    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      scrollWheelZoom: false,
      zoomAnimation: animate,
      fadeAnimation: animate,
      markerZoomAnimation: animate,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    fitKeyRef.current = "";
    const markers = markersRef.current;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markers.clear();
    };
  }, []);

  const siteKey = siteIds.join(",");
  const tripKey = tripSiteIds.join(",");

  // Rebuild markers and the trip line only when the set of sites or the trip order changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    const focusedId = Array.from(markersRef.current.entries()).find(
      ([, entry]) => entry.marker.getElement() === document.activeElement,
    )?.[0];
    layer.clearLayers();
    markersRef.current.clear();

    const trip = tripKey ? tripKey.split(",") : [];
    const ids = Array.from(new Set([...(siteKey ? siteKey.split(",") : []), ...trip]));
    const points: L.LatLng[] = [];
    const selectedId = selectedRef.current;

    for (const id of ids) {
      const site = getSite(id);
      if (!site) continue;
      const pos = L.latLng(site.coordinates.lat, site.coordinates.lng);
      points.push(pos);
      const index = trip.indexOf(id);
      const number = index >= 0 ? index + 1 : undefined;
      const entry: MarkerEntry = {
        // Built with its divIcon so Leaflet never requests its default image icon.
        marker: L.marker(pos, {
          icon: markerIcon({ number, visigothic: site.visigothic, selected: id === selectedId }),
          keyboard: true,
          riseOnHover: true,
        }),
        name: site.name,
        number,
        visigothic: site.visigothic,
        approximate: site.coordinates.approximate,
      };
      entry.marker.on("click", () => onSelectRef.current?.(id));
      // Leaflet makes keyboard markers focusable buttons but does not activate them: Enter/Space select.
      entry.marker.on("keypress", (e: L.LeafletEvent) => {
        const key = ((e as L.LeafletKeyboardEvent).originalEvent as KeyboardEvent).key;
        if (key !== "Enter" && key !== " ") return;
        (e as L.LeafletKeyboardEvent).originalEvent.preventDefault();
        onSelectRef.current?.(id);
      });
      entry.marker.addTo(layer);
      applySelection(entry, id === selectedId);
      markersRef.current.set(id, entry);
    }
    appliedRef.current = selectedId ?? null;
    if (focusedId) markersRef.current.get(focusedId)?.marker.getElement()?.focus({ preventScroll: true });

    const tripPoints = trip
      .map((id) => getSite(id))
      .filter((s) => s !== undefined)
      .map((s) => L.latLng(s.coordinates.lat, s.coordinates.lng));
    if (tripPoints.length > 1) {
      L.polyline(tripPoints, { className: "stroke-olive", weight: 3, opacity: 0.8, dashArray: "6 6", interactive: false }).addTo(layer);
    }

    const fitKey = ids.join(",");
    if (fitKey !== fitKeyRef.current && points.length > 0) {
      fitKeyRef.current = fitKey;
      const animate = !prefersReducedMotion();
      if (points.length === 1) map.setView(points[0], 15, { animate });
      else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15, animate });
    }
  }, [siteKey, tripKey]);

  // Selection changes restyle only the affected markers, then bring the selected site into view.
  useEffect(() => {
    const markers = markersRef.current;
    const previous = appliedRef.current;
    if (previous !== selectedSiteId) {
      const before = previous ? markers.get(previous) : undefined;
      if (before) applySelection(before, false);
      const after = selectedSiteId ? markers.get(selectedSiteId) : undefined;
      if (after) applySelection(after, true);
      appliedRef.current = selectedSiteId;
    }
    const map = mapRef.current;
    const site = selectedSiteId ? getSite(selectedSiteId) : undefined;
    if (!map || !site) return;
    const pos = L.latLng(site.coordinates.lat, site.coordinates.lng);
    if (!map.getBounds().contains(pos)) map.panTo(pos, { animate: !prefersReducedMotion() });
  }, [selectedSiteId, siteKey, tripKey]);

  return (
    <div role="region" aria-label="Mapa de lugares" className={`relative isolate min-h-64 overflow-hidden rounded-2xl border border-stone ${className}`}>
      <div ref={containerRef} className="h-full min-h-64 w-full bg-surface-muted" />
      <p className="pointer-events-none absolute right-2 top-2 z-[1000] rounded-md bg-surface/90 px-2 py-1 text-[11px] font-medium text-ink-muted shadow-sm">
        Ubicaciones aproximadas · Demo
      </p>
    </div>
  );
}

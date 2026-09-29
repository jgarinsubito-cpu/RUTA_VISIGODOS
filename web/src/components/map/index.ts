"use client";
/** Client-only map entry point: Leaflet touches `window`, so it is never server-rendered. */
import dynamic from "next/dynamic";
import { createElement } from "react";
import { MapLoading } from "./MapLoading";
import type { MapViewProps } from "./types";

export type { MapViewProps } from "./types";

export const MapView = dynamic<MapViewProps>(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => createElement(MapLoading, { className: "h-full w-full" }),
});

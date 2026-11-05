import type { MetadataRoute } from "next";

/** Installable app (PWA): name, icons and colours of the home-screen app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ruta Visigoda de Toledo",
    short_name: "Ruta Visigoda",
    description: "Recorridos guiados, mapa y asistente de la ruta visigoda de Toledo y su territorio.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Mirror --ivory (background) and the icon's dark tone; metadata cannot read CSS variables.
    background_color: "#f3f2ee",
    theme_color: "#2a2418",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

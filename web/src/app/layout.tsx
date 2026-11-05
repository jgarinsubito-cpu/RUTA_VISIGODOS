import type { Metadata, Viewport } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import { CatalogProvider } from "@/components/shell/CatalogProvider";
import { ServiceWorker } from "@/components/shell/ServiceWorker";
import { currentCatalog } from "@/data/content";
import { loadPublishedCatalog } from "@/data/published";
import "./globals.css";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Ruta Visigoda de Toledo", template: "%s · Ruta Visigoda" },
  description: "Descubre la ruta visigoda de Toledo y Guadamur, planifica un viaje viable y pregunta al asistente con fuentes.",
  appleWebApp: { capable: true, title: "Ruta Visigoda", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  // Browser chrome colour: metadata cannot read CSS variables, so these mirror --ivory (light/dark).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f2ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The published catalog (or the bundled demo) for this render, handed to the browser as data.
  const { version } = await loadPublishedCatalog();
  return (
    <html lang="es" className={`${montserrat.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full">
        <CatalogProvider catalog={version === null ? null : currentCatalog()} version={version}>
          <AppShell>{children}</AppShell>
        </CatalogProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}

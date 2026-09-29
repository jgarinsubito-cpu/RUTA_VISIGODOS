import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Mapa",
  description: "Mapa de los lugares de la ruta visigoda de Toledo y Guadamur.",
};

export default function MapaLayout({ children }: { children: ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Mi viaje",
  description: "Tu itinerario por la ruta visigoda de Toledo y Guadamur, guardado en este dispositivo.",
};

export default function MiViajeLayout({ children }: { children: ReactNode }) {
  return children;
}

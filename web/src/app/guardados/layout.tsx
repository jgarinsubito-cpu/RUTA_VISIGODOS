import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Guardados",
  description: "Lugares que has guardado como ideas para tu visita, en este dispositivo.",
};

export default function GuardadosLayout({ children }: { children: ReactNode }) {
  return children;
}

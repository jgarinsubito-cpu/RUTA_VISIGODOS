import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tu cuenta",
  description: "Cuenta opcional para guardar tus preferencias de visita y de accesibilidad.",
};

export default function CuentaLayout({ children }: { children: ReactNode }) {
  return children;
}

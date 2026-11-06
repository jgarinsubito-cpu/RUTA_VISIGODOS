import type { Metadata } from "next";
import { ServiceDirectory } from "@/components/services/ServiceDirectory";

export const metadata: Metadata = {
  title: "Servicios",
  description: "Dónde comer, dormir, alquilar un coche, visitas guiadas y otros servicios en la ruta visigoda de Toledo.",
};

export default function ServiciosPage() {
  return <ServiceDirectory />;
}

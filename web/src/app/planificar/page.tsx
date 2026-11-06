import type { Metadata } from "next";
import { ThematicPlanner } from "@/components/planner/ThematicPlanner";

export const metadata: Metadata = {
  title: "Organiza tu recorrido",
  description: "Un recorrido a medida por la Toledo visigoda: elige temas, días y ritmo, y añade dónde comer, dormir y alquilar un coche.",
};

export default function PlanificarPage() {
  return <ThematicPlanner />;
}

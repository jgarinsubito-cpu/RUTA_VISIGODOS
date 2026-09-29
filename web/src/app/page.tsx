import type { Metadata } from "next";
import { ExploreHome } from "@/components/explore/ExploreHome";

export const metadata: Metadata = {
  title: { absolute: "Explorar · Ruta Visigoda de Toledo" },
};

export default function Home() {
  return <ExploreHome />;
}

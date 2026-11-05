import type { Metadata } from "next";
import { ExploreHome } from "@/components/explore/ExploreHome";
import { LegalLinks } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: { absolute: "Explorar · Ruta Visigoda de Toledo" },
};

export default function Home() {
  return (
    <>
      <ExploreHome />
      {/* On phones the rail is hidden: the legal pages are reached from here. */}
      <footer className="border-t border-stone px-4 pb-4 pt-2 md:hidden">
        <nav aria-label="Información legal">
          <LegalLinks />
        </nav>
      </footer>
    </>
  );
}

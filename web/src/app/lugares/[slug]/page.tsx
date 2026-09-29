import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteBySlug, SITES } from "@/data/catalog";
import { IconChevronLeft } from "@/components/shell/icons";
import { PlacePanel } from "@/components/place/PlacePanel";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SITES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = getSiteBySlug(slug);
  if (!site) return { title: "Lugar no encontrado" };
  return { title: site.name, description: site.tagline };
}

export default async function PlacePage({ params }: Props) {
  const { slug } = await params;
  const site = getSiteBySlug(slug);
  if (!site) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <nav aria-label="Volver" className="px-4 pt-3 md:px-8 md:pt-6">
        <Link
          href="/#lugares"
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-ink-muted hover:text-ink"
        >
          <IconChevronLeft width={18} height={18} />
          Volver a Explorar
        </Link>
      </nav>
      <PlacePanel variant="page" siteId={site.id} />
    </div>
  );
}

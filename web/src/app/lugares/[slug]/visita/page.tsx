import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteBySlug, sites, visitStopsForSite } from "@/data/content";
import { loadPublishedCatalog } from "@/data/published";
import { GuidedTour } from "@/components/tour/GuidedTour";

type Props = { params: Promise<{ slug: string }> };

/** Guided visit of the stops inside one place (a dig, a museum). */
export async function generateStaticParams() {
  await loadPublishedCatalog();
  return sites()
    .filter((s) => visitStopsForSite(s.id).length > 1)
    .map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await loadPublishedCatalog();
  const site = getSiteBySlug(slug);
  if (!site) return { title: "Lugar no encontrado" };
  return { title: `Visita guiada · ${site.name}`, description: site.tagline };
}

export default async function GuidedVisitPage({ params }: Props) {
  const { slug } = await params;
  await loadPublishedCatalog();
  const site = getSiteBySlug(slug);
  if (!site || visitStopsForSite(site.id).length < 2) notFound();
  return <GuidedTour source={{ kind: "site", id: site.id }} />;
}

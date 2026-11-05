import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRouteBySlug, routes } from "@/data/content";
import { loadPublishedCatalog } from "@/data/published";
import { GuidedTour } from "@/components/tour/GuidedTour";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  await loadPublishedCatalog();
  return routes().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await loadPublishedCatalog();
  const route = getRouteBySlug(slug);
  if (!route) return { title: "Ruta no encontrada" };
  return { title: `Recorrido guiado · ${route.name}`, description: route.summary };
}

export default async function GuidedTourPage({ params }: Props) {
  const { slug } = await params;
  await loadPublishedCatalog();
  const route = getRouteBySlug(slug);
  if (!route) notFound();
  return <GuidedTour source={{ kind: "route", id: route.id }} />;
}

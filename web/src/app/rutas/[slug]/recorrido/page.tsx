import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRouteBySlug, ROUTES } from "@/data/content";
import { GuidedTour } from "@/components/tour/GuidedTour";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ROUTES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = getRouteBySlug(slug);
  if (!route) return { title: "Ruta no encontrada" };
  return { title: `Recorrido guiado · ${route.name}`, description: route.summary };
}

export default async function GuidedTourPage({ params }: Props) {
  const { slug } = await params;
  const route = getRouteBySlug(slug);
  if (!route) notFound();
  return <GuidedTour routeId={route.id} />;
}

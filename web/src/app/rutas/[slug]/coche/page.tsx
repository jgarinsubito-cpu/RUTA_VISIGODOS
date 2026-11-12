import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRouteBySlug, routes } from "@/data/content";
import { loadPublishedCatalog } from "@/data/published";
import { DriveMode } from "@/components/drive/DriveMode";

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
  return { title: `Modo coche · ${route.name}`, description: `Los audios de «${route.name}» para escuchar en el coche.` };
}

export default async function DriveModePage({ params }: Props) {
  const { slug } = await params;
  await loadPublishedCatalog();
  const route = getRouteBySlug(slug);
  if (!route) notFound();
  return <DriveMode routeId={route.id} />;
}

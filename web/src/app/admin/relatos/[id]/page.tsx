import type { Metadata } from "next";
import { RecordEditor } from "@/components/admin/RecordEditor";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ lugar?: string | string[] }> };

export const metadata: Metadata = { title: "Relatos" };

export default async function AdminRelatosEditPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { lugar } = await searchParams;
  return <RecordEditor kind="story" id={id} prefillSiteId={typeof lugar === "string" ? lugar : undefined} />;
}

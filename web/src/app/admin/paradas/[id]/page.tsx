import type { Metadata } from "next";
import { RecordEditor } from "@/components/admin/RecordEditor";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ lugar?: string | string[] }> };

export const metadata: Metadata = { title: "Paradas" };

export default async function AdminParadasEditPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { lugar } = await searchParams;
  return <RecordEditor kind="stop" id={id} prefillSiteId={typeof lugar === "string" ? lugar : undefined} />;
}

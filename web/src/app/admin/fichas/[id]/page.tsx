import type { Metadata } from "next";
import { RecordEditor } from "@/components/admin/RecordEditor";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ lugar?: string | string[] }> };

export const metadata: Metadata = { title: "Fichas" };

export default async function AdminFichasEditPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { lugar } = await searchParams;
  return <RecordEditor kind="claim" id={id} prefillSiteId={typeof lugar === "string" ? lugar : undefined} />;
}

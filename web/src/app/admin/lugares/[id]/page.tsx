import type { Metadata } from "next";
import { RecordEditor } from "@/components/admin/RecordEditor";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Lugares" };

export default async function AdminLugaresEditPage({ params }: Props) {
  const { id } = await params;
  return <RecordEditor kind="site" id={id} />;
}

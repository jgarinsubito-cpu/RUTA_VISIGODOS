import type { Metadata } from "next";
import { RecordList } from "@/components/admin/RecordList";

export const metadata: Metadata = { title: "Paradas" };

export default function AdminParadasPage() {
  return <RecordList kind="stop" />;
}

import type { Metadata } from "next";
import { RecordList } from "@/components/admin/RecordList";

export const metadata: Metadata = { title: "Rutas" };

export default function AdminRutasPage() {
  return <RecordList kind="route" />;
}

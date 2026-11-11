import type { Metadata } from "next";
import { RecordList } from "@/components/admin/RecordList";

export const metadata: Metadata = { title: "Piezas de museo" };

export default function AdminPiezasPage() {
  return <RecordList kind="piece" />;
}

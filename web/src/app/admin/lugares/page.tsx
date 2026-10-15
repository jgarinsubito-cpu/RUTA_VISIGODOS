import type { Metadata } from "next";
import { RecordList } from "@/components/admin/RecordList";

export const metadata: Metadata = { title: "Lugares" };

export default function AdminLugaresPage() {
  return <RecordList kind="site" />;
}

import type { Metadata } from "next";
import { RecordList } from "@/components/admin/RecordList";

export const metadata: Metadata = { title: "Relatos" };

export default function AdminRelatosPage() {
  return <RecordList kind="story" />;
}

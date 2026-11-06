import type { Metadata } from "next";
import { RecordList } from "@/components/admin/RecordList";

export const metadata: Metadata = { title: "Servicios" };

export default function AdminServiciosPage() {
  return <RecordList kind="service" />;
}

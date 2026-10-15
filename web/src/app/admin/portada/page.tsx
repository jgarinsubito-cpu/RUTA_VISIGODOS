import type { Metadata } from "next";
import { RecordEditor } from "@/components/admin/RecordEditor";

export const metadata: Metadata = { title: "Portada y asistente" };

export default function AdminShowcasePage() {
  return <RecordEditor kind="showcase" id="showcase" />;
}

import type { Metadata } from "next";
import { AssistantPreview } from "@/components/admin/AssistantPreview";

export const metadata: Metadata = { title: "Probar el asistente" };

export default function AdminPreviewPage() {
  return <AssistantPreview />;
}

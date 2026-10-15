import type { Metadata } from "next";
import { PublishPanel } from "@/components/admin/PublishPanel";

export const metadata: Metadata = { title: "Publicar" };

export default function AdminPublishPage() {
  return <PublishPanel />;
}

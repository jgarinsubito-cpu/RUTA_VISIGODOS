import type { Metadata } from "next";
import { RecordList } from "@/components/admin/RecordList";

export const metadata: Metadata = { title: "Fichas" };

export default function AdminFichasPage() {
  return <RecordList kind="claim" />;
}

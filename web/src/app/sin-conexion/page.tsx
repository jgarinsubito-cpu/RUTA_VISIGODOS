import type { Metadata } from "next";
import { OfflineHome } from "@/components/tour/OfflineHome";

export const metadata: Metadata = { title: "Sin conexión" };

/** Shown by the service worker when a page is not available offline. */
export default function OfflinePage() {
  return <OfflineHome />;
}

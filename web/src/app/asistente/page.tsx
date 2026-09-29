import type { Metadata } from "next";
import { Suspense } from "react";
import { AssistantWorkspace, WorkspaceFallback } from "@/components/chat/AssistantWorkspace";

export const metadata: Metadata = { title: "Asistente" };

/** useSearchParams (?site=, ?q=) in the workspace requires a Suspense boundary. */
export default function AsistentePage() {
  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <AssistantWorkspace />
    </Suspense>
  );
}

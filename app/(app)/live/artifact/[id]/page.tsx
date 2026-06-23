// /live/artifact/[id] — Phase-4 Slice 2: the polished graph lens + inspector
// drawer over a REAL artifact's lineage. Server component just unwraps the id;
// the client fetches through the always-live seam getters (relative fetch needs
// the browser). See components/live/live-artifact-client.tsx + lib/api/MAPPING.md.

import { LiveArtifactClient } from "@/components/live/live-artifact-client";

export default async function LiveArtifactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;
  // ?view= deep-links a tab (so the list page can open straight to Data/Distributions).
  const initialView =
    view === "data" || view === "dist" || view === "graph" || view === "plot" ? view : undefined;
  // The dynamic segment arrives URL-encoded (ids contain `:`); decode once so the
  // always-live getters re-encode it exactly once for the route handler.
  return <LiveArtifactClient id={decodeURIComponent(id)} initialView={initialView} />;
}

// GET /api/catalog/artifacts/{id}/eda  → LiveEdaSummary | 404
// Per-column stats + histograms over the FULL table (pre-computed sidecar on
// research-workbench :8105). 404 when the artifact was never summarized.
import { getArtifactEda } from "@/lib/api/data-inspect";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const eda = await getArtifactEda(id);
  if (!eda) return new Response("no eda summary", { status: 404 });
  return Response.json(eda);
}

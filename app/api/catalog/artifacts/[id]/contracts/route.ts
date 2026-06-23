// GET /api/catalog/artifacts/{id}/contracts  → SeriesContract[]
// The tradeable contracts in an OHLCV artifact (canonical_id × symbol), for the
// Plot tab's series picker. One grouped query against research-workbench (:8105).
import { getArtifactContracts } from "@/lib/api/data-inspect";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return Response.json(await getArtifactContracts(id));
}

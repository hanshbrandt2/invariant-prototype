// GET /api/catalog/artifacts/{id}/lineage  → LineageSubgraph (root + 1-hop parents)
import { acGet, encId } from "@/lib/api/http";
import {
  artifactToNode,
  lineageHopToSubgraph,
  type ArtifactRead,
  type LineageWalkResult,
} from "@/lib/api/map";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const a = await acGet<ArtifactRead | undefined>(`/artifacts/${encId(id)}`);
  if (!a) return new Response("not found", { status: 404 });
  const walk = await acGet<LineageWalkResult>(
    `/artifacts/${encId(id)}/lineage?direction=parents`,
  );
  return Response.json(lineageHopToSubgraph(artifactToNode(a), walk));
}

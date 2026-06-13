// GET /api/catalog/artifacts/{id}  → Node | 404   (one live artifact)
import { acGet, encId } from "@/lib/api/http";
import { artifactToNode, type ArtifactRead } from "@/lib/api/map";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const a = await acGet<ArtifactRead | undefined>(`/artifacts/${encId(id)}`);
  if (!a) return new Response("not found", { status: 404 });
  return Response.json(artifactToNode(a));
}

// GET /api/catalog/artifacts?kind=&limit=  → Node[]  (live artifact-catalog list)
import { acGet } from "@/lib/api/http";
import { artifactToNode, type ArtifactRead } from "@/lib/api/map";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const limit = url.searchParams.get("limit") ?? "500";
  const q = new URLSearchParams({ limit });
  if (kind) q.set("kind", kind);
  const arts = (await acGet<ArtifactRead[]>(`/artifacts?${q}`)) ?? [];
  return Response.json(arts.map(artifactToNode));
}

// GET /api/catalog/artifacts/{id}/preview?limit=  → LiveArtifactPreview | 404
// REAL rows (first ≤limit, a labeled sample) from research-workbench (:8105).
import { getArtifactPreview } from "@/lib/api/data-inspect";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? "500");
  const preview = await getArtifactPreview(id, Number.isFinite(limit) ? limit : 500);
  if (!preview) return new Response("no preview", { status: 404 });
  return Response.json(preview);
}

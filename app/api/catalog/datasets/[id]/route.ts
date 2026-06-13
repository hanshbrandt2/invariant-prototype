// GET /api/catalog/datasets/{id} → HostedDataset | 404
import { buildHostedDataset } from "@/lib/api/datasets";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const d = await buildHostedDataset(decodeURIComponent(id));
  if (!d) return new Response("not found", { status: 404 });
  return Response.json(d);
}

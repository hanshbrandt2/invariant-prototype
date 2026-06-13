// GET /api/catalog/datasets → HostedDataset[]  (live data-catalog hosted indexes)
import { listHostedDatasets } from "@/lib/api/datasets";

export async function GET() {
  return Response.json(await listHostedDatasets());
}

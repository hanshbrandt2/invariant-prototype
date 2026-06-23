// GET /api/catalog/artifacts/{id}/series?contract=&from=&to=&grain=  → ArtifactSeries
// A real OHLCV time series for one contract over [from, to] from :8105 (DuckDB).
import { getArtifactSeries } from "@/lib/api/data-inspect";
import type { SeriesGrain } from "@/lib/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const q = new URL(req.url).searchParams;
  const contract = q.get("contract");
  const from = q.get("from");
  const to = q.get("to");
  const grain: SeriesGrain = q.get("grain") === "daily" ? "daily" : "minute";
  if (!contract || !from || !to) {
    return new Response("contract, from, to required", { status: 400 });
  }
  return Response.json(await getArtifactSeries(id, { contract, from, to, grain }));
}

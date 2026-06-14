// GET /api/dsl/dags → DagListItem[]  (the platform's real producing pipelines)
//
// Lists the DAG registry (catalog/dags/*.yaml) from rwb GET /api/dsl/dags. An
// artifact's `dag_id` points at one of these; the receipt/assemble routes fetch
// a chosen DAG's spec and package it. See lib/api/receipt.ts.
import { rwbGet, ApiError } from "@/lib/api/http";
import { dagSummaryToItem, type DagSummaryRead } from "@/lib/api/receipt";

export async function GET() {
  try {
    const rows = (await rwbGet<DagSummaryRead[]>("/api/dsl/dags")) ?? [];
    return Response.json(rows.map(dagSummaryToItem));
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 502;
    const detail = e instanceof ApiError ? e.body || e.message : String(e);
    return Response.json({ error: "rwb /api/dsl/dags", detail }, { status });
  }
}

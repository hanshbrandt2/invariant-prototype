// GET /api/dsl/assemble?dag=<id> → AssembledCode | { error }  (live rwb codegen)
//
// Renders a REAL producing DAG (rwb GET /api/dsl/dags/{id}) into one runnable
// standalone script via rwb POST /api/dsl/assemble (dsl-engine assemble_dag) —
// the Code lens. The page only fetches this for a DAG whose receipt succeeded,
// so the happy path returns AssembledCode; any error returns { error } with the
// engine status. See lib/api/receipt.ts.
import { rwbGet, rwbPost, ApiError } from "@/lib/api/http";
import {
  assembleResponseToAssembled,
  parseDetail,
  DEFAULT_DAG_ID,
  type DagAssembleResponse,
  type DagSpecRead,
} from "@/lib/api/receipt";

export async function GET(req: Request) {
  const dag = new URL(req.url).searchParams.get("dag") || DEFAULT_DAG_ID;
  try {
    const ds = await rwbGet<DagSpecRead>(`/api/dsl/dags/${encodeURIComponent(dag)}`);
    if (!ds) return Response.json({ error: `no DAG '${dag}'` }, { status: 404 });
    const r = await rwbPost<DagAssembleResponse>("/api/dsl/assemble", { spec: ds.spec });
    return Response.json(assembleResponseToAssembled(r));
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 502;
    const detail = e instanceof ApiError ? parseDetail(e.body) : String(e);
    return Response.json({ error: "rwb /api/dsl/assemble", detail }, { status });
  }
}

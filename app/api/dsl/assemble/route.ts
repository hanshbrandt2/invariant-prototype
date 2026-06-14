// GET /api/dsl/assemble → AssembledCode  (live research-workbench DSL codegen)
//
// Renders the labelled DEMO_DAG into one runnable standalone script via rwb POST
// /api/dsl/assemble (dsl-engine `assemble_dag`) — the Code lens. See the receipt
// route + lib/api/receipt.ts for why the input DAG is a labelled placeholder.
import { rwbPost, ApiError } from "@/lib/api/http";
import {
  assembleResponseToAssembled,
  DEMO_DAG,
  type DagAssembleResponse,
} from "@/lib/api/receipt";

export async function GET() {
  try {
    const r = await rwbPost<DagAssembleResponse>("/api/dsl/assemble", {
      spec: DEMO_DAG,
    });
    return Response.json(assembleResponseToAssembled(r));
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 502;
    const detail = e instanceof ApiError ? e.body || e.message : String(e);
    return Response.json({ error: "rwb /api/dsl/assemble", detail }, { status });
  }
}

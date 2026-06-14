// GET /api/dsl/receipt?dag=<id> → ReceiptResult  (live rwb DSL codegen)
//
// Fetches a REAL producing DAG's spec (rwb GET /api/dsl/dags/{id}) and packages
// it into the ADR-0002 receipt (rwb POST /api/dsl/receipt → dsl-engine
// build_receipt). A DAG whose operators aren't yet emittable returns a clean
// 422, surfaced as { ok:false } (honest coverage), never a thrown 500. The route
// always returns 200 with the discriminated ReceiptResult. See lib/api/receipt.ts.
import { rwbGet, rwbPost, ApiError } from "@/lib/api/http";
import {
  receiptResponseToReceipt,
  parseDetail,
  DEFAULT_DAG_ID,
  type DagReceiptResponse,
  type DagSpecRead,
} from "@/lib/api/receipt";
import type { ReceiptResult } from "@/lib/types";

export async function GET(req: Request) {
  const dag = new URL(req.url).searchParams.get("dag") || DEFAULT_DAG_ID;
  try {
    const ds = await rwbGet<DagSpecRead>(`/api/dsl/dags/${encodeURIComponent(dag)}`);
    if (!ds) {
      return Response.json({ ok: false, status: 404, detail: `no DAG '${dag}' in the registry` } satisfies ReceiptResult);
    }
    const r = await rwbPost<DagReceiptResponse>("/api/dsl/receipt", { spec: ds.spec });
    return Response.json({ ok: true, receipt: receiptResponseToReceipt(r) } satisfies ReceiptResult);
  } catch (e) {
    if (e instanceof ApiError) {
      // 422 = a not-yet-emittable operator or an unsupported DAG shape — honest.
      return Response.json({ ok: false, status: e.status, detail: parseDetail(e.body) } satisfies ReceiptResult);
    }
    return Response.json({ ok: false, status: 502, detail: String(e) } satisfies ReceiptResult);
  }
}

// GET /api/dsl/receipt → Receipt  (live research-workbench DSL codegen)
//
// Packages the labelled DEMO_DAG into the real ADR-0002 receipt by POSTing it to
// rwb POST /api/dsl/receipt (dsl-engine `build_receipt`). The DAG is a
// placeholder until the build-stream produces real ones (task #10); the code &
// receipt themselves are real. See lib/api/receipt.ts.
import { rwbPost, ApiError } from "@/lib/api/http";
import {
  receiptResponseToReceipt,
  DEMO_DAG,
  type DagReceiptResponse,
} from "@/lib/api/receipt";

export async function GET() {
  try {
    const r = await rwbPost<DagReceiptResponse>("/api/dsl/receipt", {
      spec: DEMO_DAG,
    });
    return Response.json(receiptResponseToReceipt(r));
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 502;
    const detail = e instanceof ApiError ? e.body || e.message : String(e);
    return Response.json({ error: "rwb /api/dsl/receipt", detail }, { status });
  }
}

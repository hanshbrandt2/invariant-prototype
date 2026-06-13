// GET /api/agent/conversations → LiveConvSummary[]  (live agent-runtime)
import { listLiveConversations } from "@/lib/api/conversations";

export async function GET() {
  return Response.json(await listLiveConversations());
}

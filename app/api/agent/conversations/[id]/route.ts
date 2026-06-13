// GET /api/agent/conversations/{id} → LiveConversation (turns) | 404
import { getLiveConversation } from "@/lib/api/conversations";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const c = await getLiveConversation(decodeURIComponent(id));
  if (!c) return new Response("not found", { status: 404 });
  return Response.json(c);
}

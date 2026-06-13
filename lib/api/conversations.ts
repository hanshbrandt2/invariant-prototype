// lib/api/conversations.ts — agent-runtime → the chat read path (server-only).
//
// MIGRATION step 2 (chat & conversation). Maps agent-runtime conversation
// messages onto the frontend Turn contract (no schema drift: role is always one
// of user|assistant|system, text always a string; tool messages fold to a muted
// system line). Read-only replay — the write/stream path is a later slice.

import { arGet, encId } from "./http";
import type { Turn } from "@/lib/types";

// ── agent-runtime wire shapes ────────────────────────────────────────────────
interface ARConvSummary {
  id: string;
  title: string | null;
  actor: string | null;
  created_at: string;
}
interface ARMessage {
  id: string;
  role: string; // system | user | assistant | tool
  content: string | null;
  model_used: string | null;
  created_at: string;
}
interface ARConvDetail extends ARConvSummary {
  active_agent_id: string | null;
  agent_config: { model?: string; provider?: string } | null;
  messages: ARMessage[];
}

// ── view shapes (local — isolated live surface, not a frontend contract) ──────
export interface LiveConvSummary {
  id: string;
  title: string;
  actor: string;
  createdAt: string;
  messageCount?: number;
}
export interface LiveConversation {
  id: string;
  title: string;
  agent: string;
  model: string | null;
  turns: Turn[];
}

// ── mappers ──────────────────────────────────────────────────────────────────
function toTurns(messages: ARMessage[]): Turn[] {
  return messages
    .filter((m) => m.content && m.content.trim().length > 0)
    .map((m) => ({
      id: m.id,
      role: (m.role === "user" || m.role === "assistant" ? m.role : "system") as Turn["role"],
      text: m.role === "tool" ? `🔧 tool result: ${m.content}` : (m.content as string),
    }));
}

// ── reads ────────────────────────────────────────────────────────────────────
export async function listLiveConversations(): Promise<LiveConvSummary[]> {
  const convs = (await arGet<ARConvSummary[]>(`/conversations`)) ?? [];
  return convs.map((c) => ({
    id: c.id,
    title: c.title || "(untitled)",
    actor: c.actor || "—",
    createdAt: c.created_at,
  }));
}

export async function getLiveConversation(
  id: string,
): Promise<LiveConversation | undefined> {
  const c = await arGet<ARConvDetail | undefined>(`/conversations/${encId(id)}`);
  if (!c) return undefined;
  return {
    id: c.id,
    title: c.title || "(untitled)",
    agent: c.active_agent_id || "—",
    model: c.agent_config?.model ?? null,
    turns: toTurns(c.messages ?? []),
  };
}

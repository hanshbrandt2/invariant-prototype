"use client";

// /live/conversations — Phase-4 Slice 5 (MIGRATION step 2): read-only replay of
// REAL agent-runtime conversations, mapped to the Turn contract (no schema drift).

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LiveConvSummary, LiveConversation } from "@/lib/api/conversations";
import { listLiveConversations, getLiveConversation } from "@/lib/data";

const roleLabel = (r: string) => (r === "user" ? "You" : r === "assistant" ? "Assistant" : "System");

export default function LiveConversationsPage() {
  const [convs, setConvs] = useState<LiveConvSummary[]>([]);
  const [selected, setSelected] = useState<LiveConversation | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listLiveConversations()
      .then((cs) => {
        setConvs(cs);
        if (cs[0]) open(cs[0].id);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function open(id: string) {
    setSelected(null);
    setLoadingDetail(true);
    getLiveConversation(id)
      .then((c) => setSelected(c ?? null))
      .catch(() => setSelected(null))
      .finally(() => setLoadingDetail(false));
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 md:px-8 py-8 md:py-10">
      <div className="flex items-baseline gap-2">
        <Link href="/live" className="text-ui text-faint hover:text-clay">Live catalog</Link>
        <span className="text-faint">/</span>
        <span className="text-ui text-ink">Conversations</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="font-serif text-h1 font-semibold">Live conversations</h1>
        <span className="inline-flex items-center gap-1.5 border border-green/40 bg-green/5 px-2 py-0.5 font-mono text-meta uppercase tracking-[0.12em] text-green">
          <span className="h-1.5 w-1.5 rounded-full bg-green" /> live · agent-runtime
        </span>
        <Link href="/live" className="ml-auto text-ui text-faint hover:text-clay">← Artifacts</Link>
      </div>
      <p className="mt-1.5 text-body text-ink-2">
        Real conversations from <span className="font-mono text-meta">agent-runtime (:8104)</span>, replayed read-only ({convs.length} total). The write / stream path is a later slice.
      </p>

      {loading && <p className="mt-10 text-ui text-muted">Loading conversations…</p>}
      {error && <p className="mt-10 text-ui text-clay">Could not reach agent-runtime: <span className="font-mono text-meta">{error}</span></p>}

      {!loading && !error && (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr]">
          <div>
            <p className="eyebrow mb-3">Conversations [{convs.length}]</p>
            <div className="max-h-[72vh] space-y-1 overflow-y-auto pr-1">
              {convs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => open(c.id)}
                  className={`block w-full border px-3 py-2 text-left transition-colors ${
                    selected?.id === c.id ? "border-clay bg-clay-wash" : "border-hairline hover:border-ink-2"
                  }`}
                >
                  <span className="block truncate text-ui text-ink">{c.title}</span>
                  <span className="font-mono text-micro text-muted">{c.actor} · {c.createdAt.slice(0, 10)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            {loadingDetail && <p className="text-ui text-muted">Loading transcript…</p>}
            {selected && (
              <div>
                <div className="border-b border-hairline pb-3">
                  <h2 className="font-serif text-h2 text-ink">{selected.title}</h2>
                  <p className="mt-0.5 font-mono text-meta text-muted">
                    agent: {selected.agent}{selected.model ? ` · model: ${selected.model}` : ""} · {selected.turns.length} turns
                  </p>
                </div>
                <div className="mt-5 space-y-5">
                  {selected.turns.map((t) => (
                    <div key={t.id}>
                      <p className={`eyebrow mb-1 ${t.role === "assistant" ? "text-clay" : t.role === "user" ? "text-ink" : "text-faint"}`}>
                        {roleLabel(t.role)}
                      </p>
                      <p className={`whitespace-pre-wrap text-body ${t.role === "system" ? "font-mono text-meta text-muted" : "text-ink-2"}`}>
                        {t.text.length > 1600 ? t.text.slice(0, 1600) + " …" : t.text}
                      </p>
                    </div>
                  ))}
                  {selected.turns.length === 0 && <p className="text-ui text-muted">No replayable turns (system-only).</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

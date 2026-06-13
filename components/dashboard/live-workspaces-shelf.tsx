"use client";

// Phase-4 Slice 4: a real shelf on the real dashboard. Self-contained client
// component reading through the always-live seam getters — the fixture dashboard
// is otherwise untouched, no global toggle, no schema drift. Cards open the
// working /live/artifact/[id] graph + inspector.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Node, LineageSubgraph } from "@/lib/types";
import { listLiveArtifacts, getLiveLineage } from "@/lib/data";
import { ResearchGraph } from "@/components/landing/research-graph";

type LiveWs = { id: string; name: string; summary: string; lineage: LineageSubgraph };
const EMPTY: LineageSubgraph = { nodes: [], edges: [] };

export function LiveWorkspacesShelf() {
  const [items, setItems] = useState<LiveWs[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const arts = await listLiveArtifacts("matrix");
        const built = await Promise.all(
          arts.slice(0, 6).map(async (a: Node) => {
            const lineage = await getLiveLineage(a.id).catch(() => EMPTY);
            const rows = (a.spec as { output_n_rows?: number } | undefined)?.output_n_rows;
            return {
              id: a.id,
              name: a.name,
              summary: rows ? `matrix · ${rows.toLocaleString()} rows` : `matrix · ${a.state ?? ""}`,
              lineage,
            };
          }),
        );
        if (alive) setItems(built);
      } catch {
        if (alive) setItems([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="flex items-baseline gap-3">
        <h2 className="font-serif text-h2">Live workspaces</h2>
        <span className="inline-flex items-center gap-1.5 border border-green/40 bg-green/5 px-2 py-0.5 font-mono text-meta uppercase tracking-[0.12em] text-green">
          <span className="h-1.5 w-1.5 rounded-full bg-green" /> real · artifact-catalog
        </span>
        <Link
          href="/live"
          className="ml-auto font-mono text-meta uppercase tracking-[0.12em] text-muted transition-colors hover:text-clay"
        >
          Browse all →
        </Link>
      </div>
      <p className="mt-1 text-ui text-muted">
        Real DERIVED artifacts + their lineage, live from the engine. Click to open the graph + inspector.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map((ws) => (
          <Link
            key={ws.id}
            href={`/live/artifact/${encodeURIComponent(ws.id)}`}
            className="group block border border-hairline p-3 transition-colors hover:border-ink-2"
          >
            <div className="overflow-hidden">
              <ResearchGraph subgraph={ws.lineage} variant="thumb" className="max-h-[92px]" />
            </div>
            <p className="mt-2 font-mono text-micro uppercase tracking-[0.1em] text-muted">{ws.summary}</p>
            <p className="truncate text-ui text-ink group-hover:text-clay">{ws.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

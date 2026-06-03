"use client";

import type { LineageSubgraph } from "@/lib/types";
import type { WorkspaceBundle } from "@/components/workspace/types";
import { ResearchGraph } from "@/components/landing/research-graph";

function depths(sg: LineageSubgraph): Record<string, number> {
  const parents: Record<string, string[]> = {};
  const isPolicy = (id: string) => sg.nodes.find((n) => n.id === id)?.kind === "policy";
  const flow = sg.nodes.filter((n) => n.kind !== "policy");
  for (const n of flow) parents[n.id] = [];
  for (const e of sg.edges) if (parents[e.childId] && !isPolicy(e.parentId)) parents[e.childId].push(e.parentId);
  const d: Record<string, number> = {};
  const visit = (id: string, seen: Set<string>): number => {
    if (d[id] != null) return d[id];
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = parents[id] ?? [];
    d[id] = ps.length ? Math.max(...ps.map((p) => visit(p, seen))) + 1 : 0;
    return d[id];
  };
  for (const n of flow) visit(n.id, new Set());
  return d;
}

/** Lineage is a hero, not a mini-map: full-canvas stage-laned graph + the
 *  reverse-topological provenance chain below. Clickable edges → the node. */
export function LineageHero({
  bundle,
  canBack,
  onBack,
  onOpenNode,
}: {
  bundle: WorkspaceBundle;
  canBack: boolean;
  onBack: () => void;
  onOpenNode: (id: string) => void;
}) {
  const d = depths(bundle.lineage);
  const chain = bundle.lineage.nodes
    .filter((n) => n.kind !== "policy")
    .sort((a, b) => (d[b.id] ?? 0) - (d[a.id] ?? 0));

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-5">
        {canBack && (
          <button onClick={onBack} className="font-mono text-[0.72rem] text-muted hover:text-clay transition-colors">
            ← back
          </button>
        )}
        <span className="eyebrow">how it was built · {bundle.workspaceName}</span>
      </div>

      <div className="border border-hairline bg-paper p-5 md:p-7">
        <ResearchGraph
          subgraph={bundle.lineage}
          labels={bundle.labels}
          producerOps={bundle.producerOps}
          variant="hero"
          onEdgeClick={(e) => onOpenNode(e.childId)}
        />
      </div>

      <div className="mt-8 max-w-[640px]">
        <p className="eyebrow mb-3">where it came from — back to raw data</p>
        <ol className="border border-hairline bg-paper divide-y divide-hairline">
          {chain.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => onOpenNode(n.id)}
                className="group w-full flex items-center gap-3 px-4 py-2.5 hover:bg-paper-2 transition-colors text-left"
              >
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted w-16 shrink-0">
                  {n.kind}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[0.88rem] text-ink truncate">{bundle.labels[n.id] ?? n.name}</span>
                  <span className="block font-mono text-[0.68rem] text-faint truncate">{n.name}</span>
                </span>
                {bundle.producerOps[n.id] && (
                  <span className="font-mono text-[0.68rem] text-faint shrink-0">{bundle.producerOps[n.id]}</span>
                )}
                <span className="font-mono text-[0.85rem] text-faint group-hover:text-clay transition-colors shrink-0">→</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

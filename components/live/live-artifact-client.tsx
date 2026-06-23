"use client";

// The live graph + inspector — Phase-4 Slice 2 (ADR-0002, ticket T-1).
// Reuses the REAL WorkflowGraph + InspectorDrawer (unchanged) fed by a real
// artifact's lineage from artifact-catalog. Isolated route — the fixture
// dashboard / workspace pages are untouched (global DATA_SOURCE stays fixtures).

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  Node,
  LineageSubgraph,
  LineageEdge,
  Concept,
} from "@/lib/types";
import type { InspectTarget } from "@/components/workspace/types";
import { getLiveArtifact, getLiveLineage, getConcepts } from "@/lib/data";
import { WorkflowGraph } from "@/components/workspace/workflow-graph";
import { InspectorDrawer } from "@/components/workspace/inspector/inspector-drawer";
import { ArtifactDataTable } from "@/components/live/artifact-data-table";
import { ArtifactCharts } from "@/components/live/artifact-charts";
import { ArtifactPlot } from "@/components/live/artifact-plot";

const VIEWS = [
  ["graph", "Graph"],
  ["data", "Data"],
  ["plot", "Plot"],
  ["dist", "Distributions"],
] as const;
type View = (typeof VIEWS)[number][0];

const NO_LABELS: Record<string, string> = {};
const NO_OPS: Record<string, string> = {};
const NO_VARIANTS = {} as Record<string, never>;

export function LiveArtifactClient({
  id,
  initialView = "graph",
}: {
  id: string;
  initialView?: View;
}) {
  const [node, setNode] = useState<Node | null>(null);
  const [lineage, setLineage] = useState<LineageSubgraph | null>(null);
  const [concepts, setConcepts] = useState<Record<string, Concept>>({});
  const [drawer, setDrawer] = useState<InspectTarget | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<View>(initialView);

  useEffect(() => {
    Promise.all([getLiveArtifact(id), getLiveLineage(id), getConcepts()])
      .then(([n, lin, c]) => {
        if (!n) {
          setErr("Artifact not found");
          return;
        }
        setNode(n);
        setLineage(lin);
        setConcepts(c);
        setDrawer({ type: "node", id: n.id }); // open the real node immediately
      })
      .catch((e) => setErr(String(e)));
  }, [id]);

  if (err)
    return (
      <div className="p-8 text-ui text-clay">
        {err}: <span className="font-mono text-meta">{id}</span>
        <div className="mt-2">
          <Link href="/live" className="text-faint hover:text-clay">
            ← back to the live catalog
          </Link>
        </div>
      </div>
    );

  if (!node || !lineage)
    return <div className="p-8 text-ui text-muted">Loading live artifact…</div>;

  return (
    <div className="flex h-[calc(100vh-52px)] flex-col">
      {/* header strip */}
      <div className="flex items-center gap-3 border-b border-hairline px-5 py-2.5">
        <Link href="/live" className="text-ui text-faint hover:text-clay">
          ← Live catalog
        </Link>
        <span className="text-faint">/</span>
        <span className="font-serif text-h3 text-ink">{node.name}</span>
        <span className="hidden font-mono text-meta text-muted md:inline">
          {node.id}
        </span>
        <div className="ml-2 flex items-center gap-0.5 rounded-md border border-hairline p-0.5" role="tablist">
          {VIEWS.map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={view === k}
              onClick={() => setView(k)}
              className={`rounded px-2.5 py-0.5 text-ui transition-colors ${
                view === k ? "bg-clay-wash text-clay" : "text-ink-2 hover:bg-paper-2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {node.dagId && !node.dagId.endsWith(".py") && (
          <Link
            href={`/live/receipt?dag=${encodeURIComponent(node.dagId)}`}
            title={`package the producing pipeline ${node.dagId} into a reproducibility receipt`}
            className="ml-auto font-mono text-meta uppercase tracking-[0.06em] text-clay hover:text-clay-deep border border-clay/40 hover:border-clay rounded px-2 py-0.5 transition-colors"
          >
            ⬇ code &amp; receipt
          </Link>
        )}
        <span className={`${node.dagId && !node.dagId.endsWith(".py") ? "" : "ml-auto"} inline-flex items-center gap-1.5 border border-green/40 bg-green/5 px-2 py-0.5 font-mono text-micro uppercase tracking-[0.12em] text-green`}>
          <span className="h-1.5 w-1.5 rounded-full bg-green" /> live graph + inspector
        </span>
      </div>

      {/* the real graph lens (click a node → the real inspector drawer) */}
      {view === "graph" ? (
        <div className="relative min-h-0 flex-1">
          <WorkflowGraph
            graph={lineage}
            labels={NO_LABELS}
            producerOps={NO_OPS}
            concepts={concepts}
            variants={NO_VARIANTS}
            selectedId={drawer?.type === "node" ? drawer.id : undefined}
            onInspectNode={(nid) => setDrawer({ type: "node", id: nid })}
            onInspectEdge={(e: LineageEdge) =>
              setDrawer({ type: "edge", parentId: e.parentId, childId: e.childId })
            }
            onCompare={() => {}}
            onFork={() => {}}
          />
          {drawer && (
            <InspectorDrawer
              target={drawer}
              initialTab="contract"
              graph={lineage}
              labels={NO_LABELS}
              producerOps={NO_OPS}
              resultSpecs={{}}
              datasets={{}}
              concepts={concepts}
              variants={NO_VARIANTS}
              onClose={() => setDrawer(null)}
              onPromote={() => {}}
              onFork={() => {}}
            />
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className={`mx-auto px-5 py-6 md:px-8 ${view === "dist" ? "max-w-[1320px]" : "max-w-[1640px]"}`}>
            {view === "data" ? (
              <ArtifactDataTable artifactId={node.id} />
            ) : view === "plot" ? (
              <ArtifactPlot artifactId={node.id} />
            ) : (
              <ArtifactCharts artifactId={node.id} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

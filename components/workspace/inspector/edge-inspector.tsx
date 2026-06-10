"use client";

import type { LineageEdge, Node } from "@/lib/types";

const EDGE_KIND: Record<LineageEdge["kind"], { label: string; explain: (a: string, b: string) => string }> = {
  input_dependency: { label: "input dependency", explain: (a, b) => `${b} is computed directly from ${a}. Change ${a} and ${b} re-derives — it is part of ${b}'s content hash.` },
  training_data: { label: "training data", explain: (a, b) => `${a} is part of the data ${b} was fit on. The fit is reproducible only against this exact input.` },
  input_model: { label: "produced by model", explain: (a, b) => `${b} is produced by running the model ${a} — the result is the model applied out-of-sample.` },
  stitch_source: { label: "stitch source", explain: (a, b) => `${a} is a source contract stitched into ${b}, rolled and back-adjusted under the roll policy.` },
  presentation_source: { label: "presentation source", explain: (a, b) => `${b} presents ${a} — a figure drawn from it, not a new computation.` },
};

const KIND_TAG: Record<string, string> = {
  dataset: "DATASET", "raw-dataset": "DATASET", feature: "FEATURE", matrix: "MATRIX",
  target: "TARGET", model: "MODEL", result: "RESULT", policy: "POLICY",
  strategy: "STRATEGY", universe: "UNIVERSE", figure: "FIGURE",
};

/** The edge inspector: an edge is a DATA DEPENDENCY, not just a line. It shows
 *  the parent → child relationship, the dependency kind in plain language, and
 *  the operator that realises it. */
export function EdgeInspector({
  parent,
  child,
  edgeKind,
  op,
  parentLabel,
  childLabel,
  composition,
  onOpenNode,
}: {
  parent?: Node;
  child?: Node;
  edgeKind: LineageEdge["kind"];
  op?: string;
  parentLabel: string;
  childLabel: string;
  composition?: string; // the exact pipeline.py line that realises this edge
  onOpenNode: (id: string) => void;
}) {
  const meta = EDGE_KIND[edgeKind];
  return (
    <div className="p-6 md:p-8 max-w-[680px]">
      <p className="eyebrow text-clay">dependency · {meta.label}</p>

      <div className="mt-5 flex flex-col items-stretch">
        <EndpointCard node={parent} label={parentLabel} onOpen={() => parent && onOpenNode(parent.id)} role="from" />
        <div className="flex flex-col items-center py-2">
          <span className="h-5 w-px bg-clay/50" />
          <span className="font-mono text-meta uppercase tracking-[0.14em] text-clay px-2 py-0.5 border border-clay/40 rounded-full">
            {op ?? meta.label}
          </span>
          <span className="h-5 w-px bg-clay/50" />
          <span className="text-meta leading-none text-clay">▼</span>
        </div>
        <EndpointCard node={child} label={childLabel} onOpen={() => child && onOpenNode(child.id)} role="to" />
      </div>

      {/* the composition: the exact line of code this edge IS */}
      {composition && (
        <div className="mt-7">
          <p className="eyebrow mb-2">how it composes · pipeline.py</p>
          <pre className="border border-hairline bg-paper-2/50 px-4 py-3 overflow-x-auto font-mono text-ui leading-relaxed text-ink">
            <span className="text-faint">{parent?.name ?? "—"}</span>
            <span className="text-faint"> → </span>
            <span className="text-ink">{child?.name ?? "—"}</span>
            {"\n"}
            {composition}
          </pre>
        </div>
      )}

      <div className="mt-6 border border-hairline bg-paper px-5 py-4">
        <p className="eyebrow mb-2">what this dependency means</p>
        <p className="text-body leading-[1.7] text-ink-2">{meta.explain(parentLabel, childLabel)}</p>
      </div>
    </div>
  );
}

function EndpointCard({ node, label, onOpen, role }: { node?: Node; label: string; onOpen: () => void; role: "from" | "to" }) {
  return (
    <button onClick={onOpen} className="group w-full text-left border border-hairline bg-paper px-5 py-4 hover:border-ink transition-colors">
      <div className="flex items-center justify-between">
        <span className="font-mono text-meta uppercase tracking-[0.16em] text-muted">{node ? KIND_TAG[node.kind] ?? node.kind : "—"}</span>
        <span className="font-mono text-meta uppercase tracking-[0.12em] text-faint">{role}</span>
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <span className="text-h3 text-ink group-hover:text-clay transition-colors">{label}</span>
        {node && <span className="font-mono text-meta text-faint truncate">{node.name}</span>}
      </div>
    </button>
  );
}

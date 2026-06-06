"use client";

import type { HostedDataset, LineageSubgraph, Node, ResultSpec } from "@/lib/types";
import { PreviewChart } from "@/components/workspace/preview-chart";
import { equityCurve } from "@/components/workspace/curve";

/** Longest-path depth over data edges — chronological build order. */
function depths(sg: LineageSubgraph): Record<string, number> {
  const parents: Record<string, string[]> = {};
  const isPolicy = (id: string) => sg.nodes.find((n) => n.id === id)?.kind === "policy";
  for (const n of sg.nodes) parents[n.id] = [];
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
  for (const n of sg.nodes) visit(n.id, new Set());
  return d;
}

const METRIC_LABEL: Record<string, string> = {
  sharpe: "Sharpe", hit_rate: "Hit rate", max_drawdown: "Max DD", turnover: "Turnover",
  ann_return: "Ann. return", flagged: "Flagged", max_z: "Max z", share_pct: "Share",
  ann_vol: "Ann. vol", vol_of_vol: "Vol of vol", max_20d: "Max 20d",
};
function fmtMetric(k: string, v: number) {
  if (k === "max_drawdown" || k === "ann_return" || k === "ann_vol" || k === "max_20d" || k === "share_pct") return `${(v * 100).toFixed(1)}%`;
  if (k === "flagged") return String(v);
  return v.toFixed(k === "hit_rate" ? 3 : 2);
}

/**
 * The Result lens, whole-analysis mode: the finding leads (KPIs + curve), then
 * the workflow as a top-to-bottom scrollable narrative that grows node-by-node
 * as the build streams. Each card drills into its kind-aware face. This is the
 * "watch it build" surface — density earned, never dumped.
 */
export function WorkflowNarrative({
  graph,
  labels,
  producerOps,
  resultSpecs,
  datasets,
  building,
  buildingLabel,
  buildingOp,
  workspaceName,
  onOpenNode,
}: {
  graph: LineageSubgraph;
  labels: Record<string, string>;
  producerOps: Record<string, string>;
  resultSpecs: Record<string, ResultSpec>;
  datasets: Record<string, HostedDataset>;
  building: boolean;
  buildingLabel?: string;
  buildingOp?: string;
  workspaceName: string;
  onOpenNode: (id: string) => void;
}) {
  const d = depths(graph);
  const flow = graph.nodes.filter((n) => n.kind !== "policy").sort((a, b) => (d[a.id] ?? 0) - (d[b.id] ?? 0));
  const result = [...flow].reverse().find((n) => n.kind === "result");
  const spec = result ? resultSpecs[result.id] : undefined;

  return (
    <div className="px-6 md:px-10 py-7 max-w-[760px] mx-auto">
      {/* finding — leads with the visual */}
      {result && spec && (
        <button
          onClick={() => onOpenNode(result.id)}
          className="block w-full text-left border border-clay bg-paper mb-8 hover:bg-paper-2/40 transition-colors"
        >
          <div className="px-5 pt-4 pb-3 border-b border-hairline flex items-baseline justify-between">
            <span className="eyebrow text-clay">the finding</span>
            <span className="font-serif italic text-[0.95rem] text-ink-2">{spec.friendlyName}</span>
          </div>
          <div className="px-5 py-4">
            <div className="border border-hairline bg-paper p-3">
              <PreviewChart data={equityCurve(spec.metrics)} height={150} />
            </div>
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-y-3">
              {Object.entries(spec.metrics).slice(0, 5).map(([k, v]) => (
                <div key={k}>
                  <div className="eyebrow">{METRIC_LABEL[k] ?? k}</div>
                  <div className="mt-1 font-mono text-[1.15rem] text-ink tabular-nums">{fmtMetric(k, v)}</div>
                </div>
              ))}
            </div>
            {spec.nextProposal && (
              <p className="mt-4 text-[0.9rem] leading-relaxed text-ink-2">
                <span className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-clay mr-2">next</span>
                {spec.nextProposal.kind === "none" ? spec.nextProposal.reason : spec.nextProposal.summary}
              </p>
            )}
          </div>
        </button>
      )}

      <p className="eyebrow mb-4">the workflow{building ? " · building…" : ` · ${workspaceName}`}</p>

      {flow.length === 0 && !building && (
        <p className="text-[0.9rem] text-muted">nothing built yet — describe what to build in the conversation.</p>
      )}

      <div className="flex flex-col items-stretch">
        {flow.map((n, i) => (
          <div key={n.id}>
            <NodeCard
              node={n}
              label={labels[n.id] ?? n.name}
              op={producerOps[n.id]}
              dataset={datasets[n.name]}
              spec={n.kind === "result" ? resultSpecs[n.id] : undefined}
              onOpen={() => onOpenNode(n.id)}
            />
            {(i < flow.length - 1 || building) && <Connector />}
          </div>
        ))}

        {building && (
          <div className="border border-dashed border-clay/60 bg-paper px-5 py-4 animate-pulse">
            <div className="flex items-center justify-between">
              <span className="text-[0.9rem] text-ink">{buildingLabel ?? "building…"}</span>
              {buildingOp && <span className="font-mono text-[0.7rem] text-clay">{buildingOp}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex flex-col items-center py-1 text-faint">
      <span className="h-4 w-px bg-hairline-2" />
      <span className="text-[0.7rem] leading-none">▼</span>
    </div>
  );
}

const KIND_TAG: Record<string, string> = {
  dataset: "DATASET", "raw-dataset": "DATASET", feature: "FEATURE", matrix: "MATRIX",
  target: "TARGET", model: "MODEL", result: "RESULT", strategy: "STRATEGY",
  universe: "UNIVERSE", figure: "FIGURE",
};

const RESULT_METRIC_KEYS = ["sharpe", "hit_rate", "max_drawdown"];

function NodeCard({
  node,
  label,
  op,
  dataset,
  spec,
  onOpen,
}: {
  node: Node;
  label: string;
  op?: string;
  dataset?: HostedDataset;
  spec?: ResultSpec;
  onOpen: () => void;
}) {
  const isResult = node.kind === "result";
  const isDataset = node.kind === "dataset" || node.kind === "raw-dataset";
  return (
    <button
      onClick={onOpen}
      className={`group w-full text-left border bg-paper px-5 py-4 transition-colors hover:bg-paper-2/50 ${
        isResult ? "border-clay" : "border-hairline hover:border-ink"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`font-mono text-[0.6rem] uppercase tracking-[0.16em] ${isResult ? "text-clay" : "text-muted"}`}>
          {KIND_TAG[node.kind] ?? node.kind}
        </span>
        {op && <span className="font-mono text-[0.68rem] text-faint">{op}</span>}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[1rem] text-ink">{label}</span>
        <span className="font-mono text-[0.7rem] text-faint truncate">{node.name}</span>
      </div>

      {isDataset && dataset && (
        <div className="mt-3 border border-hairline bg-paper-2/40 p-2">
          <PreviewChart data={dataset.preview} height={84} />
          <div className="mt-1.5 flex items-center justify-between font-mono text-[0.64rem] text-faint">
            <span>{(dataset.rows / 1e6).toFixed(1)}M rows · {dataset.cols} cols</span>
            <span>{dataset.missingPct}% missing</span>
          </div>
        </div>
      )}

      {isResult && spec && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
          {RESULT_METRIC_KEYS.filter((k) => k in spec.metrics).map((k) => (
            <span key={k} className="font-mono text-[0.78rem] text-ink-2">
              <span className="text-faint">{METRIC_LABEL[k] ?? k} </span>
              {fmtMetric(k, spec.metrics[k])}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

"use client";

import type { HostedDataset, LineageSubgraph, Node, ResultSpec } from "@/lib/types";
import type { Lens } from "@/components/workspace/types";
import { PreviewChart } from "@/components/workspace/preview-chart";
import { Figure } from "@/components/workspace/figure";
import { resultEquityFigure } from "@/lib/figures";
import { deriveValidator, validatorOk } from "@/lib/data";

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

// plain-English metric labels (jargon kept in parens) — so a newcomer reads
// meaning first and learns the term, instead of meeting the jargon cold.
const PLAIN_LABEL: Record<string, { plain: string; jargon?: string }> = {
  sharpe: { plain: "Risk-adjusted return", jargon: "Sharpe" },
  hit_rate: { plain: "Win rate", jargon: "hit rate" },
  max_drawdown: { plain: "Worst dip", jargon: "max drawdown" },
  ann_return: { plain: "Annual return" },
  turnover: { plain: "Turnover" },
  ann_vol: { plain: "Volatility", jargon: "ann. vol" },
  flagged: { plain: "Flagged" },
  max_z: { plain: "Largest spike", jargon: "max z" },
  share_pct: { plain: "Share" },
};

/** A plain-language one-liner from the result's numbers — what a newcomer reads first. */
function plainHeadline(spec: ResultSpec): string {
  const m = spec.metrics;
  const bits: string[] = [];
  if (typeof m.sharpe === "number") bits.push(`about ${m.sharpe.toFixed(1)}× return per unit of risk`);
  if (typeof m.ann_return === "number") bits.push(`${(m.ann_return * 100).toFixed(0)}% a year`);
  if (typeof m.flagged === "number") bits.push(`${m.flagged} flagged`);
  return bits.length ? `${spec.friendlyName} — ${bits.join(", ")}.` : `${spec.friendlyName}.`;
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
  onOpenLens,
  onNextStep,
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
  onOpenLens?: (l: Lens) => void;
  onNextStep?: (prompt: string) => void;
}) {
  const d = depths(graph);
  const flow = graph.nodes.filter((n) => n.kind !== "policy").sort((a, b) => (d[a.id] ?? 0) - (d[b.id] ?? 0));
  const result = [...flow].reverse().find((n) => n.kind === "result");
  const spec = result ? resultSpecs[result.id] : undefined;
  const validator = result && result.kind !== "dataset" && result.kind !== "raw-dataset" ? deriveValidator(result, graph) : undefined;
  const ok = validator ? validatorOk(validator) : false;

  return (
    <div className="px-6 md:px-8 py-7 max-w-[1080px] mx-auto">
      {/* finding — leads with a plain-language headline, the visual, human-labelled
          numbers, a calm trust mark, and the depth (graph / code) one click away */}
      {result && spec && (
        <div className="ticks border border-hairline bg-paper mb-9">
          <div className="px-6 pt-5 pb-4 border-b border-hairline">
            <p className="eyebrow text-clay">the finding</p>
            <p className="mt-2 font-serif text-h2 leading-[1.34] text-ink max-w-[62ch]">{plainHeadline(spec)}</p>
          </div>
          <div className="grid md:grid-cols-12">
            <button onClick={() => onOpenNode(result.id)} className="md:col-span-8 text-left px-6 py-5 border-b md:border-b-0 md:border-r border-hairline hover:bg-paper-2/30 transition-colors">
              <Figure spec={resultEquityFigure(spec)} height={236} />
              <p className="mt-2 font-mono text-meta text-faint">equity (blue) over drawdown (clay), one calendar · click to inspect</p>
            </button>
            <div className="md:col-span-4 px-6 py-5 flex flex-col gap-4">
              {Object.entries(spec.metrics).slice(0, 4).map(([k, v], i) => {
                const lbl = PLAIN_LABEL[k];
                return (
                  <div key={k}>
                    <div className={`font-mono ${i === 0 ? "text-display" : "text-h2"} text-ink tabular-nums leading-none`}>{fmtMetric(k, v)}</div>
                    <div className="mt-1 text-meta text-muted">
                      {lbl?.plain ?? METRIC_LABEL[k] ?? k}
                      {lbl?.jargon && <span className="font-mono text-meta text-faint"> ({lbl.jargon})</span>}
                    </div>
                  </div>
                );
              })}
              {spec.nextProposal && (() => {
                const np = spec.nextProposal;
                return (
                  <div className="mt-1 pt-3 border-t border-hairline">
                    <p className="eyebrow text-clay mb-1.5">next move</p>
                    {np.kind === "none" || !onNextStep ? (
                      <p className="text-ui leading-relaxed text-ink-2">{np.kind === "none" ? np.reason : np.summary}</p>
                    ) : (
                      <button
                        onClick={() => onNextStep(np.summary)}
                        className="group w-full text-left bg-clay text-paper px-3.5 py-2.5 hover:bg-clay-deep transition-colors"
                      >
                        <span className="block text-ui leading-snug">{np.summary}</span>
                        <span className="mt-1 block font-mono text-meta uppercase tracking-[0.12em] text-paper/70 group-hover:text-paper">run this next →</span>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="px-6 py-3 border-t border-hairline flex items-center gap-4 flex-wrap">
            <span className={`font-mono text-meta ${ok ? "text-green" : "text-clay"}`}>{ok ? "validated" : "blocked"}</span>
            {ok && <><span className="font-mono text-meta text-muted">no look-ahead</span><span className="font-mono text-meta text-muted">reproducible</span></>}
            {onOpenLens && (
              <span className="ml-auto flex items-center gap-4">
                <button onClick={() => onOpenLens("graph")} className="font-mono text-meta text-muted hover:text-ink transition-colors">how it was built ▸</button>
                <button onClick={() => onOpenLens("code")} className="font-mono text-meta text-muted hover:text-ink transition-colors">the code ▸</button>
              </span>
            )}
          </div>
        </div>
      )}

      <div className="max-w-[680px]">
      <p className="eyebrow mb-4">how it was built · {workspaceName}{building ? " · building…" : ""} <span className="text-faint normal-case tracking-normal">— or open the Graph lens to see the full lineage</span></p>

      {flow.length === 0 && !building && (
        <p className="text-body text-muted">nothing built yet — describe what to build in the conversation.</p>
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
              <span className="text-body text-ink">{buildingLabel ?? "building…"}</span>
              {buildingOp && <span className="font-mono text-meta text-clay">{buildingOp}</span>}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex flex-col items-center py-1 text-faint">
      <span className="h-4 w-px bg-hairline-2" />
      <span className="text-meta leading-none">▼</span>
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
        <span className={`font-mono text-meta uppercase tracking-[0.16em] ${isResult ? "text-clay" : "text-muted"}`}>
          {KIND_TAG[node.kind] ?? node.kind}
        </span>
        {op && <span className="font-mono text-meta text-faint">{op}</span>}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <span className="text-h3 text-ink">{label}</span>
        <span className="font-mono text-meta text-faint truncate">{node.name}</span>
      </div>

      {isDataset && dataset && (
        <div className="mt-3 border border-hairline bg-paper-2/40 p-2">
          <PreviewChart data={dataset.preview} height={84} />
          <div className="mt-1.5 flex items-center justify-between font-mono text-meta text-faint">
            <span>{(dataset.rows / 1e6).toFixed(1)}M rows · {dataset.cols} cols</span>
            <span>{dataset.missingPct}% missing</span>
          </div>
        </div>
      )}

      {isResult && spec && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
          {RESULT_METRIC_KEYS.filter((k) => k in spec.metrics).map((k) => (
            <span key={k} className="font-mono text-ui text-ink-2">
              <span className="text-faint">{METRIC_LABEL[k] ?? k} </span>
              {fmtMetric(k, spec.metrics[k])}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

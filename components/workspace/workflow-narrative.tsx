"use client";

import { Fragment } from "react";
import type { HostedDataset, LineageSubgraph, ResultSpec } from "@/lib/types";
import type { Lens } from "@/components/workspace/types";
import { Figure } from "@/components/workspace/figure";
import { resultEquityFigure, featureWeightsFigure, regimeFigure } from "@/lib/figures";
import { deriveValidator, validatorOk } from "@/lib/data";

/** Read a model spec's learned coefficients (free-form dict) → typed weights. */
function readCoefficients(spec: unknown): Record<string, number> | null {
  if (!spec || typeof spec !== "object") return null;
  const co = (spec as { coefficients?: unknown }).coefficients;
  if (!co || typeof co !== "object") return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(co)) if (typeof v === "number") out[k] = v;
  return Object.keys(out).length ? out : null;
}

/** A plain-language headline for the feature weights — the dominant signal, and
 *  the one that leans against it. */
function droveHeadline(coefs: Record<string, number>, labelFor: (k: string) => string): string {
  const e = Object.entries(coefs).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const top = e[0];
  const neg = e.find((x) => x[1] < 0);
  const topL = labelFor(top[0]);
  return neg && neg[0] !== top[0]
    ? `${topL} carries the signal — ${labelFor(neg[0])} leans against it.`
    : `${topL} carries the signal.`;
}

const REGIME_WORD: Record<string, string> = { MR: "mean-reverting", UP: "trending-up", DOWN: "trending-down", NO_TRADE: "flat" };

/** A plain-language headline for the regime ribbon — what ruled, and the catch. */
function regimeHeadline(series: { state: string }[]): string {
  const counts: Record<string, number> = {};
  for (const r of series) counts[r.state] = (counts[r.state] ?? 0) + 1;
  const dom = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "MR";
  if (dom === "MR" && series.some((r) => r.state === "DOWN"))
    return "It paid in mean-reverting weeks — and gave it back when the market trended.";
  return `${REGIME_WORD[dom] ?? dom} weeks dominated the window.`;
}

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

  // ── the visual story: what drove it (model weights) · when it worked (regime) ──
  const modelNode = flow.find((n) => n.kind === "model");
  const coefs = readCoefficients(modelNode?.spec);
  const labelForFeature = (key: string) => {
    const fn = graph.nodes.find((n) => n.name === key);
    return fn ? labels[fn.id] ?? key : key;
  };
  const weightsFig = coefs ? featureWeightsFigure(coefs, labelForFeature) : null;
  const modelLabel = modelNode ? labels[modelNode.id] ?? modelNode.name : undefined;
  const regimeFig = spec ? regimeFigure(spec) : null;

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

      <div className="space-y-10">
        {/* what drove it — the model's weights, told as a picture */}
        {weightsFig && coefs && (
          <section className="max-w-[680px]">
            <p className="eyebrow text-clay">what drove it{modelLabel ? ` · ${modelLabel}` : ""}</p>
            <h3 className="mt-1.5 font-serif text-h2 text-ink leading-snug max-w-[34ch]">{droveHeadline(coefs, labelForFeature)}</h3>
            <div className="ticks mt-4 border border-hairline bg-paper p-5">
              <Figure spec={weightsFig} />
            </div>
            <p className="mt-2.5 font-mono text-meta text-faint">model weights · positive (blue) adds signal · negative (clay) hedges</p>
          </section>
        )}

        {/* when it worked — the regime ribbon */}
        {regimeFig && spec?.regimeSeries && (
          <section className="max-w-[680px]">
            <p className="eyebrow text-clay">when it worked</p>
            <h3 className="mt-1.5 font-serif text-h2 text-ink leading-snug max-w-[40ch]">{regimeHeadline(spec.regimeSeries)}</h3>
            <div className="mt-4 border border-hairline bg-paper p-5">
              <Figure spec={regimeFig} />
            </div>
          </section>
        )}

        {/* how it was built — a compact recipe, not 11 stacked boxes */}
        <section>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className="eyebrow text-clay">how it was built</p>
            {onOpenLens && (
              <button onClick={() => onOpenLens("graph")} className="font-mono text-meta text-muted hover:text-ink transition-colors">full lineage in the Graph lens →</button>
            )}
          </div>
          {flow.length === 0 && !building ? (
            <p className="mt-3 text-body text-muted">nothing built yet — describe what to build in the conversation.</p>
          ) : (
            <>
              <h3 className="mt-1.5 font-serif text-h2 text-ink leading-snug">From data to the finding, in {flow.length} steps.</h3>
              <div className="mt-4 overflow-x-auto pb-1">
                <div className="flex items-stretch min-w-min">
                  {flow.map((n, i) => {
                    const ds = datasets[n.name];
                    return (
                      <Fragment key={n.id}>
                        <button onClick={() => onOpenNode(n.id)} className={`group shrink-0 w-[150px] text-left border bg-paper px-3 py-2.5 transition-colors ${n.kind === "result" ? "border-clay" : "border-hairline hover:border-ink"}`}>
                          <div className={`font-mono text-micro uppercase tracking-[0.13em] ${n.kind === "result" ? "text-clay" : "text-faint"}`}>{KIND_TAG[n.kind] ?? n.kind}</div>
                          <div className="mt-1 text-ui text-ink leading-tight truncate">{labels[n.id] ?? n.name}</div>
                          <div className="mt-0.5 font-mono text-micro text-faint truncate">{ds ? `${(ds.rows / 1e6).toFixed(1)}M rows` : producerOps[n.id] ?? n.name}</div>
                        </button>
                        {i < flow.length - 1 && <div className="flex items-center px-1.5 text-hairline-2 font-mono shrink-0">→</div>}
                      </Fragment>
                    );
                  })}
                  {building && (
                    <>
                      {flow.length > 0 && <div className="flex items-center px-1.5 text-hairline-2 font-mono shrink-0">→</div>}
                      <div className="shrink-0 w-[150px] border border-dashed border-clay/60 bg-paper px-3 py-2.5 animate-pulse">
                        <div className="font-mono text-micro uppercase tracking-[0.13em] text-clay">building</div>
                        <div className="mt-1 text-ui text-ink leading-tight truncate">{buildingLabel ?? "…"}</div>
                        {buildingOp && <div className="mt-0.5 font-mono text-micro text-clay truncate">{buildingOp}</div>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

const KIND_TAG: Record<string, string> = {
  dataset: "DATASET", "raw-dataset": "DATASET", feature: "FEATURE", matrix: "MATRIX",
  target: "TARGET", model: "MODEL", result: "RESULT", strategy: "STRATEGY",
  universe: "UNIVERSE", figure: "FIGURE",
};


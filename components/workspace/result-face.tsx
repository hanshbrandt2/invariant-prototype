"use client";

import type { Node, ResultSpec, Validator } from "@/lib/types";
import { Figure } from "@/components/workspace/figure";
import { resultEquityFigure, regimeFigure } from "@/lib/figures";
import { Metric, type MetricFormat } from "@/components/workspace/metric";

const METRIC_LABEL: Record<string, string> = {
  sharpe: "Sharpe",
  hit_rate: "Hit rate",
  max_drawdown: "Max DD",
  turnover: "Turnover",
  ann_return: "Ann. return",
};

const METRIC_FMT: Record<string, MetricFormat> = {
  sharpe: "ratio",
  hit_rate: "number",
  max_drawdown: "signed-pct",
  turnover: "ratio",
  ann_return: "signed-pct",
  flagged: "int",
  max_z: "ratio",
  share_pct: "pct",
  ann_vol: "pct",
  vol_of_vol: "ratio",
  max_20d: "pct",
};

/** Result face: leads with what it found, then the prominent next move. Every
 *  number routes through the anti-fabrication gate (Metric): no value renders
 *  without this result's lineage_hash + validator verdict. */
export function ResultFace({
  node,
  spec,
  validator,
  onOpenNode,
}: {
  node: Node;
  spec?: ResultSpec;
  validator?: Validator;
  onOpenNode: (id: string) => void;
}) {
  if (!spec) {
    return <div className="p-6 text-body text-muted">No result spec for {node.name}.</div>;
  }
  return (
    <div className="p-6">
      <p className="font-serif italic text-h3 text-ink-2">{spec.friendlyName}</p>

      {/* the finding — lead with the visual */}
      <div className="mt-4 border border-hairline bg-paper p-4">
        <Figure spec={resultEquityFigure(spec)} height={210} />
      </div>

      {/* the regime ribbon — when the mean-reversion edge ruled, and when it didn't */}
      {regimeFigure(spec) && (
        <div className="mt-3 border border-hairline bg-paper px-4 py-3">
          <p className="eyebrow mb-2">regime over the window</p>
          <Figure spec={regimeFigure(spec)} />
        </div>
      )}

      {/* metrics — what it found */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 border border-hairline divide-x divide-hairline">
        {Object.entries(spec.metrics).map(([k, v]) => (
          <div key={k} className="px-4 py-4">
            <div className="eyebrow">{METRIC_LABEL[k] ?? k}</div>
            <div className="mt-1.5 text-h2 text-ink">
              <Metric value={v} format={METRIC_FMT[k] ?? "ratio"} validator={validator} lineageHash={node.lineageHash} />
            </div>
          </div>
        ))}
      </div>

      {/* next move — prominent */}
      <div className="mt-6 border border-clay bg-paper">
        <div className="px-5 py-4">
          <p className="eyebrow text-clay">next move · {spec.nextProposal.kind === "none" ? "none" : spec.nextProposal.kind}</p>
          <p className="mt-2 text-h3 leading-relaxed text-ink">
            {spec.nextProposal.kind === "none" ? spec.nextProposal.reason : spec.nextProposal.summary}
          </p>
        </div>
      </div>

      {/* intended invariant */}
      <div className="mt-6">
        <p className="eyebrow">intended invariant</p>
        <p className="mt-2 font-serif text-h3 leading-[1.6] text-ink-2 max-w-[64ch]">
          {spec.intendedInvariant}
        </p>
        <p className="mt-3 font-mono text-meta text-faint">
          eval {spec.evalWindow.start} → {spec.evalWindow.end}
        </p>
      </div>

      {/* made from */}
      <div className="mt-6">
        <p className="eyebrow">made from</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {spec.lineageRefs.map((r) => (
            <button
              key={r}
              onClick={() => onOpenNode(r)}
              className="font-mono text-ui text-ink-2 border border-hairline-2 px-2.5 py-1 hover:border-ink hover:text-ink transition-colors"
            >
              → {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import type { Node, ResultSpec } from "@/lib/types";
import { PreviewChart } from "@/components/workspace/preview-chart";
import { equityCurve } from "@/components/workspace/curve";

const METRIC_LABEL: Record<string, string> = {
  sharpe: "Sharpe",
  hit_rate: "Hit rate",
  max_drawdown: "Max DD",
  turnover: "Turnover",
  ann_return: "Ann. return",
};

function fmtMetric(k: string, v: number) {
  if (k === "max_drawdown" || k === "ann_return") return `${(v * 100).toFixed(1)}%`;
  return v.toFixed(k === "hit_rate" ? 3 : 2);
}

/** Result face: leads with what it found, then the prominent next move. */
export function ResultFace({
  node,
  spec,
  onOpenNode,
}: {
  node: Node;
  spec?: ResultSpec;
  onOpenNode: (id: string) => void;
}) {
  if (!spec) {
    return <div className="p-6 text-[0.9rem] text-muted">No result spec for {node.name}.</div>;
  }
  return (
    <div className="p-6">
      <p className="font-serif italic text-[1.05rem] text-ink-2">{spec.friendlyName}</p>

      {/* the finding — lead with the visual */}
      <div className="mt-4 border border-hairline bg-paper p-4">
        <PreviewChart data={equityCurve(spec.metrics)} height={200} />
      </div>

      {/* metrics — what it found */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 border border-hairline divide-x divide-hairline">
        {Object.entries(spec.metrics).map(([k, v]) => (
          <div key={k} className="px-4 py-4">
            <div className="eyebrow">{METRIC_LABEL[k] ?? k}</div>
            <div className="mt-1.5 font-mono text-[1.35rem] text-ink tabular-nums">{fmtMetric(k, v)}</div>
          </div>
        ))}
      </div>

      {/* next move — prominent */}
      <div className="mt-6 border border-clay bg-paper">
        <div className="px-5 py-4">
          <p className="eyebrow text-clay">next move · {spec.nextProposal.kind === "none" ? "none" : spec.nextProposal.kind}</p>
          <p className="mt-2 text-[1rem] leading-relaxed text-ink">
            {spec.nextProposal.kind === "none" ? spec.nextProposal.reason : spec.nextProposal.summary}
          </p>
        </div>
      </div>

      {/* intended invariant */}
      <div className="mt-6">
        <p className="eyebrow">intended invariant</p>
        <p className="mt-2 font-serif text-[1rem] leading-[1.6] text-ink-2 max-w-[64ch]">
          {spec.intendedInvariant}
        </p>
        <p className="mt-3 font-mono text-[0.74rem] text-faint">
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
              className="font-mono text-[0.78rem] text-ink-2 border border-hairline-2 px-2.5 py-1 hover:border-ink hover:text-ink transition-colors"
            >
              → {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

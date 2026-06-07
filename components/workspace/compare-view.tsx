"use client";

import { useState } from "react";
import type { VariantGroup } from "@/lib/types";
import { equityCurve } from "@/components/workspace/curve";

/** A clean multi-line overlay of variant curves — the winner bold, rest faint. */
function OverlayChart({ series }: { series: { value: string; points: { v: number }[]; best: boolean }[] }) {
  const W = 600, H = 150, P = 8;
  const all = series.flatMap((s) => s.points.map((p) => p.v));
  const min = Math.min(...all), max = Math.max(...all);
  const n = series[0]?.points.length ?? 1;
  const sx = (i: number) => P + (i / Math.max(1, n - 1)) * (W - 2 * P);
  const sy = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      {series.map((s) => (
        <polyline
          key={s.value}
          fill="none"
          stroke={s.best ? "var(--color-clay)" : "var(--color-hairline-2)"}
          strokeWidth={s.best ? 2.2 : 1.2}
          opacity={s.best ? 1 : 0.55}
          points={s.points.map((p, i) => `${sx(i)},${sy(p.v)}`).join(" ")}
        />
      ))}
    </svg>
  );
}

const METRIC_LABEL: Record<string, string> = {
  sharpe: "Sharpe", hit_rate: "Hit rate", max_drawdown: "Max DD", turnover: "Turnover", ann_return: "Ann. return",
};
function fmt(k: string, v: number) {
  if (k === "max_drawdown" || k === "ann_return") return `${(v * 100).toFixed(1)}%`;
  return v.toFixed(k === "hit_rate" ? 3 : 2);
}

/**
 * The output of forking is a comparison, not more boxes. A variant group's
 * sweep as a leaderboard (+ an overlay of the top curves), with the winner
 * marked and a promote → spine action that makes one the canonical node.
 */
export function CompareView({
  group,
  nodeLabel,
  op,
  onPromote,
  onFork,
}: {
  group: VariantGroup;
  nodeLabel: string;
  op?: string;
  onPromote: (value: string) => void;
  onFork?: () => void;
}) {
  const hasMetrics = group.members.some((m) => m.metrics);
  const bestBy = group.bestBy ?? "sharpe";
  // a compact, drawer-fitting subset of metrics (the full set lives in the node face)
  const metricKeys = ["sharpe", "hit_rate", "max_drawdown"];
  const [sortKey, setSortKey] = useState(bestBy);

  const desc = (k: string) => k !== "max_drawdown" && k !== "turnover"; // higher is better, except DD/turnover
  const rows = [...group.members].sort((a, b) => {
    const av = a.metrics?.[sortKey] ?? 0, bv = b.metrics?.[sortKey] ?? 0;
    return desc(sortKey) ? bv - av : av - bv;
  });
  const best = hasMetrics
    ? group.members.reduce((acc, m) => ((m.metrics?.[bestBy] ?? -Infinity) > (acc.metrics?.[bestBy] ?? -Infinity) ? m : acc))
    : undefined;

  // top 3 by best metric, for the overlay
  const overlay = hasMetrics
    ? [...group.members].sort((a, b) => (b.metrics?.[bestBy] ?? 0) - (a.metrics?.[bestBy] ?? 0)).slice(0, 3)
    : [];

  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-clay">compare · {nodeLabel} — {group.param} sweep</p>
          <p className="mt-1 font-mono text-[0.7rem] text-faint">
            {group.members.length} variant{group.members.length === 1 ? "" : "s"}{op ? ` · ${op}` : ""} · on spine: {group.param}={group.chosen}
          </p>
        </div>
        {onFork && (
          <button onClick={onFork} className="shrink-0 font-mono text-[0.64rem] uppercase tracking-[0.1em] border border-clay text-clay px-2.5 py-1 hover:bg-clay hover:text-paper transition-colors">
            ⑂ fork more
          </button>
        )}
      </div>

      {hasMetrics && (
        <div className="mt-4 border border-hairline bg-paper p-3">
          <OverlayChart series={overlay.map((m) => ({ value: m.value, points: equityCurve(m.metrics!), best: m.value === best?.value }))} />
          <p className="mt-1 font-mono text-[0.62rem] text-faint">cumulative return · top {overlay.length} overlaid · {group.param}={best?.value} bold</p>
        </div>
      )}

      {hasMetrics ? (
        <div className="mt-4 rounded-lg border border-hairline bg-white overflow-hidden">
          <table className="w-full table-fixed font-mono text-[0.74rem]">
            <thead>
              <tr className="border-b border-hairline text-faint">
                <th className="text-left font-normal px-3 py-2 w-[26%]">{group.param}</th>
                {metricKeys.map((k) => (
                  <th key={k} className="text-right font-normal px-2 py-2 cursor-pointer hover:text-ink" onClick={() => setSortKey(k)}>
                    {METRIC_LABEL[k] ?? k}{sortKey === k ? " ▾" : ""}
                  </th>
                ))}
                <th className="px-2 py-2 w-[34px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const isBest = m.value === best?.value;
                const onSpine = m.value === group.chosen;
                return (
                  <tr key={m.value} className={`border-b border-hairline/60 last:border-0 ${isBest ? "bg-[#fbf1ec]" : ""}`}>
                    <td className={`px-3 py-1.5 truncate ${onSpine ? "text-ink" : "text-muted"}`}>
                      {m.value}
                      {isBest && <span className="text-clay ml-1.5">★</span>}
                    </td>
                    {metricKeys.map((k) => (
                      <td key={k} className="px-2 py-1.5 text-right tabular-nums text-ink-2">{fmt(k, m.metrics![k])}</td>
                    ))}
                    <td className="px-2 py-1.5 text-right">
                      {onSpine ? (
                        <span className="text-[#3B6D11]" title="on spine">●</span>
                      ) : (
                        <button onClick={() => onPromote(m.value)} title="promote to spine" className="text-muted hover:text-clay text-[0.95rem] leading-none">↑</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 border border-hairline bg-paper divide-y divide-hairline">
          {group.members.map((m) => {
            const onSpine = m.value === group.chosen;
            return (
              <div key={m.value} className="flex items-center justify-between px-3 py-2 font-mono text-[0.8rem]">
                <span className={onSpine ? "text-ink" : "text-muted"}>
                  {group.param} = {m.value}
                  {onSpine && <span className="text-[#3B6D11] ml-2 text-[0.66rem]">on spine</span>}
                </span>
                {!onSpine && (
                  <button onClick={() => onPromote(m.value)} className="font-mono text-[0.6rem] uppercase tracking-[0.1em] border border-ink px-2 py-0.5 hover:bg-ink hover:text-paper transition-colors">
                    promote → spine
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

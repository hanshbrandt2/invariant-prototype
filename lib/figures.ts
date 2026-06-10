// Figure builders (M-J) — pure transforms from a typed spec into a ChartSpec the
// <Figure> seam renders. No fabrication: charts are built from AUTHORED snapshot
// data (or honest derivations of it), the same discipline metric.tsx gives numbers.

import type { ChartSpec, ResultSpec, VariantMember } from "@/lib/types";
import { editorial } from "@/lib/theme/editorial";

/** The result's equity + drawdown figure, from its AUTHORED equity snapshot.
 *  Drawdown is derived honestly (equity − running max) so the two panels are
 *  internally consistent. Returns null when no series is authored (the chart
 *  then simply doesn't render — better than a synthesized one). */
export function resultEquityFigure(spec: ResultSpec): ChartSpec | null {
  const s = spec.equitySeries;
  if (!s || s.length === 0) return null;
  let peak = -Infinity;
  const data = s.map((p) => {
    peak = Math.max(peak, p.equity);
    return { t: p.t, equity: p.equity, drawdown: +(p.equity - peak).toFixed(2) };
  });
  return {
    mark: "equity-drawdown",
    data,
    x: "t",
    y: ["equity", "drawdown"],
    caption: `cumulative return % · ${spec.evalWindow.start} → ${spec.evalWindow.end} · authored snapshot`,
    yLabel: "return %",
  };
}

/** An honest variant comparison: the real `bestBy` metric across the sweep,
 *  winner in clay. Replaces the old fabricated equity overlay — it draws only
 *  numbers the members actually carry, no synthesized curves. */
export function variantMetricFigure(
  members: VariantMember[],
  bestBy: string,
  chosen: string,
): ChartSpec | null {
  const rows = members.filter((m) => typeof m.metrics?.[bestBy] === "number");
  if (rows.length === 0) return null;
  const lowerIsBetter = bestBy === "max_drawdown" || bestBy === "turnover";
  const best = rows.reduce((a, b) =>
    (lowerIsBetter ? (b.metrics![bestBy] < a.metrics![bestBy]) : (b.metrics![bestBy] > a.metrics![bestBy])) ? b : a,
  );
  return {
    mark: "bar",
    data: rows.map((m) => ({ label: m.value, value: +m.metrics![bestBy].toFixed(3) })),
    x: "label",
    y: "value",
    color: editorial.color.data,
    colors: rows.map((m) =>
      m.value === best.value ? editorial.color.clay
      : m.value === chosen ? editorial.color.ink2
      : editorial.color.hairline2,
    ),
  };
}

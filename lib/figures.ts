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

/** Feature weights — the model's learned coefficients as signed, diverging bars
 *  (positive = data blue, negative = clay). Sorted biggest-first so the dominant
 *  signal reads at the top. Pure read of the model spec's coefficients; no synth. */
export function featureWeightsFigure(
  coefficients: Record<string, number>,
  labelFor: (key: string) => string,
): ChartSpec | null {
  const entries = Object.entries(coefficients).filter(([, v]) => typeof v === "number");
  if (entries.length === 0) return null;
  entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return {
    mark: "weights",
    data: entries.map(([k, v]) => ({ label: labelFor(k), value: +v.toFixed(3) })),
    x: "label",
    y: "value",
  };
}

/** The regime ribbon (M-J · J4) from the result's AUTHORED regime snapshot —
 *  which regime ruled each step over the eval window. Returns null if none. */
export function regimeFigure(spec: ResultSpec): ChartSpec | null {
  const s = spec.regimeSeries;
  if (!s || s.length === 0) return null;
  return {
    mark: "regime",
    data: s.map((p) => ({ t: p.t, state: p.state })),
    x: "t",
    y: "state",
    caption: "market regime over the eval window · authored snapshot",
  };
}

/** A feature-correlation heatmap (M-J · J4) from an AUTHORED correlation snapshot
 *  on the matrix spec. Long-format cells (row × col → value) for the heatmap mark;
 *  the diverging scale (clay↔paper↔data) centers at 0. Returns null if the spec
 *  carries no `corr` (then the matrix face simply shows no heatmap). */
export function correlationFigure(spec: unknown): ChartSpec | null {
  if (!spec || typeof spec !== "object") return null;
  const s = spec as { columns?: unknown; corr?: unknown };
  const cols = Array.isArray(s.columns) ? (s.columns as string[]) : null;
  const corr = Array.isArray(s.corr) ? (s.corr as number[][]) : null;
  if (!cols || !corr || corr.length !== cols.length) return null;
  const data = [];
  for (let i = 0; i < cols.length; i++) {
    for (let j = 0; j < cols.length; j++) {
      if (typeof corr[i]?.[j] !== "number") return null;
      data.push({ row: cols[i], col: cols[j], v: corr[i][j] });
    }
  }
  return {
    mark: "heatmap",
    data,
    x: "col",
    y: "row",
    caption: "feature correlation · authored snapshot · clay −1 · paper 0 · blue +1",
  };
}

/** The hero equity figure — the big, annotated chart the finding leads with.
 *  Merges the authored equity snapshot with the regime snapshot (same weekly
 *  dates) so the renderer can shade the regime under the curve; drawdown is
 *  derived. Annotations (peak / trough / end) are computed from this data by the
 *  renderer — nothing fabricated. */
export function resultHeroFigure(spec: ResultSpec): ChartSpec | null {
  const s = spec.equitySeries;
  if (!s || s.length === 0) return null;
  const regByT: Record<string, string> = {};
  for (const r of spec.regimeSeries ?? []) regByT[r.t] = r.state;
  let peak = -Infinity;
  const data = s.map((p) => {
    peak = Math.max(peak, p.equity);
    return { t: p.t, equity: p.equity, drawdown: +(p.equity - peak).toFixed(2), regime: regByT[p.t] ?? "" };
  });
  return {
    mark: "equity-hero",
    data,
    x: "t",
    y: ["equity", "drawdown"],
    caption: `cumulative return % · ${spec.evalWindow.start} → ${spec.evalWindow.end} · regime shaded · authored snapshot`,
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

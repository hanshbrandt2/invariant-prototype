import type { VariantGroup } from "@/lib/types";

/**
 * Variant groups (forks) for the crude-oil-research workspace — what was tried,
 * collapsed onto single nodes. A fork is just sibling artifacts sharing a
 * parent (immutable, content-addressed); the metrics here are deterministic
 * mock downstream-backtest numbers per knob value, so a sweep reads true.
 */

/** The typed knob a forkable operator exposes — the bounded degrees of freedom. */
export function knobForOp(op: string | undefined): { param: string; options: string[] } | undefined {
  if (op === "rolling_zscore") return { param: "window", options: ["10", "20", "30", "40", "60"] };
  if (op === "fit_model") return { param: "α", options: ["0.01", "0.05", "0.10", "0.20", "0.50", "1.00"] };
  if (op === "lead") return { param: "horizon", options: ["1m", "5m", "20m"] };
  return undefined;
}

/** The value currently on the spine, inferred from the node name. */
export function inferCurrent(name: string, param: string): string {
  if (param === "window") return name.match(/(\d+)\D*$/)?.[1] ?? "20";
  if (param === "horizon") return name.match(/(\d+m)\b/)?.[1] ?? "5m";
  if (param === "α") return "0.10";
  return "";
}

/** Deterministic downstream metrics for a knob value — unimodal, peaked at the
 *  value that "works", so the leaderboard has a real winner. Not real P&L. */
export function genMetrics(param: string, value: string): Record<string, number> {
  const num = parseFloat(value) || 0;
  let peak: number;
  if (param === "α") peak = Math.exp(-Math.pow(Math.log((num || 0.1) / 0.1), 2) / 1.4); // peak α≈0.1
  else if (param === "window") peak = Math.exp(-Math.pow((num - 22) / 20, 2)); // peak ~22
  else if (param === "horizon") peak = Math.exp(-Math.pow((num - 5) / 9, 2)); // peak ~5m
  else peak = 0.5;
  return {
    sharpe: +(0.88 + 0.56 * peak).toFixed(2),
    hit_rate: +(0.534 + 0.028 * peak).toFixed(3),
    max_drawdown: +(-(0.072 + 0.035 * (1 - peak))).toFixed(3),
    turnover: +(0.3 + 0.09 * (1 - peak)).toFixed(2),
  };
}

const members = (param: string, vals: string[]) => vals.map((v) => ({ value: v, metrics: genMetrics(param, v) }));

export const variantGroupsByWorkspace: Record<string, Record<string, VariantGroup>> = {
  "crude-oil-research": {
    "model:linreg_baseline:v1": {
      param: "α",
      knob: ["0.01", "0.05", "0.10", "0.20", "0.50", "1.00"],
      chosen: "0.10",
      members: members("α", ["0.01", "0.05", "0.10", "0.20", "0.30", "0.50", "0.70", "1.00", "1.50", "2.00"]),
      bestBy: "sharpe",
    },
    "feature:zscore_20:v2": {
      param: "window",
      knob: ["10", "20", "30", "40", "60"],
      chosen: "20",
      members: members("window", ["10", "20", "30", "40", "60"]),
      bestBy: "sharpe",
    },
    "target:fwd_ret_5m:v1": {
      param: "horizon",
      knob: ["1m", "5m", "20m"],
      chosen: "5m",
      members: members("horizon", ["1m", "5m", "20m"]),
      bestBy: "sharpe",
    },
  },
};

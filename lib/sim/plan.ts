import type { BuildStep } from "@/lib/types";

/**
 * The planner decomposes a natural-language request into a task DAG.
 * That decomposition IS the cost estimate (credits track work, not a flat
 * per-build charge). Pure heuristic over the fixture datasets/operators —
 * everything is mock, but the operators named are all real.
 */

export interface BuildPlan {
  datasetId: string;
  datasetLabel: string;
  horizonYears: number;
  profileOnly: boolean;
  steps: BuildStep[];
}

const DATASET_LABEL: Record<string, string> = {
  crude_oil_1m: "WTI Crude Oil",
  ng_henry_hub_1m: "Henry Hub Natural Gas",
  "nasdaq-large-cap": "Nasdaq large-cap",
  fx_majors_1m: "FX majors",
};

function detectDataset(p: string): string {
  const s = p.toLowerCase();
  if (/(gas|henry hub|ng)\b/.test(s)) return "ng_henry_hub_1m";
  if (/(equit|stock|s&p|sp ?500|nasdaq|momentum)/.test(s)) return "nasdaq-large-cap";
  if (/(fx|currenc|euro|forex|majors)/.test(s)) return "fx_majors_1m";
  return "crude_oil_1m";
}

function detectHorizon(p: string): number {
  const s = p.toLowerCase();
  if (/(decade|10[ -]?year|ten[ -]?year)/.test(s)) return 10;
  const m = s.match(/(\d+)\s*year/);
  if (m) return Math.min(20, Math.max(1, parseInt(m[1], 10)));
  return 1;
}

const step = (id: string, label: string, op: string, credits: number): BuildStep => ({ id, label, op, credits });

export function planBuild(prompt: string, datasetId?: string): BuildPlan {
  const s = prompt.toLowerCase();
  const ds = datasetId ?? detectDataset(prompt);
  const horizonYears = detectHorizon(prompt);
  const datasetLabel = DATASET_LABEL[ds] ?? ds;

  const profileOnly = /(what'?s in|profile|describe|overview|summar|preview|columns)/.test(s) &&
    !/(backtest|signal|strateg|anomal|vol|garch|coint|rank|momentum)/.test(s);

  const steps: BuildStep[] = [
    step("load", `load ${datasetLabel}`, "eligible_at", 0.5),
    step("profile", "profile the data", "aggregate", 0.5),
  ];

  if (profileOnly) return { datasetId: ds, datasetLabel, horizonYears, profileOnly: true, steps };

  const heavy = (c: number) => +(c * horizonYears).toFixed(1);

  if (/(anomal|outlier)/.test(s)) {
    steps.push(
      step("ret", "compute log returns", "derive_column", 0.8),
      step("z", "rolling z-score", "rolling_zscore", 1.0),
      step("flag", "flag outliers", "attach_outlier_count", 0.8)
    );
  } else if (/(garch|volatil|vol\b)/.test(s)) {
    steps.push(
      step("stitch", "stitch front-month continuous", "stitch_contracts", 0.8),
      step("garch", "estimate GARCH volatility", "garch_volatility", heavy(1.6))
    );
  } else if (/(coint|pair)/.test(s)) {
    steps.push(
      step("scan", "scan for cointegration", "coint_test", heavy(1.6)),
      step("spread", "build the spread", "coint_spread", 1.0)
    );
  } else if (/(momentum|rank)/.test(s) && !/(backtest|long|short|strateg)/.test(s)) {
    steps.push(
      step("ret", "12-month return", "derive_column", 0.8),
      step("rank", "cross-sectional rank", "rank", 1.0)
    );
  } else {
    // a strategy/backtest
    const signalOp = /(momentum|rank)/.test(s) ? "rank" : "rolling_zscore";
    steps.push(
      step("ret", "compute returns", "derive_column", 0.8),
      step("sig", "build the signal", signalOp, 1.0),
      step("matrix", "assemble signal matrix", "join_feature", 1.0),
      step("target", "forward-return target", "lead", 0.8),
      step("splits", "walk-forward splits", "generate_time_splits", 0.6),
      step("fit", "fit the model", "fit_model", heavy(1.4)),
      step("pos", "derive positions", "derive_position", 0.8),
      step("bt", "run the backtest", "evaluate_strategy", heavy(1.4))
    );
  }

  return { datasetId: ds, datasetLabel, horizonYears, profileOnly: false, steps };
}

export function planCredits(plan: BuildPlan): number {
  return +plan.steps.reduce((a, s) => a + s.credits, 0).toFixed(1);
}

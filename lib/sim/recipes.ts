import type { BuildStep, LineageEdge, Node, NodeKind, ResultSpec } from "@/lib/types";

/**
 * Curated, operator-honest build recipes. The planner routes a request to one
 * of these by intent x dataset, and each step carries the REAL node + edges it
 * materialises — so the canvas accretes node-by-node and the Code/Concepts/
 * Graph lenses read a live, growing graph.
 *
 * HONESTY BAR: every operator named here is in the confirmed registry set
 * (stitch_contracts, derive_column, rolling_zscore, coint_spread, join_feature,
 * lead, fit_model, evaluate_strategy — see memory platform-capability-ground-
 * truth). Node ids are symbol-prefixed (cl_/ng_/eq_/fx_) so an FX request
 * never lands the crude result. Policies attach only where a real instance
 * exists (CL roll, top-decile position sizing).
 */

export type Intent =
  | "profile"
  | "mean_reversion"
  | "anomaly"
  | "momentum_backtest"
  | "spread_carry"
  | "volatility"
  | "generic";

interface DatasetMeta {
  sym: string;
  label: string;
  futures: boolean; // does a roll/stitch step apply?
  rollPolicy?: string; // real policy instance id, only where one exists
  evalWindow: { start: string; end: string };
}

const DATASETS: Record<string, DatasetMeta> = {
  crude_oil_1m: { sym: "cl", label: "WTI Crude Oil", futures: true, rollPolicy: "policy:roll_stitch_cl_calendar_panama:1", evalWindow: { start: "2024-01-02", end: "2024-12-31" } },
  ng_henry_hub_1m: { sym: "ng", label: "Henry Hub Natural Gas", futures: true, evalWindow: { start: "2024-01-02", end: "2024-12-31" } },
  "nasdaq-large-cap": { sym: "eq", label: "Nasdaq large-cap", futures: false, evalWindow: { start: "2014-01-02", end: "2024-12-31" } },
  fx_majors_1m: { sym: "fx", label: "FX majors", futures: true, evalWindow: { start: "2024-01-02", end: "2024-12-31" } },
};

const POSITION_SIZING = "policy:position_sizing_top_decile_long_short:1";

export function datasetMeta(datasetId: string): DatasetMeta {
  return DATASETS[datasetId] ?? { sym: datasetId.slice(0, 2), label: datasetId, futures: false, evalWindow: { start: "2024-01-02", end: "2024-12-31" } };
}

// Bigger datasets cost more to scan — a gentle, bucketed multiplier on the
// estimate. Crude (≈3.8M rows) is the 1.0 baseline so its numbers are unchanged.
const DATASET_ROWS: Record<string, number> = {
  crude_oil_1m: 3_812_400,
  ng_henry_hub_1m: 3_640_000,
  "nasdaq-large-cap": 12_900_000,
  fx_majors_1m: 5_200_000,
};
export function volumeFactor(datasetId: string): number {
  const rows = DATASET_ROWS[datasetId] ?? 2_000_000;
  if (rows >= 10_000_000) return 1.4;
  if (rows >= 4_000_000) return 1.15;
  if (rows >= 1_500_000) return 1.0;
  return 0.85;
}

/* ── detection ─────────────────────────────────────────────────────────── */

export function detectDataset(p: string): string {
  const s = p.toLowerCase();
  if (/(gas|henry hub|\bng\b)/.test(s)) return "ng_henry_hub_1m";
  if (/(equit|stock|s&p|sp ?500|nasdaq|large.?cap|momentum)/.test(s)) return "nasdaq-large-cap";
  if (/(\bfx\b|currenc|euro|forex|majors|carry across)/.test(s)) return "fx_majors_1m";
  return "crude_oil_1m";
}

export function detectIntent(p: string, datasetId: string): Intent {
  const s = p.toLowerCase();
  if (/(what'?s in|profile|describe|overview|summar|preview|columns|load|start with)/.test(s) && !/(backtest|signal|strateg|anomal|vol|coint|rank|momentum|revers|carry|spread)/.test(s)) return "profile";
  if (/(anomal|outlier|spike)/.test(s)) return "anomaly";
  if (/(carry|spread|coint|pair|relative value)/.test(s)) return "spread_carry";
  if (/(vol(atility)?|garch|stdev|realized vol)/.test(s)) return "volatility";
  if (/(momentum|long.?short|top \d+|decile)/.test(s)) return "momentum_backtest";
  if (/(mean.?revers|revert|z.?score)/.test(s)) return "mean_reversion";
  if (/(backtest|signal|strateg)/.test(s)) return datasetId === "nasdaq-large-cap" ? "momentum_backtest" : "mean_reversion";
  return datasetId === "nasdaq-large-cap" ? "momentum_backtest" : "mean_reversion";
}

export function detectHorizon(p: string): number {
  const s = p.toLowerCase();
  if (/(decade|10[ -]?year|ten[ -]?year)/.test(s)) return 10;
  const m = s.match(/(\d+)\s*year/);
  if (m) return Math.min(20, Math.max(1, parseInt(m[1], 10)));
  return 1;
}

/* ── builders ──────────────────────────────────────────────────────────── */

function node(kind: NodeKind, name: string, extra: Partial<Node> = {}): Node {
  return {
    id: `${kind}:${name}:v1`,
    source: kind === "dataset" ? "data-catalog" : "artifact-catalog",
    kind,
    name,
    version: "v1",
    state: "live",
    ...extra,
  };
}

interface StepInit {
  id: string;
  label: string;
  op?: string;
  credits: number;
  node: Node;
  nodeLabel: string;
  parents: string[];
  edgeKind: LineageEdge["kind"];
  resultSpec?: ResultSpec;
}

function step(s: StepInit): BuildStep {
  const edges: LineageEdge[] = s.parents.map((p) => ({ childId: s.node.id, parentId: p, kind: s.edgeKind }));
  return { id: s.id, label: s.label, op: s.op, credits: s.credits, node: s.node, edges, nodeLabel: s.nodeLabel, resultSpec: s.resultSpec };
}

function datasetStep(datasetId: string, m: DatasetMeta): BuildStep {
  const n = node("dataset", datasetId, { pitConstruction: "point_in_time", contentHash: "sha256:7f3c…a1d2" });
  return { id: "load", label: `load ${m.label}`, credits: 0.5, node: n, edges: [], nodeLabel: m.label };
}

function mkResultSpec(
  friendly: string,
  m: DatasetMeta,
  metrics: Record<string, number>,
  lineageRefs: string[],
  nextProposal: ResultSpec["nextProposal"],
  invariant: string
): ResultSpec {
  return { friendlyName: friendly, intendedInvariant: invariant, evalWindow: m.evalWindow, metrics, lineageRefs, nextProposal };
}

const NO_LOOKAHEAD =
  "Entry and exit are decided only from information available at the bar; the forward-return target is shifted strictly into the future, so the backtest carries no lookahead.";

/* Each recipe returns the FULL ordered step list (load first). The planner
   drops steps whose node already exists, so continuing the conversation
   accretes onto the same graph rather than rebuilding. */
function recipe(intent: Intent, datasetId: string, horizonYears: number): BuildStep[] {
  const m = datasetMeta(datasetId);
  const { sym } = m;
  const dsId = `dataset:${datasetId}:v1`;
  const heavy = (c: number) => +(c * horizonYears).toFixed(1);
  const steps: BuildStep[] = [datasetStep(datasetId, m)];

  // a roll/stitch base feature, where futures roll applies
  let base = dsId;
  const stitchStep = () => {
    const stitchSpec = { operator: "stitch_contracts", roll: "calendar", adjust: "panama", input: dsId };
    const n = node("feature", `${sym}_front_cont`, m.rollPolicy ? { policyRefs: [m.rollPolicy], lineageHash: "sha256:21b8…6d04", spec: stitchSpec } : { lineageHash: "sha256:21b8…6d04", spec: stitchSpec });
    base = n.id;
    return step({ id: "stitch", label: "stitch front-month continuous", op: "stitch_contracts", credits: 0.8, node: n, nodeLabel: "Front-month continuous", parents: [dsId], edgeKind: "stitch_source" });
  };

  if (intent === "profile") return steps;

  if (intent === "mean_reversion") {
    if (m.futures) steps.push(stitchStep());
    const ret = node("feature", `${sym}_ret`, { spec: { operator: "derive_column", expr: "log(close) − log(close.shift(1))", input: base } });
    const z = node("feature", `${sym}_z20`, { spec: { operator: "rolling_zscore", window: 20, input: `feature:${sym}_ret:v1` } });
    const mtx = node("matrix", `${sym}_signal`, { spec: { operator: "join_feature", columns: [`${sym}_z20`], index: "ts_event" } });
    const tgt = node("target", `${sym}_fwd5`, { spec: { operator: "lead", horizon: "5m", input: `feature:${sym}_ret:v1` } });
    const mdl = node("model", `${sym}_ridge`, { lineageHash: "sha256:e2b9…1c6a", spec: { kind: "ridge", alpha: 0.1, features: `matrix:${sym}_signal:v1`, target: `target:${sym}_fwd5:v1` } });
    const res = node("result", `${sym}_meanrev`, { policyRefs: [POSITION_SIZING], lineageHash: "sha256:21b8…6d04", contentHash: "sha256:9f3c…a17e" });
    steps.push(
      step({ id: "ret", label: "compute log returns", op: "derive_column", credits: 0.8, node: ret, nodeLabel: "Log returns", parents: [base], edgeKind: "input_dependency" }),
      step({ id: "z", label: "20-bar z-score", op: "rolling_zscore", credits: 1.0, node: z, nodeLabel: "Z-score · 20", parents: [ret.id], edgeKind: "input_dependency" }),
      step({ id: "matrix", label: "assemble signal matrix", op: "join_feature", credits: 1.0, node: mtx, nodeLabel: "Signal matrix", parents: [z.id], edgeKind: "input_dependency" }),
      step({ id: "target", label: "forward-return target", op: "lead", credits: 0.8, node: tgt, nodeLabel: "Forward return · 5m", parents: [ret.id], edgeKind: "input_dependency" }),
      step({ id: "fit", label: "fit ridge baseline (α=0.1)", op: "fit_model", credits: heavy(1.4), node: mdl, nodeLabel: "Ridge baseline · α=0.1", parents: [mtx.id, tgt.id], edgeKind: "training_data" }),
      step({
        id: "bt", label: "evaluate strategy", op: "evaluate_strategy", credits: heavy(1.4), node: res, nodeLabel: "Backtest · mean-rev",
        parents: [mdl.id], edgeKind: "input_model",
        resultSpec: mkResultSpec(`${m.label} mean-reversion`, m, { sharpe: 1.42, hit_rate: 0.561, max_drawdown: -0.083, turnover: 0.34, ann_return: 0.187 }, [mtx.id, mdl.id, tgt.id], { kind: "feature_modification", summary: "Widen the z-score window from 20 to 30 bars — the edge concentrates in slower reversion, and turnover drops." }, NO_LOOKAHEAD),
      })
    );
    return steps;
  }

  if (intent === "anomaly") {
    if (m.futures) steps.push(stitchStep());
    const ret = node("feature", `${sym}_ret`, { spec: { operator: "derive_column", expr: "log(close) − log(close.shift(1))", input: base } });
    const z = node("feature", `${sym}_z40`, { spec: { operator: "rolling_zscore", window: 40, input: `feature:${sym}_ret:v1` } });
    const res = node("result", `${sym}_anomalies`, { lineageHash: "sha256:3c7e…91ab" });
    steps.push(
      step({ id: "ret", label: "compute log returns", op: "derive_column", credits: 0.8, node: ret, nodeLabel: "Log returns", parents: [base], edgeKind: "input_dependency" }),
      step({ id: "z", label: "40-bar z-score", op: "rolling_zscore", credits: 1.0, node: z, nodeLabel: "Z-score · 40", parents: [ret.id], edgeKind: "input_dependency" }),
      step({
        id: "flag", label: "flag outliers (|z| > 3)", op: "rolling_zscore", credits: 0.8, node: res, nodeLabel: "Anomaly scan",
        parents: [z.id], edgeKind: "input_model",
        resultSpec: mkResultSpec(`${m.label} anomaly scan`, m, { flagged: 27, max_z: 4.81, share_pct: 0.6 }, [z.id], { kind: "none", reason: "Outliers are a diagnostic, not a tradeable signal on their own." }, "An observation is flagged when its rolling z-score exceeds 3 in absolute value, computed only from a trailing window — no future bars enter the statistic."),
      })
    );
    return steps;
  }

  if (intent === "momentum_backtest") {
    const mom = node("feature", `${sym}_mom12`, { spec: { operator: "derive_column", expr: "close / close.shift(252) − 1", input: dsId } });
    const rank = node("matrix", `${sym}_mom_rank`, { spec: { operator: "join_feature", rank: "decile", on: `${sym}_mom12` } });
    const tgt = node("target", `${sym}_fwd1m`, { spec: { operator: "lead", horizon: "1m", input: `feature:${sym}_mom12:v1` } });
    const mdl = node("model", `${sym}_ls_decile`, { spec: { kind: "long_short_decile", long: 10, short: 1, features: `matrix:${sym}_mom_rank:v1`, target: `target:${sym}_fwd1m:v1` } });
    const res = node("result", `${sym}_momentum_bt`, { policyRefs: [POSITION_SIZING] });
    steps.push(
      step({ id: "mom", label: "12-month return", op: "derive_column", credits: 0.8, node: mom, nodeLabel: "Momentum · 12m", parents: [dsId], edgeKind: "input_dependency" }),
      step({ id: "rank", label: "rank into deciles", op: "join_feature", credits: 1.0, node: rank, nodeLabel: "Decile rank", parents: [mom.id], edgeKind: "input_dependency" }),
      step({ id: "target", label: "forward-return target", op: "lead", credits: 0.8, node: tgt, nodeLabel: "Forward return · 1m", parents: [mom.id], edgeKind: "input_dependency" }),
      step({ id: "fit", label: "fit long/short decile", op: "fit_model", credits: heavy(1.4), node: mdl, nodeLabel: "L/S decile", parents: [rank.id, tgt.id], edgeKind: "training_data" }),
      step({
        id: "bt", label: "evaluate strategy", op: "evaluate_strategy", credits: heavy(1.6), node: res, nodeLabel: "Backtest · momentum",
        parents: [mdl.id], edgeKind: "input_model",
        resultSpec: mkResultSpec(`${m.label} long/short momentum`, m, { sharpe: 0.94, hit_rate: 0.534, max_drawdown: -0.146, turnover: 0.12, ann_return: 0.112 }, [rank.id, mdl.id, tgt.id], { kind: "universe_change", summary: "Restrict the universe to the top 500 by dollar volume — the small-cap decile drives most of the drawdown." }, NO_LOOKAHEAD),
      })
    );
    return steps;
  }

  if (intent === "spread_carry") {
    const spread = node("feature", `${sym}_spread`, { spec: { operator: "coint_spread", expr: "a − β·b", beta: "cointegrating_regression", input: dsId } });
    const z = node("feature", `${sym}_spread_z`, { spec: { operator: "rolling_zscore", window: 20, input: `feature:${sym}_spread:v1` } });
    const tgt = node("target", `${sym}_spread_fwd`, { spec: { operator: "lead", horizon: "5m", input: `feature:${sym}_spread:v1` } });
    const mdl = node("model", `${sym}_carry`, { spec: { kind: "ols", features: `feature:${sym}_spread_z:v1`, target: `target:${sym}_spread_fwd:v1` } });
    const res = node("result", `${sym}_carry_bt`, { policyRefs: [POSITION_SIZING] });
    steps.push(
      step({ id: "spread", label: "build the spread", op: "coint_spread", credits: 1.0, node: spread, nodeLabel: "Spread", parents: [dsId], edgeKind: "input_dependency" }),
      step({ id: "z", label: "z-score the spread", op: "rolling_zscore", credits: 1.0, node: z, nodeLabel: "Spread z-score", parents: [spread.id], edgeKind: "input_dependency" }),
      step({ id: "target", label: "forward-return target", op: "lead", credits: 0.8, node: tgt, nodeLabel: "Forward return", parents: [spread.id], edgeKind: "input_dependency" }),
      step({ id: "fit", label: "fit the carry model", op: "fit_model", credits: heavy(1.4), node: mdl, nodeLabel: "Carry model", parents: [z.id, tgt.id], edgeKind: "training_data" }),
      step({
        id: "bt", label: "evaluate strategy", op: "evaluate_strategy", credits: heavy(1.4), node: res, nodeLabel: "Backtest · carry",
        parents: [mdl.id], edgeKind: "input_model",
        resultSpec: mkResultSpec(`${m.label} carry / spread`, m, { sharpe: 1.08, hit_rate: 0.547, max_drawdown: -0.097, turnover: 0.21, ann_return: 0.131 }, [z.id, mdl.id, tgt.id], { kind: "feature_modification", summary: "Add a second leg to the spread — a two-name basket halves the idiosyncratic risk." }, NO_LOOKAHEAD),
      })
    );
    return steps;
  }

  if (intent === "volatility") {
    if (m.futures) steps.push(stitchStep());
    const ret = node("feature", `${sym}_ret`, { spec: { operator: "derive_column", expr: "log(close) − log(close.shift(1))", input: base } });
    const vol = node("feature", `${sym}_vol20`, { spec: { operator: "derive_column", expr: "rolling_std(returns, 20) · √periods", window: 20, input: `feature:${sym}_ret:v1` } });
    const res = node("result", `${sym}_vol`);
    steps.push(
      step({ id: "ret", label: "compute log returns", op: "derive_column", credits: 0.8, node: ret, nodeLabel: "Log returns", parents: [base], edgeKind: "input_dependency" }),
      step({ id: "vol", label: "rolling realized volatility (20)", op: "derive_column", credits: 1.0, node: vol, nodeLabel: "Realized vol · 20", parents: [ret.id], edgeKind: "input_dependency" }),
      step({
        id: "view", label: "build the volatility view", op: "rolling_zscore", credits: 0.8, node: res, nodeLabel: "Volatility view",
        parents: [vol.id], edgeKind: "input_model",
        resultSpec: mkResultSpec(`${m.label} realized-volatility view`, m, { ann_vol: 0.382, vol_of_vol: 0.91, max_20d: 0.64 }, [vol.id], { kind: "none", reason: "A descriptive view; pair it with a signal before trading it." }, "Volatility is the trailing standard deviation of log returns over a fixed window — computed only from past bars, so it is observable at each point in time."),
      })
    );
    return steps;
  }

  // generic fallback
  const feat = node("feature", `${sym}_feature`, { spec: { operator: "derive_column", input: dsId } });
  const res = node("result", `${sym}_result`, { policyRefs: [POSITION_SIZING] });
  steps.push(
    step({ id: "feat", label: "derive a feature", op: "derive_column", credits: 0.8, node: feat, nodeLabel: "Derived feature", parents: [dsId], edgeKind: "input_dependency" }),
    step({
      id: "eval", label: "evaluate strategy", op: "evaluate_strategy", credits: heavy(1.2), node: res, nodeLabel: "Result",
      parents: [feat.id], edgeKind: "input_model",
      resultSpec: mkResultSpec(`${m.label} analysis`, m, { sharpe: 0.8, hit_rate: 0.51, max_drawdown: -0.12 }, [feat.id], { kind: "none", reason: "A first pass — refine the signal to sharpen the edge." }, NO_LOOKAHEAD),
    })
  );
  return steps;
}

export function buildRecipe(intent: Intent, datasetId: string, horizonYears: number): BuildStep[] {
  return recipe(intent, datasetId, horizonYears);
}

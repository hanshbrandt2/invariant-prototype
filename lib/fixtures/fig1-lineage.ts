import type { LineageSubgraph, Node, LineageEdge } from "@/lib/types";

/**
 * The crude-oil-research lineage — the workspace graph, also shown as the
 * landing Fig 1 and the dashboard card thumbnail.
 *
 * HONEST BY CONSTRUCTION. Every node, edge, and policy maps to a verified
 * real capability (memory `platform-capability-ground-truth`):
 *  - datasets: CL (WTI), NG (Henry Hub)
 *  - operators: stitch_contracts, derive_column, rolling_zscore, coint_spread,
 *    join_feature, lead, fit_model, evaluate_strategy
 *  - policies: roll_stitch_cl_calendar_panama, position_sizing_top_decile_long_short
 *
 * Shaped to the real Node + LineageEdge contracts so it swaps for a live
 * lineage export with no rework.
 */

const nodes: Node[] = [
  { id: "dataset:crude_oil_1m", source: "data-catalog", kind: "dataset", name: "crude_oil_1m", state: "live", pitConstruction: "point_in_time", contentHash: "sha256:7f3c…a1d2", owner: "data-platform", createdAt: "2024-01-08T09:12:00Z", asOfKnowledgeTime: "2024-12-31T00:00:00Z", description: "WTI front-month futures, 1-minute bars, point-in-time." },
  { id: "dataset:nat_gas_1m", source: "data-catalog", kind: "dataset", name: "nat_gas_1m", state: "live", pitConstruction: "point_in_time", contentHash: "sha256:b08e…44c1", owner: "data-platform", createdAt: "2024-01-08T09:14:00Z", asOfKnowledgeTime: "2024-12-31T00:00:00Z", description: "Henry Hub natural-gas futures, 1-minute bars, point-in-time." },

  { id: "feature:front_month_cont:v1", source: "artifact-catalog", kind: "feature", name: "front_month_cont", version: "v1", state: "live", policyRefs: ["policy:roll_stitch_cl_calendar_panama:1"], lineageHash: "sha256:21b8…6d04", producerCodeHash: "git:4a9f2c1", owner: "h.brandt", createdAt: "2024-06-03T14:20:00Z", spec: { operator: "stitch_contracts", roll: "calendar", adjust: "panama", input: "crude_oil_1m" } },
  { id: "feature:front_month_ret:v1", source: "artifact-catalog", kind: "feature", name: "front_month_ret", version: "v1", state: "live", lineageHash: "sha256:9ad1…02ff", producerCodeHash: "git:7c1d88e", owner: "h.brandt", createdAt: "2024-06-03T14:31:00Z", spec: { operator: "derive_column", expr: "log(close) - log(close.shift(1))", input: "front_month_cont" } },
  { id: "feature:zscore_20:v2", source: "artifact-catalog", kind: "feature", name: "zscore_20", version: "v2", state: "live", lineageHash: "sha256:3c7e…91ab", producerCodeHash: "git:b2044af", owner: "h.brandt", createdAt: "2024-06-12T10:05:00Z", description: "Revised from v1: window widened 14→20 after the turnover review.", spec: { operator: "rolling_zscore", window: 20, input: "front_month_ret" } },
  { id: "feature:gas_z20:v1", source: "artifact-catalog", kind: "feature", name: "gas_z20", version: "v1", state: "live", lineageHash: "sha256:c41a…8b27", producerCodeHash: "git:b2044af", owner: "h.brandt", createdAt: "2024-06-10T16:40:00Z", spec: { operator: "rolling_zscore", window: 20, input: "nat_gas_1m" } },
  { id: "feature:spread_5d:v1", source: "artifact-catalog", kind: "feature", name: "spread_5d", version: "v1", state: "live", lineageHash: "sha256:7d52…3f90", producerCodeHash: "git:e90c513", owner: "h.brandt", createdAt: "2024-06-11T11:22:00Z", spec: { operator: "coint_spread", lookback: 60, inputs: ["front_month_cont", "nat_gas_1m"] } },

  { id: "matrix:signal_matrix_v3:v3", source: "artifact-catalog", kind: "matrix", name: "signal_matrix_v3", version: "v3", state: "live", lineageHash: "sha256:55a0…7e3b", producerCodeHash: "git:1f7b620", owner: "h.brandt", createdAt: "2024-06-14T09:48:00Z", asOfKnowledgeTime: "2024-06-28T00:00:00Z", spec: { operator: "join_feature", align: "asof", columns: ["zscore_20", "gas_z20", "spread_5d"], corr: [[1, 0.31, 0.58], [0.31, 1, -0.12], [0.58, -0.12, 1]] } },
  { id: "target:fwd_ret_5m:v1", source: "artifact-catalog", kind: "target", name: "fwd_ret_5m", version: "v1", state: "live", lineageHash: "sha256:0e8f…a6c3", producerCodeHash: "git:7c1d88e", owner: "h.brandt", createdAt: "2024-06-14T09:50:00Z", asOfKnowledgeTime: "2024-06-28T00:00:00Z", spec: { operator: "lead", periods: 5, unit: "5m", input: "front_month_ret" } },
  { id: "model:linreg_baseline:v1", source: "artifact-catalog", kind: "model", name: "linreg_baseline", version: "v1", state: "live", lineageHash: "sha256:e2b9…1c6a", producerCodeHash: "git:9d3e0a4", owner: "h.brandt", createdAt: "2024-06-17T13:02:00Z", asOfKnowledgeTime: "2024-06-28T00:00:00Z", spec: { kind: "ridge", alpha: 0.1, features: "signal_matrix_v3", target: "fwd_ret_5m", coefficients: { zscore_20: 0.42, gas_z20: -0.18, spread_5d: 0.09 } } },

  { id: "result:bt_2024_06_meanrev:v1", source: "artifact-catalog", kind: "result", name: "bt_2024_06_meanrev", version: "v1", state: "live", policyRefs: ["policy:position_sizing_top_decile_long_short:1"], lineageHash: "sha256:21b8…6d04", contentHash: "sha256:9f3c…a17e", producerCodeHash: "git:c55d172", owner: "h.brandt", createdAt: "2024-06-28T17:45:00Z", asOfKnowledgeTime: "2024-06-28T00:00:00Z", spec: { operator: "evaluate_strategy", policy: "position_sizing_top_decile_long_short", evalWindow: "2024-01-02 .. 2024-06-28" } },

  { id: "policy:roll_stitch_cl_calendar_panama:1", source: "artifact-catalog", kind: "policy", name: "roll_stitch_cl_calendar_panama", version: "1", state: "live", owner: "platform-risk", createdAt: "2023-11-20T00:00:00Z", spec: { policyClass: "roll_stitch_policy", intendedInvariant: "Front-month futures roll on the exchange calendar and back-adjust (Panama), so the continuous series carries no artificial gap at the roll.", scopeOfApplicability: ["CL front-month continuous"], reviewStatus: "approved", author: "platform" } },
  { id: "policy:position_sizing_top_decile_long_short:1", source: "artifact-catalog", kind: "policy", name: "position_sizing_top_decile_long_short", version: "1", state: "live", owner: "platform-risk", createdAt: "2024-02-15T00:00:00Z", spec: { policyClass: "position_sizing", intendedInvariant: "Positions are long the top decile and short the bottom decile of the signal, dollar-neutral, so the book carries no net directional exposure.", scopeOfApplicability: ["cross-sectional long/short books"], reviewStatus: "approved", author: "platform" } },
];

const edges: LineageEdge[] = [
  { childId: "feature:front_month_cont:v1", parentId: "dataset:crude_oil_1m", kind: "stitch_source" },
  { childId: "feature:front_month_ret:v1", parentId: "feature:front_month_cont:v1", kind: "input_dependency" },
  { childId: "feature:zscore_20:v2", parentId: "feature:front_month_ret:v1", kind: "input_dependency" },
  { childId: "feature:gas_z20:v1", parentId: "dataset:nat_gas_1m", kind: "input_dependency" },
  { childId: "feature:spread_5d:v1", parentId: "feature:front_month_cont:v1", kind: "input_dependency" },
  { childId: "feature:spread_5d:v1", parentId: "dataset:nat_gas_1m", kind: "input_dependency" },
  { childId: "matrix:signal_matrix_v3:v3", parentId: "feature:zscore_20:v2", kind: "input_dependency" },
  { childId: "matrix:signal_matrix_v3:v3", parentId: "feature:gas_z20:v1", kind: "input_dependency" },
  { childId: "matrix:signal_matrix_v3:v3", parentId: "feature:spread_5d:v1", kind: "input_dependency" },
  { childId: "target:fwd_ret_5m:v1", parentId: "feature:front_month_ret:v1", kind: "input_dependency" },
  { childId: "model:linreg_baseline:v1", parentId: "matrix:signal_matrix_v3:v3", kind: "training_data" },
  { childId: "model:linreg_baseline:v1", parentId: "target:fwd_ret_5m:v1", kind: "training_data" },
  { childId: "result:bt_2024_06_meanrev:v1", parentId: "model:linreg_baseline:v1", kind: "input_model" },
];

export const fig1Lineage: LineageSubgraph = { nodes, edges };

/** Presentational sidecars (NOT contract data) — human labels + the real
 *  operator that produced each node. Kept out of Node so the contract stays
 *  pure; passed to ResearchGraph as optional props. */
export const crudeOilLabels: Record<string, string> = {
  "dataset:crude_oil_1m": "WTI Crude Oil · 1m",
  "dataset:nat_gas_1m": "Henry Hub Gas · 1m",
  "feature:front_month_cont:v1": "Front-month continuous",
  "feature:front_month_ret:v1": "Log returns",
  "feature:zscore_20:v2": "Z-score · 20",
  "feature:gas_z20:v1": "Gas z-score · 20",
  "feature:spread_5d:v1": "Crude–gas spread",
  "matrix:signal_matrix_v3:v3": "Signal matrix",
  "target:fwd_ret_5m:v1": "Forward return · 5m",
  "model:linreg_baseline:v1": "Ridge baseline · α=0.1",
  "result:bt_2024_06_meanrev:v1": "Backtest · mean-rev",
  "policy:roll_stitch_cl_calendar_panama:1": "Roll & stitch",
  "policy:position_sizing_top_decile_long_short:1": "Position sizing",
};

export const crudeOilProducerOps: Record<string, string> = {
  "feature:front_month_cont:v1": "stitch_contracts",
  "feature:front_month_ret:v1": "derive_column",
  "feature:zscore_20:v2": "rolling_zscore",
  "feature:gas_z20:v1": "rolling_zscore",
  "feature:spread_5d:v1": "coint_spread",
  "matrix:signal_matrix_v3:v3": "join_feature",
  "target:fwd_ret_5m:v1": "lead",
  "model:linreg_baseline:v1": "fit_model",
  "result:bt_2024_06_meanrev:v1": "evaluate_strategy",
};

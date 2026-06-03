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
  { id: "dataset:crude_oil_1m", source: "data-catalog", kind: "dataset", name: "crude_oil_1m", state: "live", pitConstruction: "point_in_time", contentHash: "sha256:7f3c…a1d2" },
  { id: "dataset:nat_gas_1m", source: "data-catalog", kind: "dataset", name: "nat_gas_1m", state: "live", pitConstruction: "point_in_time", contentHash: "sha256:b08e…44c1" },

  { id: "feature:front_month_cont:v1", source: "artifact-catalog", kind: "feature", name: "front_month_cont", version: "v1", state: "live", policyRefs: ["policy:roll_stitch_cl_calendar_panama:1"], lineageHash: "sha256:21b8…6d04" },
  { id: "feature:front_month_ret:v1", source: "artifact-catalog", kind: "feature", name: "front_month_ret", version: "v1", state: "live", lineageHash: "sha256:9ad1…02ff" },
  { id: "feature:zscore_20:v2", source: "artifact-catalog", kind: "feature", name: "zscore_20", version: "v2", state: "live", lineageHash: "sha256:3c7e…91ab" },
  { id: "feature:gas_z20:v1", source: "artifact-catalog", kind: "feature", name: "gas_z20", version: "v1", state: "live" },
  { id: "feature:spread_5d:v1", source: "artifact-catalog", kind: "feature", name: "spread_5d", version: "v1", state: "live" },

  { id: "matrix:signal_matrix_v3:v3", source: "artifact-catalog", kind: "matrix", name: "signal_matrix_v3", version: "v3", state: "live", lineageHash: "sha256:55a0…7e3b" },
  { id: "target:fwd_ret_5m:v1", source: "artifact-catalog", kind: "target", name: "fwd_ret_5m", version: "v1", state: "live" },
  { id: "model:linreg_baseline:v1", source: "artifact-catalog", kind: "model", name: "linreg_baseline", version: "v1", state: "live", lineageHash: "sha256:e2b9…1c6a" },

  { id: "result:bt_2024_06_meanrev:v1", source: "artifact-catalog", kind: "result", name: "bt_2024_06_meanrev", version: "v1", state: "live", policyRefs: ["policy:position_sizing_top_decile_long_short:1"], lineageHash: "sha256:21b8…6d04", contentHash: "sha256:9f3c…a17e" },

  { id: "policy:roll_stitch_cl_calendar_panama:1", source: "artifact-catalog", kind: "policy", name: "roll_stitch_cl_calendar_panama", version: "1", state: "live" },
  { id: "policy:position_sizing_top_decile_long_short:1", source: "artifact-catalog", kind: "policy", name: "position_sizing_top_decile_long_short", version: "1", state: "live" },
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

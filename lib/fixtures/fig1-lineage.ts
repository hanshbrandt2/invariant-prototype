import type { LineageSubgraph, Node, LineageEdge } from "@/lib/types";

/**
 * The landing "Fig 1" lineage — a crude-oil mean-reversion research graph.
 *
 * HONEST BY CONSTRUCTION. Every node, edge, and policy maps to a verified
 * real capability (see memory `platform-capability-ground-truth`):
 *  - datasets are real seeded products: CL (WTI), NG (Henry Hub), HO (ULSD)
 *  - edges are produced by real operators: stitch_contracts, rolling_zscore,
 *    join_feature, lead, fit_model, evaluate_strategy
 *  - policies are real seeded instances: roll_stitch_cl_calendar_panama,
 *    position_sizing_top_decile_long_short
 *
 * Shaped to the real Node + LineageEdge contracts so it can be swapped for a
 * live `crude-oil-research` lineage export with no rework.
 */

const nodes: Node[] = [
  // ── datasets (data-catalog products) ─────────────────────────────
  { id: "dataset:crude_oil_1m", source: "data-catalog", kind: "dataset", name: "crude_oil_1m", state: "live", pitConstruction: "point_in_time" },
  { id: "dataset:nat_gas_1m", source: "data-catalog", kind: "dataset", name: "nat_gas_1m", state: "live", pitConstruction: "point_in_time" },
  { id: "dataset:heating_oil_1m", source: "data-catalog", kind: "dataset", name: "heating_oil_1m", state: "live", pitConstruction: "point_in_time" },

  // ── features ─────────────────────────────────────────────────────
  // governed by the real roll/stitch policy (row-level, not a lineage edge)
  { id: "feature:front_month_cont:v1", source: "artifact-catalog", kind: "feature", name: "front_month_cont", version: "v1", state: "live", policyRefs: ["policy:roll_stitch_cl_calendar_panama:1"] },
  { id: "feature:nat_gas_z20:v1", source: "artifact-catalog", kind: "feature", name: "nat_gas_z20", version: "v1", state: "live" },
  { id: "feature:ulsd_z20:v1", source: "artifact-catalog", kind: "feature", name: "ulsd_z20", version: "v1", state: "live" },

  // ── matrix ───────────────────────────────────────────────────────
  { id: "matrix:signal_matrix_v3:v3", source: "artifact-catalog", kind: "matrix", name: "signal_matrix_v3", version: "v3", state: "live" },

  // ── target (forward return — derived from the continuous price) ───
  { id: "target:fwd_ret_5m:v1", source: "artifact-catalog", kind: "target", name: "fwd_ret_5m", version: "v1", state: "live" },

  // ── model ────────────────────────────────────────────────────────
  { id: "model:linreg_baseline:v1", source: "artifact-catalog", kind: "model", name: "linreg_baseline", version: "v1", state: "live" },

  // ── result (governed by the real position-sizing policy) ──────────
  { id: "result:bt_2024_06_meanrev:v1", source: "artifact-catalog", kind: "result", name: "bt_2024_06_meanrev", version: "v1", state: "live", policyRefs: ["policy:position_sizing_top_decile_long_short:1"] },

  // ── policies (governing artifacts) ───────────────────────────────
  { id: "policy:roll_stitch_cl_calendar_panama:1", source: "artifact-catalog", kind: "policy", name: "roll_stitch_cl_calendar_panama", version: "1", state: "live" },
  { id: "policy:position_sizing_top_decile_long_short:1", source: "artifact-catalog", kind: "policy", name: "position_sizing_top_decile_long_short", version: "1", state: "live" },
];

const edges: LineageEdge[] = [
  // datasets → features
  { childId: "feature:front_month_cont:v1", parentId: "dataset:crude_oil_1m", kind: "stitch_source" },
  { childId: "feature:nat_gas_z20:v1", parentId: "dataset:nat_gas_1m", kind: "input_dependency" },
  { childId: "feature:ulsd_z20:v1", parentId: "dataset:heating_oil_1m", kind: "input_dependency" },
  // features → matrix (fan-in)
  { childId: "matrix:signal_matrix_v3:v3", parentId: "feature:front_month_cont:v1", kind: "input_dependency" },
  { childId: "matrix:signal_matrix_v3:v3", parentId: "feature:nat_gas_z20:v1", kind: "input_dependency" },
  { childId: "matrix:signal_matrix_v3:v3", parentId: "feature:ulsd_z20:v1", kind: "input_dependency" },
  // target is NOT free-floating — it derives from the continuous price (lead)
  { childId: "target:fwd_ret_5m:v1", parentId: "feature:front_month_cont:v1", kind: "input_dependency" },
  // matrix + target → model (training)
  { childId: "model:linreg_baseline:v1", parentId: "matrix:signal_matrix_v3:v3", kind: "training_data" },
  { childId: "model:linreg_baseline:v1", parentId: "target:fwd_ret_5m:v1", kind: "training_data" },
  // model → result
  { childId: "result:bt_2024_06_meanrev:v1", parentId: "model:linreg_baseline:v1", kind: "input_model" },
];

export const fig1Lineage: LineageSubgraph = { nodes, edges };

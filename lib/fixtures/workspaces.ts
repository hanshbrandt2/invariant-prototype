import type { Workspace, Node, LineageEdge } from "@/lib/types";
import { fig1Lineage } from "@/lib/fixtures/fig1-lineage";

/** Small honest lineage for a card thumbnail. */
function sub(nodes: Node[], edges: LineageEdge[]) {
  return { nodes, edges };
}

const gasAnomalies = sub(
  [
    { id: "dataset:ng_henry_hub_1m", source: "data-catalog", kind: "dataset", name: "ng_henry_hub_1m", state: "live" },
    { id: "feature:gas_logret:v1", source: "artifact-catalog", kind: "feature", name: "gas_logret", version: "v1", state: "live" },
    { id: "feature:gas_z40:v1", source: "artifact-catalog", kind: "feature", name: "gas_z40", version: "v1", state: "live" },
    { id: "result:gas_anomalies_2024:v1", source: "artifact-catalog", kind: "result", name: "gas_anomalies_2024", version: "v1", state: "live" },
  ],
  [
    { childId: "feature:gas_logret:v1", parentId: "dataset:ng_henry_hub_1m", kind: "input_dependency" },
    { childId: "feature:gas_z40:v1", parentId: "feature:gas_logret:v1", kind: "input_dependency" },
    { childId: "result:gas_anomalies_2024:v1", parentId: "feature:gas_z40:v1", kind: "input_model" },
  ]
);

const equityMomentum = sub(
  [
    { id: "dataset:nasdaq-large-cap", source: "data-catalog", kind: "dataset", name: "nasdaq-large-cap", state: "live" },
    { id: "feature:mom_12m:v1", source: "artifact-catalog", kind: "feature", name: "mom_12m", version: "v1", state: "live" },
    { id: "matrix:mom_rank:v1", source: "artifact-catalog", kind: "matrix", name: "mom_rank", version: "v1", state: "live" },
    { id: "model:ls_decile:v1", source: "artifact-catalog", kind: "model", name: "ls_decile", version: "v1", state: "live" },
    { id: "result:bt_momentum_10y:v1", source: "artifact-catalog", kind: "result", name: "bt_momentum_10y", version: "v1", state: "saved" },
  ],
  [
    { childId: "feature:mom_12m:v1", parentId: "dataset:nasdaq-large-cap", kind: "input_dependency" },
    { childId: "matrix:mom_rank:v1", parentId: "feature:mom_12m:v1", kind: "input_dependency" },
    { childId: "model:ls_decile:v1", parentId: "matrix:mom_rank:v1", kind: "training_data" },
    { childId: "result:bt_momentum_10y:v1", parentId: "model:ls_decile:v1", kind: "input_model" },
  ]
);

export const workspaces: Workspace[] = [
  {
    id: "crude-oil-research",
    name: "crude-oil-research",
    summary: "WTI mean-reversion on 1-minute bars, governed by the CL roll policy.",
    updatedAt: "2026-06-02",
    recentlyActive: true,
    starred: true,
    lineage: fig1Lineage,
  },
  {
    id: "gas-anomalies",
    name: "gas-anomalies",
    summary: "Henry Hub natural-gas outliers over 2024 via rolling z-score.",
    updatedAt: "2026-05-28",
    recentlyActive: true,
    lineage: gasAnomalies,
  },
  {
    id: "equity-momentum",
    name: "equity-momentum",
    summary: "Long/short decile momentum on Nasdaq large-cap, 10-year backtest.",
    updatedAt: "2026-05-19",
    recentlyActive: false,
    starred: true,
    lineage: equityMomentum,
  },
];

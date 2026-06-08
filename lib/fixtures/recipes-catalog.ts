import type { LineageSubgraph, Recipe } from "@/lib/types";
import { fig1Lineage, crudeOilLabels, crudeOilProducerOps } from "@/lib/fixtures/fig1-lineage";
import { workspaces } from "@/lib/fixtures/workspaces";

/**
 * Saved recipes — validated, parameterised workflows crystallised from a
 * workspace. A recipe carries its DAG, the knobs the agent may vary, and the
 * pins it must obey. Once "agentic", the agent runs it on its own but only ever
 * inside those pins. These are the templates the Recipes shelf lists.
 */

const lineageOf = (id: string): LineageSubgraph => workspaces.find((w) => w.id === id)?.lineage ?? { nodes: [], edges: [] };
// presentational labels from node names where a workspace has no authored map
const labelsOf = (g: LineageSubgraph): Record<string, string> => Object.fromEntries(g.nodes.map((n) => [n.id, n.name]));
const opsOf = (g: LineageSubgraph): Record<string, string> =>
  Object.fromEntries(g.nodes.map((n) => [n.id, (n.spec as { operator?: string; kind?: string } | undefined)?.operator ?? (n.spec as { kind?: string } | undefined)?.kind ?? ""]).filter(([, v]) => v));

const equity = lineageOf("equity-momentum");
const gas = lineageOf("gas-anomalies");

export const recipes: Recipe[] = [
  {
    id: "recipe:cl_meanrev",
    name: "CL mean-reversion",
    summary: "WTI front-month z-score reversion, ridge baseline, dollar-neutral book.",
    workspaceId: "crude-oil-research",
    lineage: fig1Lineage,
    labels: crudeOilLabels,
    producerOps: crudeOilProducerOps,
    knobs: [
      { param: "z-window", current: "20", options: ["10", "20", "40", "60"], op: "rolling_zscore" },
      { param: "α", current: "0.10", options: ["0.05", "0.10", "0.20"], op: "fit_model" },
      { param: "horizon", current: "5m", options: ["1m", "5m", "20m"], op: "lead" },
    ],
    pins: ["no_lookahead", "reproducible", "as_of", "pit_universe", "no_full_sample_fit", "dollar_neutral"],
    state: "validated",
    agentic: { scope: ["new_data", "param_sweep"], trigger: "weekly", triggerNote: "Mon 06:00", budget: 25, enabledAt: "2026-05-20T06:00:00Z" },
    producedId: "result:bt_2024_06_meanrev:v1",
    metrics: { sharpe: 1.42, hit_rate: 0.561, ann_return: 0.187 },
    createdAt: "2026-05-12T11:00:00Z",
  },
  {
    id: "recipe:eq_momentum",
    name: "Equity momentum",
    summary: "Long/short decile momentum on Nasdaq large-cap, dollar-neutral.",
    workspaceId: "equity-momentum",
    lineage: equity,
    labels: labelsOf(equity),
    producerOps: opsOf(equity),
    knobs: [
      { param: "lookback", current: "12m", options: ["6m", "12m"], op: "derive_column" },
      { param: "deciles", current: "10", options: ["5", "10"], op: "join_feature" },
    ],
    pins: ["no_lookahead", "reproducible", "pit_universe", "dollar_neutral"],
    state: "validated",
    producedId: "result:bt_momentum_10y:v1",
    metrics: { sharpe: 0.94, hit_rate: 0.534, ann_return: 0.112 },
    createdAt: "2026-05-19T09:30:00Z",
  },
  {
    id: "recipe:gas_anomaly",
    name: "Gas anomaly scan",
    summary: "Henry Hub outliers via rolling z-score — a diagnostic, not yet a signal.",
    workspaceId: "gas-anomalies",
    lineage: gas,
    labels: labelsOf(gas),
    producerOps: opsOf(gas),
    knobs: [{ param: "z-threshold", current: "3", options: ["2.5", "3", "3.5"], op: "rolling_zscore" }],
    pins: ["no_lookahead", "reproducible"],
    state: "draft",
    producedId: "result:gas_anomalies_2024:v1",
    createdAt: "2026-05-28T14:10:00Z",
  },
];

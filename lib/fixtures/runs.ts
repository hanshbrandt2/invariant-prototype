import type { RecipeRun } from "@/lib/types";

/**
 * The Runs history — the audit log of every time a recipe ran. Agentic recipes
 * accrue runs on their schedule; manual ones log when a human kicks them. Each
 * run is a reproducible attempt: a `lineageHash` when it validated, the pin it
 * tripped when it `halted`. The crude-oil recipe's log carries a real halt
 * (2026-06-01) — the week the agent caught a present-day-universe leak and
 * stopped instead of shipping the number; the next week, fixed, it validated.
 * That halt is the whole point, sitting in the log next to the green runs.
 *
 * Treat like any other seam fixture — `getRuns(recipeId)` serves these.
 */
export const runsByRecipe: Record<string, RecipeRun[]> = {
  "recipe:cl_meanrev": [
    {
      id: "run:cl:2026-06-08",
      recipeId: "recipe:cl_meanrev",
      at: "2026-06-08T06:00:00Z",
      trigger: "weekly",
      scope: "2025-Q1 data · z-window 20",
      outcome: "validated",
      lineageHash: "sha256:7a3d…2f10",
      metrics: { sharpe: 1.39, hit_rate: 0.558, ann_return: 0.181 },
      credits: 6.1,
      note: "out-of-sample edge holds; no change indicated",
    },
    {
      id: "run:cl:2026-06-01",
      recipeId: "recipe:cl_meanrev",
      at: "2026-06-01T06:00:00Z",
      trigger: "weekly",
      scope: "2025-Q1 data · eligible universe rebuilt",
      outcome: "halted",
      violatedPin: "pit_universe",
      credits: 4.4,
      note: "eligible universe came back as a present-day snapshot — halted before producing a number",
    },
    {
      id: "run:cl:2026-05-25",
      recipeId: "recipe:cl_meanrev",
      at: "2026-05-25T06:00:00Z",
      trigger: "weekly",
      scope: "2024-H2 data · z-window 20",
      outcome: "validated",
      lineageHash: "sha256:c19f…84a2",
      metrics: { sharpe: 1.41, hit_rate: 0.560, ann_return: 0.185 },
      credits: 6.0,
      note: "matched the pinned baseline within tolerance",
    },
    {
      id: "run:cl:2026-05-20",
      recipeId: "recipe:cl_meanrev",
      at: "2026-05-20T06:00:00Z",
      trigger: "on_demand",
      scope: "baseline · promotion run",
      outcome: "validated",
      lineageHash: "sha256:e2b9…1c6a",
      metrics: { sharpe: 1.42, hit_rate: 0.561, ann_return: 0.187 },
      credits: 6.2,
      note: "the run that promoted the recipe to agentic",
    },
  ],
  "recipe:eq_momentum": [
    {
      id: "run:eq:2026-06-02",
      recipeId: "recipe:eq_momentum",
      at: "2026-06-02T14:20:00Z",
      trigger: "manual",
      scope: "12m lookback · deciles 10",
      outcome: "validated",
      lineageHash: "sha256:9b41…77de",
      metrics: { sharpe: 0.91, hit_rate: 0.531, ann_return: 0.108 },
      credits: 5.3,
      note: "re-ran on refreshed Nasdaq panel",
    },
    {
      id: "run:eq:2026-05-19",
      recipeId: "recipe:eq_momentum",
      at: "2026-05-19T09:30:00Z",
      trigger: "manual",
      scope: "baseline",
      outcome: "validated",
      lineageHash: "sha256:1f7c…0b22",
      metrics: { sharpe: 0.94, hit_rate: 0.534, ann_return: 0.112 },
      credits: 5.4,
    },
  ],
  // gas_anomaly is still a draft — no runs logged yet.
};

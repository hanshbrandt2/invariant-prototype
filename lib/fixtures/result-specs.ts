import type { ResultSpec } from "@/lib/types";

/** Result specs keyed by node id — drives the result inspector face. */
export const resultSpecs: Record<string, ResultSpec> = {
  "result:bt_2024_06_meanrev:v1": {
    friendlyName: "WTI front-month mean-reversion · 2024",
    intendedInvariant:
      "Entry and exit are decided only from information available at the bar; the forward-return target is shifted strictly into the future, so the backtest carries no lookahead.",
    evalWindow: { start: "2024-01-02", end: "2024-06-28" },
    metrics: {
      sharpe: 1.42,
      hit_rate: 0.561,
      max_drawdown: -0.083,
      turnover: 0.34,
      ann_return: 0.187,
    },
    lineageRefs: [
      "matrix:signal_matrix_v3:v3",
      "model:linreg_baseline:v1",
      "target:fwd_ret_5m:v1",
      "feature:front_month_cont:v1",
    ],
    nextProposal: {
      kind: "feature_modification",
      summary:
        "Widen the z-score window from 20 to 30 bars — the edge concentrates in slower reversion, and turnover drops.",
    },
  },
};

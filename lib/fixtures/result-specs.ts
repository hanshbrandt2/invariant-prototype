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
    // Authored weekly equity snapshot over the eval window (cumulative return %).
    // Internally consistent with the metrics above: ends +9.4% (~18.8% annualized
    // over ~6 months → ann_return 0.187) and its deepest trough is 8.3% below the
    // running peak (→ max_drawdown −0.083). Drawdown is derived from this, not stored.
    equitySeries: [
      { t: "2024-01-02", equity: 0.0 },
      { t: "2024-01-09", equity: 1.0 },
      { t: "2024-01-16", equity: 2.2 },
      { t: "2024-01-23", equity: 3.4 },
      { t: "2024-01-30", equity: 4.6 },
      { t: "2024-02-06", equity: 5.8 },
      { t: "2024-02-13", equity: 6.9 },
      { t: "2024-02-20", equity: 8.0 },
      { t: "2024-02-27", equity: 7.1 },
      { t: "2024-03-05", equity: 5.4 },
      { t: "2024-03-12", equity: 3.2 },
      { t: "2024-03-19", equity: 1.1 },
      { t: "2024-03-26", equity: -0.3 },
      { t: "2024-04-02", equity: 1.4 },
      { t: "2024-04-09", equity: 3.0 },
      { t: "2024-04-16", equity: 4.3 },
      { t: "2024-04-23", equity: 5.5 },
      { t: "2024-04-30", equity: 6.4 },
      { t: "2024-05-07", equity: 7.2 },
      { t: "2024-05-14", equity: 7.9 },
      { t: "2024-05-21", equity: 8.4 },
      { t: "2024-05-28", equity: 8.0 },
      { t: "2024-06-04", equity: 8.7 },
      { t: "2024-06-11", equity: 9.1 },
      { t: "2024-06-18", equity: 8.8 },
      { t: "2024-06-28", equity: 9.4 },
    ],
    // Authored regime snapshot aligned to the equity weeks: mean-reversion (MR)
    // dominates, but a trending DOWN regime mid-window is exactly where the
    // mean-reversion edge gave back ground (the drawdown above) — honest narrative.
    regimeSeries: [
      { t: "2024-01-02", state: "MR" }, { t: "2024-01-09", state: "MR" },
      { t: "2024-01-16", state: "MR" }, { t: "2024-01-23", state: "MR" },
      { t: "2024-01-30", state: "MR" }, { t: "2024-02-06", state: "UP" },
      { t: "2024-02-13", state: "MR" }, { t: "2024-02-20", state: "MR" },
      { t: "2024-02-27", state: "DOWN" }, { t: "2024-03-05", state: "DOWN" },
      { t: "2024-03-12", state: "DOWN" }, { t: "2024-03-19", state: "DOWN" },
      { t: "2024-03-26", state: "DOWN" }, { t: "2024-04-02", state: "MR" },
      { t: "2024-04-09", state: "MR" }, { t: "2024-04-16", state: "MR" },
      { t: "2024-04-23", state: "MR" }, { t: "2024-04-30", state: "MR" },
      { t: "2024-05-07", state: "MR" }, { t: "2024-05-14", state: "UP" },
      { t: "2024-05-21", state: "NO_TRADE" }, { t: "2024-05-28", state: "NO_TRADE" },
      { t: "2024-06-04", state: "MR" }, { t: "2024-06-11", state: "MR" },
      { t: "2024-06-18", state: "MR" }, { t: "2024-06-28", state: "MR" },
    ],
    // Authored signal snapshot (20-day z-score) on the equity weeks. Pinned past
    // +2σ through late Feb–March — the signal kept betting on reversion exactly
    // when the spread trended, which is the drawdown above. The honest story a
    // return point dives into.
    signalSeries: [
      { t: "2024-01-02", z: 0.8 }, { t: "2024-01-09", z: 1.1 }, { t: "2024-01-16", z: 0.6 },
      { t: "2024-01-23", z: 1.3 }, { t: "2024-01-30", z: 0.9 }, { t: "2024-02-06", z: 1.6 },
      { t: "2024-02-13", z: 1.2 }, { t: "2024-02-20", z: 1.9 }, { t: "2024-02-27", z: 2.4 },
      { t: "2024-03-05", z: 2.7 }, { t: "2024-03-12", z: 2.6 }, { t: "2024-03-19", z: 2.8 },
      { t: "2024-03-26", z: 2.5 }, { t: "2024-04-02", z: 1.7 }, { t: "2024-04-09", z: 1.0 },
      { t: "2024-04-16", z: 0.4 }, { t: "2024-04-23", z: -0.3 }, { t: "2024-04-30", z: 0.6 },
      { t: "2024-05-07", z: 1.1 }, { t: "2024-05-14", z: 0.8 }, { t: "2024-05-21", z: 1.4 },
      { t: "2024-05-28", z: 0.5 }, { t: "2024-06-04", z: 0.9 }, { t: "2024-06-11", z: 1.2 },
      { t: "2024-06-18", z: 0.7 }, { t: "2024-06-28", z: 1.0 },
    ],
  },
};

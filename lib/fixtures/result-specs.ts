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
    // Authored spread snapshot (crude–gas spread). It trends away from its mean
    // through Feb–March (which is what the z-score above measured) and reverts by
    // April — the level underneath the signal. Same weeks as the equity.
    spreadSeries: [
      { t: "2024-01-02", spread: 0.2 }, { t: "2024-01-09", spread: -0.1 }, { t: "2024-01-16", spread: 0.3 },
      { t: "2024-01-23", spread: 0.0 }, { t: "2024-01-30", spread: 0.4 }, { t: "2024-02-06", spread: 0.7 },
      { t: "2024-02-13", spread: 1.1 }, { t: "2024-02-20", spread: 1.6 }, { t: "2024-02-27", spread: 2.2 },
      { t: "2024-03-05", spread: 2.7 }, { t: "2024-03-12", spread: 3.0 }, { t: "2024-03-19", spread: 3.1 },
      { t: "2024-03-26", spread: 2.9 }, { t: "2024-04-02", spread: 2.2 }, { t: "2024-04-09", spread: 1.5 },
      { t: "2024-04-16", spread: 0.9 }, { t: "2024-04-23", spread: 0.3 }, { t: "2024-04-30", spread: 0.0 },
      { t: "2024-05-07", spread: 0.4 }, { t: "2024-05-14", spread: 0.2 }, { t: "2024-05-21", spread: 0.6 },
      { t: "2024-05-28", spread: 0.1 }, { t: "2024-06-04", spread: 0.4 }, { t: "2024-06-11", spread: 0.5 },
      { t: "2024-06-18", spread: 0.2 }, { t: "2024-06-28", spread: 0.5 },
    ],
    // Authored raw-bar sample: WTI front-month 1-minute OHLC for a representative
    // March session (the crude leg the spread is built from). The floor of the dive.
    rawCandles: [
      { t: "09:30", o: 80.15, h: 80.22, l: 80.05, c: 80.10 }, { t: "09:45", o: 80.10, h: 80.14, l: 79.96, c: 79.99 },
      { t: "10:00", o: 79.99, h: 80.05, l: 79.90, c: 80.02 }, { t: "10:15", o: 80.02, h: 80.08, l: 79.92, c: 79.95 },
      { t: "10:30", o: 79.95, h: 79.99, l: 79.82, c: 79.85 }, { t: "10:45", o: 79.85, h: 79.90, l: 79.74, c: 79.78 },
      { t: "11:00", o: 79.78, h: 79.84, l: 79.70, c: 79.82 }, { t: "11:15", o: 79.82, h: 79.88, l: 79.76, c: 79.80 },
      { t: "11:30", o: 79.80, h: 79.83, l: 79.66, c: 79.69 }, { t: "11:45", o: 79.69, h: 79.74, l: 79.58, c: 79.61 },
      { t: "12:00", o: 79.61, h: 79.66, l: 79.52, c: 79.64 }, { t: "12:15", o: 79.64, h: 79.70, l: 79.58, c: 79.67 },
      { t: "12:30", o: 79.67, h: 79.71, l: 79.55, c: 79.57 }, { t: "12:45", o: 79.57, h: 79.61, l: 79.46, c: 79.49 },
      { t: "13:00", o: 79.49, h: 79.54, l: 79.40, c: 79.52 }, { t: "13:15", o: 79.52, h: 79.58, l: 79.46, c: 79.55 },
      { t: "13:30", o: 79.55, h: 79.59, l: 79.44, c: 79.47 }, { t: "13:45", o: 79.47, h: 79.51, l: 79.36, c: 79.39 },
      { t: "14:00", o: 79.39, h: 79.44, l: 79.30, c: 79.42 }, { t: "14:15", o: 79.42, h: 79.48, l: 79.36, c: 79.45 },
      { t: "14:30", o: 79.45, h: 79.50, l: 79.38, c: 79.41 }, { t: "14:45", o: 79.41, h: 79.45, l: 79.31, c: 79.34 },
      { t: "15:00", o: 79.34, h: 79.39, l: 79.26, c: 79.30 }, { t: "15:15", o: 79.30, h: 79.36, l: 79.24, c: 79.33 },
      { t: "15:30", o: 79.33, h: 79.40, l: 79.30, c: 79.38 }, { t: "15:45", o: 79.38, h: 79.46, l: 79.35, c: 79.44 },
      { t: "16:00", o: 79.44, h: 79.49, l: 79.40, c: 79.46 },
    ],
  },
};

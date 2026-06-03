import type { StarterPrompt } from "@/lib/types";

/**
 * The rotating starter-prompt pool. HONESTY BAR (hard): every prompt is
 * achievable by the platform's design — verified against the operator
 * registry + catalog. The three brief prompts that failed verification
 * (vol term-structure on 1d only, sector attribution with no GICS data,
 * FX rate-differential carry with no rate data) were replaced.
 */
export const starterPrompts: StarterPrompt[] = [
  {
    text: "Backtest a long/short on the top 30 US equities over 10 years",
    op: "rank · fit_model · evaluate_strategy",
    dataset: "nasdaq-large-cap",
  },
  {
    text: "Test a mean-reversion signal on crude over 2024",
    op: "rolling_zscore · evaluate_strategy",
    dataset: "crude_oil_1m",
  },
  {
    text: "Find anomalies in Henry Hub gas over the last year",
    op: "rolling_zscore · kalman_filter",
    dataset: "ng_henry_hub_1m",
  },
  {
    text: "Build a GARCH volatility view for WTI front-month",
    op: "stitch_contracts · garch_volatility",
    dataset: "crude_oil_1m",
  },
  {
    text: "Rank the S&P 500 by 12-month momentum",
    op: "derive_column · rank",
    dataset: "nasdaq-large-cap",
  },
  {
    text: "Find a cointegrated pair in the energy futures",
    op: "coint_test · coint_spread",
    dataset: "crude_oil_1m",
  },
];

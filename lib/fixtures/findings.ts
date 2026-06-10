import type { PublishedFinding } from "@/lib/types";

/**
 * Seeded published findings — what the registry looks like before you publish
 * anything yourself, and the gallery that proves the finding-led pattern works
 * for ANY kind of research, not just backtests. Each leads with a plain-language
 * one-liner + the picture that fits its task (weights / risk bars / attribution
 * waterfall / EDA distribution). The crude-oil strategy finding is `live` (it
 * opens its real workspace); the others are illustrative desk examples.
 * Contract-shaped, honest fixtures — at-runtime publishes are merged client-side.
 */
export const seededFindings: PublishedFinding[] = [
  {
    id: "finding:result:bt_2024_06_meanrev:v1",
    resultId: "result:bt_2024_06_meanrev:v1",
    workspaceId: "crude-oil-research",
    workspaceName: "crude-oil-research",
    friendlyName: "WTI front-month mean-reversion · 2024",
    kind: "strategy",
    headline: "A mean-reversion signal on WTI crude (2024) earned about 1.4× return per unit of risk, 19% a year.",
    metrics: { sharpe: 1.42, hit_rate: 0.561, max_drawdown: -0.083, turnover: 0.34, ann_return: 0.187 },
    stats: [
      { label: "Risk-adjusted return (Sharpe)", value: "1.42" },
      { label: "Annual return", value: "+19%" },
      { label: "Worst dip", value: "−8.3%" },
    ],
    lineageHash: "sha256:21b8…6d04",
    asOf: "2024-06-28",
    publishedBy: "h.brandt",
    publishedAt: "2026-06-08",
    sealOk: true,
    live: true,
  },
  {
    id: "finding:portfolio:risk_parity_v2",
    resultId: "result:risk_parity_v2:v1",
    workspaceId: "macro-risk-parity",
    workspaceName: "macro-risk-parity",
    friendlyName: "12-asset risk-parity book",
    kind: "portfolio",
    headline: "A 12-asset risk-parity book targets 10% volatility — risk spread evenly across sleeves, so no single bet dominates.",
    metrics: {},
    stats: [
      { label: "Target volatility", value: "10.0%" },
      { label: "Diversification", value: "0.71" },
    ],
    viz: { type: "bars", bars: [
      { label: "Equity", pct: 25, tone: "teal" },
      { label: "Energy", pct: 22, tone: "clay" },
      { label: "Credit", pct: 20, tone: "olive" },
      { label: "Rates", pct: 18, tone: "slate" },
      { label: "FX", pct: 15, tone: "amber" },
    ] },
    lineageHash: "sha256:c0fa…b911",
    asOf: "2026-05-30",
    publishedBy: "h.brandt",
    publishedAt: "2026-06-01",
    sealOk: true,
  },
  {
    id: "finding:risk:book_var_q2",
    resultId: "result:book_var_q2:v1",
    workspaceId: "book-risk",
    workspaceName: "book-risk",
    friendlyName: "Book risk · 1-day VaR",
    kind: "risk",
    headline: "The book could lose about $1.2M on a bad day (1-in-100). The biggest single risk is energy exposure.",
    metrics: {},
    stats: [
      { label: "1-day 99% VaR", value: "$1.2M" },
      { label: "Expected shortfall", value: "$1.9M" },
    ],
    viz: { type: "bars", bars: [
      { label: "Energy β", pct: 41, tone: "clay" },
      { label: "Rates", pct: 23, tone: "slate" },
      { label: "FX", pct: 16, tone: "amber" },
      { label: "Other", pct: 20, tone: "muted" },
    ] },
    lineageHash: "sha256:5e21…7ad0",
    asOf: "2026-06-06",
    publishedBy: "h.brandt",
    publishedAt: "2026-06-07",
    sealOk: true,
  },
  {
    id: "finding:attribution:q1_return",
    resultId: "result:q1_attribution:v1",
    workspaceId: "perf-attribution",
    workspaceName: "perf-attribution",
    friendlyName: "Q1 performance attribution",
    kind: "attribution",
    headline: "Q1's +4.2% came mostly from picking the right names (+3.1%); allocation helped (+1.4%); currency cost a little (−0.3%).",
    metrics: {},
    stats: [
      { label: "Q1 return", value: "+4.2%" },
      { label: "from selection", value: "+3.1%" },
    ],
    viz: { type: "waterfall", steps: [
      { label: "alloc", value: 1.4 },
      { label: "select", value: 3.1 },
      { label: "FX", value: -0.3 },
    ] },
    lineageHash: "sha256:9bd3…14ce",
    asOf: "2026-03-31",
    publishedBy: "h.brandt",
    publishedAt: "2026-04-04",
    sealOk: true,
  },
  {
    id: "finding:eda:henry_hub_profile",
    resultId: "result:henry_hub_profile:v1",
    workspaceId: "gas-eda",
    workspaceName: "gas-eda",
    friendlyName: "Henry Hub gas · data profile",
    kind: "eda",
    headline: "Henry Hub gas, 2.1M one-minute bars: clean data, but returns are fat-tailed — big moves cluster on winter cold snaps.",
    metrics: {},
    stats: [
      { label: "Missing", value: "0.4%" },
      { label: "Kurtosis (fat tails)", value: "4.7" },
      { label: "Grain", value: "1m" },
    ],
    viz: { type: "histogram", bins: [3, 7, 16, 28, 34, 28, 16, 7, 4, 3, 4] },
    lineageHash: "sha256:b08e…44c1",
    asOf: "2026-06-05",
    publishedBy: "data-platform",
    publishedAt: "2026-06-05",
    sealOk: true,
  },
];

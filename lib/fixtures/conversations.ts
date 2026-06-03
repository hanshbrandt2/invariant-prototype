import type { Turn } from "@/lib/types";

/** The empty-workspace greeting — an invitation, not a blank box. */
export const greeting: Turn[] = [
  {
    id: "g1",
    role: "assistant",
    text: "what are we analysing? start with data — pick a hosted dataset or bring your own, and tell me what you're after.",
    actions: [
      { type: "open_catalog" },
      { type: "chip", label: "mean-reversion on crude over 2024", prompt: "Test a mean-reversion signal on crude over 2024" },
      { type: "chip", label: "anomalies in Henry Hub gas", prompt: "Find anomalies in Henry Hub gas over the last year" },
    ],
  },
];

/** A worked thread for the crude-oil-research workspace (prior session). */
export const crudeOilConversation: Turn[] = [
  { id: "c1", role: "user", text: "Test a mean-reversion signal on crude over 2024." },
  {
    id: "c2",
    role: "assistant",
    text: "Loaded crude_oil_1m (3.8M rows, 0.4% missing). I stitched a front-month continuous under the CL roll policy, took log returns, and built a 20-bar z-score. Want to see the dataset first?",
    actions: [{ type: "push_node", ref: "dataset:crude_oil_1m" }],
  },
  {
    id: "c3",
    role: "assistant",
    text: "Assembled signal_matrix_v3, set a 5-minute forward-return target, fit a ridge baseline (α=0.1), and ran the 2024 backtest. Sharpe 1.42, hit rate 0.561.",
    actions: [{ type: "push_node", ref: "result:bt_2024_06_meanrev:v1" }],
  },
];

export const conversationsByWorkspace: Record<string, Turn[]> = {
  "crude-oil-research": crudeOilConversation,
};

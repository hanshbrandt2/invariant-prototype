import type { Metadata } from "next";
import { FunnelPage, type FunnelItem } from "@/components/funnel/funnel-page";

export const metadata: Metadata = {
  title: "Community — Invariant",
  description: "Shared, reproducible research from the Invariant community — fork any thread into your own workspace.",
};

const ITEMS: FunnelItem[] = [
  {
    title: "Crude mean-reversion",
    blurb: "The reference workspace: WTI 1-minute bars, the CL roll policy, a ridge baseline, a 2024 backtest.",
    prompt: "mean-reversion backtest on crude over 2024",
    cta: "Fork it",
  },
  {
    title: "Gas anomaly scan",
    blurb: "Henry Hub outliers flagged by a rolling z-score — a diagnostic, not a signal, and honest about it.",
    prompt: "find anomalies in Henry Hub gas over the last year",
    cta: "Fork it",
  },
  {
    title: "Equity momentum",
    blurb: "A long/short decile book on Nasdaq large-cap, dollar-neutral under the sizing policy.",
    prompt: "long/short momentum backtest on nasdaq large-cap over 10 years",
    cta: "Fork it",
  },
];

export default function CommunityPage() {
  return (
    <FunnelPage
      eyebrow="Community"
      title="Research you can actually rerun."
      intro="Every shared workspace ships with its lineage, its hashes, and its policies — so forking one gives you a result you can reproduce, not a screenshot you have to trust."
      items={ITEMS}
    />
  );
}

import type { Metadata } from "next";
import { FunnelPage, type FunnelItem } from "@/components/funnel/funnel-page";

export const metadata: Metadata = {
  title: "Learn — Invariant",
  description: "Learn quantitative research the reproducible way — every lesson opens a real, runnable workspace.",
};

const ITEMS: FunnelItem[] = [
  {
    title: "Your first signal",
    blurb: "Load crude, take log returns, z-score them, and see why point-in-time construction means no lookahead.",
    prompt: "mean-reversion signal on crude over 2024",
    cta: "Build it",
  },
  {
    title: "Reading lineage",
    blurb: "Follow a result back through its model, matrix, and features — every hop hashed and reproducible.",
    prompt: "long/short momentum backtest on nasdaq large-cap",
    cta: "Trace it",
  },
  {
    title: "Policies as invariants",
    blurb: "See how a roll convention or a sizing rule is written once and enforced on every build that touches it.",
    prompt: "carry / spread strategy on FX majors",
    cta: "Apply one",
  },
];

export default function LearnPage() {
  return (
    <FunnelPage
      eyebrow="Learn"
      title="Quant research, the reproducible way."
      intro="Short, hands-on threads — each one opens a real workspace you can run, fork, and export. No slides; you learn by building something that survives an audit."
      items={ITEMS}
    />
  );
}

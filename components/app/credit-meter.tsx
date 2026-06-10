"use client";

import { useCredits } from "@/components/app/credits-context";

/** Compact credit balance chip. Lives in the sidebar + workspace, never the landing. */
export function CreditMeter({ compact = false }: { compact?: boolean }) {
  const { balance } = useCredits();
  const low = balance < 10;
  return (
    <div className={compact ? "flex items-center gap-2" : "flex items-center justify-between"}>
      <span className="eyebrow">credits</span>
      <span className={`font-mono tabular-nums ${compact ? "text-ui" : "text-h3"} ${low ? "text-clay" : "text-ink"}`}>
        {balance.toFixed(1)}
      </span>
    </div>
  );
}

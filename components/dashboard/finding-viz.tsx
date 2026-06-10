"use client";

import type { FindingViz } from "@/lib/types";

const TONE: Record<string, string> = { clay: "#BE4D2B", slate: "#3a5a78", teal: "#2f6d62", amber: "#9a6a2f", olive: "#5f7330", muted: "#8A8478", green: "#3B6D11" };

/** The task-apt picture a finding leads with — weights/risk bars, an attribution
 *  waterfall, or an EDA distribution. Categorical/distribution viz, never a line
 *  sparkline (strategy findings lead with their numbers instead). */
export function FindingViz({ viz }: { viz: FindingViz }) {
  if (viz.type === "bars") {
    return (
      <div className="py-0.5">
        {viz.bars.map((b) => (
          <div key={b.label} className="flex items-center gap-2 my-[3px]">
            <span className="font-mono text-[0.6rem] text-ink-2 w-[72px] text-right shrink-0 truncate">{b.label}</span>
            <div className="flex-1 h-[8px] bg-paper-2 relative">
              <span className="absolute left-0 top-0 bottom-0" style={{ width: `${b.pct}%`, background: TONE[b.tone ?? "slate"] }} />
            </div>
            <span className="font-mono text-[0.6rem] text-muted w-[28px]">{b.pct}%</span>
          </div>
        ))}
      </div>
    );
  }

  if (viz.type === "waterfall") {
    const total = viz.steps.reduce((s, x) => s + x.value, 0);
    const bars = [...viz.steps.map((s) => ({ label: s.label, value: s.value, total: false })), { label: "total", value: total, total: true }];
    const max = Math.max(...bars.map((b) => Math.abs(b.value)), 0.001);
    const H = 50, BW = 34, GAP = 20, baseY = 56;
    return (
      <svg width={bars.length * (BW + GAP)} height="74" className="block">
        <line x1="0" y1={baseY} x2={bars.length * (BW + GAP)} y2={baseY} stroke="var(--color-hairline)" />
        {bars.map((b, i) => {
          const h = (Math.abs(b.value) / max) * H;
          const x = i * (BW + GAP) + 8;
          const y = b.value >= 0 ? baseY - h : baseY;
          const fill = b.total ? TONE.muted : b.value >= 0 ? TONE.teal : TONE.clay;
          return (
            <g key={b.label}>
              <rect x={x} y={y} width={BW} height={Math.max(h, 2)} fill={fill} />
              <text x={x + BW / 2} y="70" fontSize="8.5" fill="var(--color-muted)" textAnchor="middle" fontFamily="monospace">{b.label} {b.value >= 0 ? "+" : ""}{b.value}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  // histogram
  const max = Math.max(...viz.bins, 1);
  const BW = 30, GAP = 6, H = 56, baseY = 60;
  const tail = Math.max(0, viz.bins.length - 3);
  return (
    <svg width={viz.bins.length * (BW + GAP)} height="72" className="block">
      <line x1="0" y1={baseY} x2={viz.bins.length * (BW + GAP)} y2={baseY} stroke="var(--color-hairline)" />
      {viz.bins.map((v, i) => {
        const h = (v / max) * H;
        const x = i * (BW + GAP) + 4;
        const isTail = i < 1 || i >= tail; // outer bins = the fat tails
        return <rect key={i} x={x} y={baseY - h} width={BW} height={Math.max(h, 2)} fill={isTail ? TONE.clay : TONE.slate} />;
      })}
    </svg>
  );
}

"use client";

import type { FindingViz } from "@/lib/types";
import { editorial } from "@/lib/theme/editorial";

// Finding-viz tones, sourced from the one editorial theme (no per-file hex).
// (M-L trims this 7-tone set toward ~3; for now it reads from the shared palette.)
const c = editorial.color;
const TONE: Record<string, string> = {
  clay: c.clay,
  slate: c.data,
  teal: editorial.categorical[3],
  amber: editorial.categorical[4],
  olive: editorial.categorical[3],
  muted: c.muted,
  green: c.green,
};

/** The task-apt picture a finding leads with — weights/risk bars, an attribution
 *  waterfall, or an EDA distribution. Categorical/distribution viz, never a line
 *  sparkline (strategy findings lead with their numbers instead). */
export function FindingViz({ viz }: { viz: FindingViz }) {
  if (viz.type === "bars") {
    return (
      <div className="py-0.5">
        {viz.bars.map((b) => (
          <div key={b.label} className="flex items-center gap-2 my-[3px]">
            <span className="font-mono text-meta text-ink-2 w-[72px] text-right shrink-0 truncate">{b.label}</span>
            <div className="flex-1 h-[8px] bg-paper-2 relative">
              <span className="absolute left-0 top-0 bottom-0" style={{ width: `${b.pct}%`, background: TONE[b.tone ?? "slate"] }} />
            </div>
            <span className="font-mono text-meta text-muted w-[28px]">{b.pct}%</span>
          </div>
        ))}
      </div>
    );
  }

  if (viz.type === "waterfall") {
    // A REAL waterfall: each step starts where the previous ended (running
    // cumulative), and the final bar is the total from zero — not grouped bars
    // off a shared baseline.
    const H = 56, BW = 34, GAP = 20, padTop = 8;
    let cum = 0;
    const segs = viz.steps.map((s) => {
      const start = cum;
      cum += s.value;
      return { label: s.label, value: s.value, start, end: cum, isTotal: false };
    });
    const bars = [...segs, { label: "total", value: cum, start: 0, end: cum, isTotal: true }];
    const lo = Math.min(0, ...bars.map((b) => Math.min(b.start, b.end)));
    const hi = Math.max(0, ...bars.map((b) => Math.max(b.start, b.end)));
    const range = hi - lo || 1;
    const yOf = (v: number) => padTop + ((hi - v) / range) * H;
    const W = bars.length * (BW + GAP);
    return (
      <svg viewBox={`0 0 ${W} ${padTop + H + 18}`} width={W} height={padTop + H + 18} className="block max-w-full h-auto">
        <line x1="0" y1={yOf(0)} x2={W} y2={yOf(0)} stroke="var(--color-hairline)" />
        {bars.map((b, i) => {
          const x = i * (BW + GAP) + 8;
          const yTop = yOf(Math.max(b.start, b.end));
          const h = Math.max(Math.abs(yOf(b.start) - yOf(b.end)), 2);
          const fill = b.isTotal ? TONE.muted : b.value >= 0 ? TONE.teal : TONE.clay;
          return (
            <g key={b.label}>
              {/* connector from the previous step's running total */}
              {i > 0 && !b.isTotal && (
                <line x1={x - GAP} y1={yOf(b.start)} x2={x} y2={yOf(b.start)} stroke="var(--color-hairline-2)" strokeDasharray="2 2" />
              )}
              <rect x={x} y={yTop} width={BW} height={h} fill={fill} />
              <text x={x + BW / 2} y={padTop + H + 13} fontSize="8.5" fill="var(--color-muted)" textAnchor="middle" fontFamily="monospace">{b.label} {b.value >= 0 ? "+" : ""}{b.value}</text>
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
    <svg viewBox={`0 0 ${viz.bins.length * (BW + GAP)} 72`} width={viz.bins.length * (BW + GAP)} height="72" className="block max-w-full h-auto">
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

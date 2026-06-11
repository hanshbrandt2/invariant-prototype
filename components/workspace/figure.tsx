"use client";

import { useState } from "react";
import {
  ComposedChart, Area, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip,
} from "recharts";
import type { ChartSpec, FigurePoint } from "@/lib/types";
import { editorial, regimeColors } from "@/lib/theme/editorial";

const c = editorial.color;
const TICK = { fontFamily: "var(--font-jetbrains)", fontSize: 9, fill: c.faint } as const;
const AXIS = { stroke: c.hairline2 };
const TOOLTIP = {
  contentStyle: {
    background: c.paper, border: `1px solid ${c.ink}`, borderRadius: 0,
    fontFamily: "var(--font-jetbrains)", fontSize: 11, boxShadow: "none",
  },
  labelStyle: { color: c.muted },
} as const;

const monthFmt = (t: string) => {
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? t : d.toLocaleString("en-US", { month: "short" });
};

/**
 * The one figure seam (M-J). Components hand it a declarative ChartSpec and it
 * renders editorially via Recharts — title-as-finding, hairline grid, mono ticks,
 * data-blue series, direct labels. The renderer is swappable: when @invariant/viz
 * lands, the same ChartSpec compiles through it behind this boundary.
 */
export function Figure({ spec, height = 240, onPick, selected }: { spec: ChartSpec | null; height?: number; onPick?: (i: number) => void; selected?: number }) {
  if (!spec || spec.data.length === 0) return null;
  return (
    <figure className="m-0">
      {spec.title && (
        <figcaption className="font-serif text-h3 text-ink leading-snug mb-0.5">{spec.title}</figcaption>
      )}
      {spec.caption && <p className="font-mono text-meta text-faint mb-2">{spec.caption}</p>}
      {spec.mark === "equity-hero" ? (
        <EquityHero data={spec.data} onPick={onPick} selected={selected} />
      ) : spec.mark === "signal" ? (
        <Signal data={spec.data} focus={spec.focus} onPick={onPick} selected={selected} />
      ) : spec.mark === "spread" ? (
        <Spread data={spec.data} focus={spec.focus} onPick={onPick} selected={selected} />
      ) : spec.mark === "candles" ? (
        <Candles data={spec.data} />
      ) : spec.mark === "equity-drawdown" ? (
        <EquityDrawdown data={spec.data} height={height} />
      ) : spec.mark === "heatmap" ? (
        <Correlation data={spec.data} />
      ) : spec.mark === "regime" ? (
        <Regime data={spec.data} />
      ) : spec.mark === "weights" ? (
        <Weights data={spec.data} />
      ) : spec.mark === "bar" ? (
        <Bars spec={spec} height={height} />
      ) : (
        <LineArea spec={spec} height={height} />
      )}
    </figure>
  );
}

const REGIME_FILL: Record<string, string> = {
  MR: "rgba(122,139,111,0.15)", UP: "rgba(31,78,121,0.07)", DOWN: "rgba(190,77,43,0.11)", NO_TRADE: "rgba(170,162,148,0.10)",
};
const monthAbbr = (t: string) => {
  const dt = new Date(t);
  return Number.isNaN(dt.getTime()) ? t.slice(5, 7) : dt.toLocaleString("en-US", { month: "short" });
};
const tk = { fontFamily: "var(--font-jetbrains)", fontSize: 11, fill: c.faint } as const;
// Shared geometry for the SVG dive-chart family (signal / spread / candles) — so the
// cascade reads as one coherent system, and stays proportioned as it gets deep.
const DV = { W: 1000, ML: 44, MR: 16, MT: 14, plotH: 152 };

/** The HERO equity chart — big, annotated, with the regime shaded under the
 *  curve, so it tells "the result + when it worked + the risk" in one picture and
 *  the prose becomes optional. Peak / drawdown / end are computed from the data. */
function EquityHero({ data, onPick, selected }: { data: FigurePoint[]; onPick?: (i: number) => void; selected?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const eq = data.map((d) => Number(d.equity));
  const dd = data.map((d) => Number(d.drawdown));
  const n = eq.length;
  if (n < 2) return null;
  const W = 1000, ML = 48, MR = 120, MT = 20, topH = 296, gap = 10, botH = 76;
  const H = MT + topH + gap + botH + 24;
  const x = (i: number) => ML + (i * (W - ML - MR)) / (n - 1);
  const eqLo = Math.min(0, ...eq) - 1;
  const eqHi = Math.max(...eq) + 1.8;
  const yT = (v: number) => MT + ((eqHi - v) / (eqHi - eqLo)) * (topH - MT - 22);
  const ddMin = Math.min(...dd, -0.001);
  const bTop = MT + topH + gap;
  const yB = (v: number) => bTop + 6 + ((0 - v) / (0 - ddMin)) * (botH - 6 - 20);
  const path = (pts: number[][]) => pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const eqP = eq.map((v, i) => [x(i), yT(v)]);
  const ddP = dd.map((v, i) => [x(i), yB(v)]);
  // the drawdown story: the trough (deepest drawdown) and the RUNNING peak before
  // it — not the global max, which is often just the endpoint.
  let tr = 0; for (let i = 1; i < n; i++) if (dd[i] < dd[tr]) tr = i;
  let pk = 0; for (let i = 1; i <= tr; i++) if (eq[i] > eq[pk]) pk = i;
  const hasDD = dd[tr] < -0.5 && tr > pk;
  const hasRegime = data.some((d) => REGIME_FILL[String(d.regime)]);
  const gy = [0, 4, 8].filter((g) => g <= eqHi);
  // month ticks at the first occurrence of each month
  const ticks: { i: number; m: string }[] = [];
  let lastM = "";
  data.forEach((d, i) => { const m = monthAbbr(String(d.t)); if (m !== lastM) { ticks.push({ i, m }); lastM = m; } });
  const midY = (yT(eq[pk]) + yT(eq[tr])) / 2;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label="equity, drawdown and market regime">
        {/* regime shading under the curve */}
        {data.map((d, i) => {
          const x0 = i === 0 ? ML : (x(i - 1) + x(i)) / 2;
          const x1 = i === n - 1 ? W - MR : (x(i) + x(i + 1)) / 2;
          const fill = REGIME_FILL[String(d.regime)];
          return fill ? <rect key={i} x={x0} y={MT} width={x1 - x0} height={topH - MT} fill={fill} /> : null;
        })}
        {gy.map((g) => (
          <g key={g}>
            <line x1={ML} y1={yT(g)} x2={W - MR} y2={yT(g)} stroke={c.hairline} />
            <text x={ML - 8} y={yT(g) + 4} textAnchor="end" {...tk}>{g}%</text>
          </g>
        ))}
        <path d={`${path(eqP)} L ${x(n - 1)} ${yT(0)} L ${x(0)} ${yT(0)} Z`} fill={c.data} fillOpacity={0.1} />
        <path d={path(eqP)} fill="none" stroke={c.data} strokeWidth={2.4} />
        {/* the peak → drawdown story (only when there's a real drawdown) */}
        {hasDD && (
          <>
            <circle cx={x(pk)} cy={yT(eq[pk])} r={3.5} fill={c.data} />
            <text x={x(pk)} y={yT(eq[pk]) - 11} textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize={12} fontWeight={500} fill={c.ink}>peak +{eq[pk].toFixed(1)}%</text>
            <line x1={x(pk)} y1={yT(eq[pk])} x2={x(tr)} y2={yT(eq[pk])} stroke={c.clay} strokeDasharray="3 3" />
            <line x1={x(tr)} y1={yT(eq[pk])} x2={x(tr)} y2={yT(eq[tr])} stroke={c.clay} strokeWidth={1.4} />
            <circle cx={x(tr)} cy={yT(eq[tr])} r={3.5} fill={c.clay} />
            <text x={x(tr) + 8} y={midY} fontFamily="var(--font-jetbrains)" fontSize={13} fontWeight={600} fill={c.clay}>{dd[tr].toFixed(1)}%</text>
            <text x={x(tr) + 8} y={midY + 14} fontFamily="var(--font-jetbrains)" fontSize={10} fill={c.clay}>{monthAbbr(String(data[tr].t))} trend</text>
          </>
        )}
        {/* end value */}
        <circle cx={x(n - 1)} cy={yT(eq[n - 1])} r={3.5} fill={c.data} />
        <text x={x(n - 1) + 9} y={yT(eq[n - 1]) + 4} fontFamily="var(--font-jetbrains)" fontSize={14} fontWeight={600} fill={c.ink}>+{eq[n - 1].toFixed(1)}%</text>
        {/* drawdown panel */}
        <line x1={ML} y1={yB(0)} x2={W - MR} y2={yB(0)} stroke={c.hairline2} />
        <path d={`${path(ddP)} L ${x(n - 1)} ${yB(0)} L ${x(0)} ${yB(0)} Z`} fill={c.clay} fillOpacity={0.16} />
        <path d={path(ddP)} fill="none" stroke={c.clay} strokeWidth={1.4} />
        <text x={ML - 8} y={yB(ddMin) + 4} textAnchor="end" fontFamily="var(--font-jetbrains)" fontSize={10} fill={c.faint}>{ddMin.toFixed(0)}%</text>
        <text x={W - MR + 8} y={yB(0) + 4} fontFamily="var(--font-jetbrains)" fontSize={10} fill={c.faint}>drawdown</text>
        {/* month ticks */}
        {ticks.map((t) => <text key={t.i} x={x(t.i)} y={bTop + botH + 4} textAnchor="middle" {...tk}>{t.m}</text>)}
        {/* hover affordance — a value is a point you can dive into */}
        {onPick && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} y1={MT} x2={x(hover)} y2={MT + topH} stroke={c.hairline2} />
            <circle cx={x(hover)} cy={yT(eq[hover])} r={4} fill={c.paper} stroke={c.data} strokeWidth={1.5} />
          </g>
        )}
        {/* the dived point */}
        {selected != null && selected >= 0 && selected < n && (
          <g pointerEvents="none">
            <circle cx={x(selected)} cy={yT(eq[selected])} r={6.5} fill="none" stroke={c.clay} strokeWidth={1.5} />
            <circle cx={x(selected)} cy={yT(eq[selected])} r={3.5} fill={c.clay} />
          </g>
        )}
        {/* per-point hit bands — click a point to dive into the signal that made it */}
        {onPick && data.map((_, i) => {
          const x0 = i === 0 ? ML : (x(i - 1) + x(i)) / 2;
          const x1 = i === n - 1 ? W - MR : (x(i) + x(i + 1)) / 2;
          return (
            <rect key={"hit" + i} x={x0} y={MT} width={x1 - x0} height={topH} fill="transparent" style={{ cursor: "pointer" }}
              onClick={() => onPick(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover((h) => (h === i ? null : h))} />
          );
        })}
      </svg>
      {hasRegime && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-meta text-muted">
          <span className="flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5" style={{ background: "rgba(122,139,111,0.35)", outline: "1px solid #7A8B6F" }} /> mean-reverting regime</span>
          <span className="flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5" style={{ background: "rgba(190,77,43,0.28)", outline: `1px solid ${c.clay}` }} /> trending regime (the drawdown)</span>
        </div>
      )}
    </div>
  );
}

// Shared interaction layer for the dive charts: hover guide + the dived-from
// marker + per-point hit bands. A point is something you can fall into.
function HitLayer({ x, n, top, bottom, py, onPick, selected, W, ML, MR }: {
  x: (i: number) => number; n: number; top: number; bottom: number; py: (i: number) => number;
  onPick?: (i: number) => void; selected?: number; W: number; ML: number; MR: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <>
      {onPick && hover !== null && hover < n && (
        <g pointerEvents="none">
          <line x1={x(hover)} y1={top} x2={x(hover)} y2={bottom} stroke={c.hairline2} />
          <circle cx={x(hover)} cy={py(hover)} r={4} fill={c.paper} stroke={c.data} strokeWidth={1.5} />
        </g>
      )}
      {selected != null && selected >= 0 && selected < n && (
        <g pointerEvents="none">
          <circle cx={x(selected)} cy={py(selected)} r={6.5} fill="none" stroke={c.clay} strokeWidth={1.5} />
          <circle cx={x(selected)} cy={py(selected)} r={3.5} fill={c.clay} />
        </g>
      )}
      {onPick && Array.from({ length: n }).map((_, i) => {
        const x0 = i === 0 ? ML : (x(i - 1) + x(i)) / 2;
        const x1 = i === n - 1 ? W - MR : (x(i) + x(i + 1)) / 2;
        return <rect key={i} x={x0} y={top} width={x1 - x0} height={bottom - top} fill="transparent" style={{ cursor: "pointer" }} onClick={() => onPick(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover((h) => (h === i ? null : h))} />;
      })}
    </>
  );
}

/** The signal space — the 20-day z-score over the window, ±2σ bands, the dived
 *  window shaded, extended (|z|>2) points marked. Its points dive into the spread. */
function Signal({ data, focus, onPick, selected }: { data: FigurePoint[]; focus?: number; onPick?: (i: number) => void; selected?: number }) {
  const z = data.map((d) => Number(d.z));
  const n = z.length;
  if (n < 2) return null;
  const { W, ML, MR, MT, plotH } = DV;
  const BOT = MT + plotH, H = BOT + 22;
  const x = (i: number) => ML + (i * (W - ML - MR)) / (n - 1);
  const zLo = Math.min(-2.5, ...z) - 0.2, zHi = Math.max(2.5, ...z) + 0.2;
  const y = (v: number) => MT + ((zHi - v) / (zHi - zLo)) * (plotH - MT);
  const path = z.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  const f = focus != null ? Math.max(0, Math.min(n - 1, focus)) : null;
  const lo = f != null ? Math.max(0, f - 4) : 0, hi = f != null ? Math.min(n - 1, f + 4) : 0;
  const ticks: { i: number; m: string }[] = [];
  let lastM = "";
  data.forEach((d, i) => { const m = monthAbbr(String(d.t)); if (m !== lastM) { ticks.push({ i, m }); lastM = m; } });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label="z-score signal">
      {f != null && <rect x={x(lo)} y={MT} width={x(hi) - x(lo)} height={plotH - MT} fill="rgba(190,77,43,0.06)" />}
      {[2, -2].map((b) => (
        <g key={b}>
          <line x1={ML} y1={y(b)} x2={W - MR} y2={y(b)} stroke={c.hairline2} strokeDasharray="3 3" />
          <text x={ML - 6} y={y(b) + 3} textAnchor="end" {...tk}>{b > 0 ? "+" : ""}{b}σ</text>
        </g>
      ))}
      <line x1={ML} y1={y(0)} x2={W - MR} y2={y(0)} stroke={c.hairline} />
      <path d={path} fill="none" stroke={c.data} strokeWidth={1.8} />
      {z.map((v, i) => (Math.abs(v) > 2 ? <circle key={i} cx={x(i)} cy={y(v)} r={2.6} fill={c.clay} /> : null))}
      {f != null && (
        <g pointerEvents="none">
          <circle cx={x(f)} cy={y(z[f])} r={5.5} fill="none" stroke={c.clay} strokeWidth={1.2} strokeOpacity={0.6} />
        </g>
      )}
      {ticks.map((t) => <text key={t.i} x={x(t.i)} y={H - 5} textAnchor="middle" {...tk}>{t.m}</text>)}
      <HitLayer x={x} n={n} top={MT} bottom={BOT} py={(i) => y(z[i])} onPick={onPick} selected={selected} W={W} ML={ML} MR={MR} />
    </svg>
  );
}

/** The spread space — the crude–gas spread vs its trailing mean. The signal above
 *  is just this, standardized; the distance from the mean IS the z-score. */
function Spread({ data, focus, onPick, selected }: { data: FigurePoint[]; focus?: number; onPick?: (i: number) => void; selected?: number }) {
  const sp = data.map((d) => Number(d.spread));
  const n = sp.length;
  if (n < 2) return null;
  const mean = sp.map((_, i) => { const w = sp.slice(Math.max(0, i - 4), i + 1); return w.reduce((a, b) => a + b, 0) / w.length; });
  const { W, ML, MR, MT, plotH } = DV;
  const BOT = MT + plotH, H = BOT + 22;
  const x = (i: number) => ML + (i * (W - ML - MR)) / (n - 1);
  const lo = Math.min(...sp) - 0.5, hi = Math.max(...sp) + 0.6;
  const y = (v: number) => MT + ((hi - v) / (hi - lo)) * (plotH - MT);
  const path = (arr: number[]) => arr.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  const f = focus != null ? Math.max(0, Math.min(n - 1, focus)) : null;
  const wlo = f != null ? Math.max(0, f - 4) : 0, whi = f != null ? Math.min(n - 1, f + 4) : 0;
  const ticks: { i: number; m: string }[] = [];
  let lastM = "";
  data.forEach((d, i) => { const m = monthAbbr(String(d.t)); if (m !== lastM) { ticks.push({ i, m }); lastM = m; } });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label="crude-gas spread">
      {f != null && <rect x={x(wlo)} y={MT} width={x(whi) - x(wlo)} height={plotH - MT} fill="rgba(190,77,43,0.06)" />}
      <path d={path(mean)} fill="none" stroke={c.faint} strokeWidth={1} strokeDasharray="4 3" />
      <text x={W - MR} y={y(mean[n - 1]) - 5} textAnchor="end" fontFamily="var(--font-jetbrains)" fontSize={9} fill={c.faint}>trailing mean</text>
      {f != null && <line x1={x(f)} y1={y(sp[f])} x2={x(f)} y2={y(mean[f])} stroke={c.clay} strokeWidth={1.1} strokeDasharray="2 2" />}
      <path d={path(sp)} fill="none" stroke={c.ink2} strokeWidth={1.8} />
      {f != null && (
        <g pointerEvents="none">
          <circle cx={x(f)} cy={y(sp[f])} r={6} fill="none" stroke={c.clay} strokeWidth={1.5} />
          <circle cx={x(f)} cy={y(sp[f])} r={3.2} fill={c.clay} />
        </g>
      )}
      {ticks.map((t) => <text key={t.i} x={x(t.i)} y={H - 5} textAnchor="middle" {...tk}>{t.m}</text>)}
      <HitLayer x={x} n={n} top={MT} bottom={BOT} py={(i) => y(sp[i])} onPick={onPick} selected={selected} W={W} ML={ML} MR={MR} />
    </svg>
  );
}

/** The raw bars — 1-minute candlesticks (up = hollow blue, down = filled clay).
 *  The floor of the dive: nothing falls below the source. */
function Candles({ data }: { data: FigurePoint[] }) {
  const n = data.length;
  if (n < 1) return null;
  const o = data.map((d) => Number(d.o)), h = data.map((d) => Number(d.h)), l = data.map((d) => Number(d.l)), cl = data.map((d) => Number(d.c));
  const { W, ML, MR, MT, plotH } = DV;
  const BOT = MT + plotH, H = BOT + 22;
  const lo = Math.min(...l), hi = Math.max(...h);
  const pad = (hi - lo) * 0.08 || 0.1;
  const yLo = lo - pad, yHi = hi + pad;
  const cw = (W - ML - MR) / n;
  const x = (i: number) => ML + i * cw + cw / 2;
  const y = (v: number) => MT + ((yHi - v) / (yHi - yLo)) * (plotH - MT);
  const gy = [yLo + (yHi - yLo) * 0.15, (yLo + yHi) / 2, yHi - (yHi - yLo) * 0.15];
  const tickEvery = Math.max(1, Math.round(n / 6));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label="raw 1-minute candles">
      {gy.map((g, k) => (
        <g key={k}>
          <line x1={ML} y1={y(g)} x2={W - MR} y2={y(g)} stroke={c.hairline} />
          <text x={ML - 8} y={y(g) + 3} textAnchor="end" {...tk}>{g.toFixed(2)}</text>
        </g>
      ))}
      {data.map((_, i) => {
        const up = cl[i] >= o[i];
        const col = up ? c.data : c.clay;
        const yt = y(Math.max(o[i], cl[i]));
        const hb = Math.max(Math.abs(y(o[i]) - y(cl[i])), 1);
        return (
          <g key={i}>
            <line x1={x(i)} y1={y(h[i])} x2={x(i)} y2={y(l[i])} stroke={col} strokeWidth={1} />
            <rect x={x(i) - cw * 0.3} y={yt} width={cw * 0.6} height={hb} fill={up ? c.paper : col} stroke={col} strokeWidth={1} />
          </g>
        );
      })}
      {data.map((d, i) => (i % tickEvery === 0 ? <text key={"t" + i} x={x(i)} y={H - 5} textAnchor="middle" {...tk}>{String(d.t)}</text> : null))}
    </svg>
  );
}

/** Equity (top, data blue) + drawdown (bottom, clay) on one shared calendar —
 *  the usage09 shape: a trough below reads straight down to its equity peak. */
function EquityDrawdown({ data, height }: { data: FigurePoint[]; height: number }) {
  const topH = Math.round(height * 0.64);
  const botH = height - topH;
  const YW = 34, MR = 12;
  const interval = Math.max(0, Math.floor(data.length / 6));
  return (
    <div>
      <div style={{ height: topH }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: MR, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={c.hairline} />
            <XAxis dataKey="t" hide />
            <YAxis tick={TICK} axisLine={false} tickLine={false} width={YW} />
            <ReferenceLine y={0} stroke={c.hairline2} />
            <Area type="monotone" dataKey="equity" stroke="none" fill={c.data} fillOpacity={0.1} isAnimationActive={false} />
            <Line type="monotone" dataKey="equity" stroke={c.data} strokeWidth={1.6} dot={false} animationDuration={650} />
            <Tooltip {...TOOLTIP} labelFormatter={(t) => String(t)} formatter={(v) => [`${Number(v).toFixed(1)}%`, "equity"]} cursor={{ stroke: c.clay, strokeWidth: 1, strokeDasharray: "3 3" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div style={{ height: botH }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 0, right: MR, bottom: 2, left: 0 }}>
            <CartesianGrid vertical={false} stroke={c.hairline} />
            <XAxis dataKey="t" tick={TICK} axisLine={AXIS} tickLine={false} interval={interval} tickFormatter={monthFmt} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} width={YW} />
            <ReferenceLine y={0} stroke={c.hairline2} />
            <Area type="monotone" dataKey="drawdown" stroke="none" fill={c.clay} fillOpacity={0.16} isAnimationActive={false} />
            <Line type="monotone" dataKey="drawdown" stroke={c.clay} strokeWidth={1.1} dot={false} animationDuration={650} />
            <Tooltip {...TOOLTIP} labelFormatter={(t) => String(t)} formatter={(v) => [`${Number(v).toFixed(1)}%`, "drawdown"]} cursor={{ stroke: c.clay, strokeWidth: 1, strokeDasharray: "3 3" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Plain names for the technical feature ids (so charts never shout 'zscore_20').
const PRETTY: Record<string, string> = {
  zscore_20: "20-day z-score", gas_z20: "gas z-score", gas_z40: "gas z-score · 40",
  spread_5d: "crude–gas spread", front_month_ret: "log returns", front_month_cont: "front-month continuous",
};
const prettify = (s: string) => PRETTY[s] ?? s.replace(/_/g, " ");

/** Correlation as RANKED RELATIONSHIPS, not a block grid: each unique off-diagonal
 *  pair as a connected dot on a centered −1…+1 axis, sorted by strength. Drops the
 *  redundant 1.00 diagonal and the mirror; reads in one glance. Proportioned. */
function Correlation({ data }: { data: FigurePoint[] }) {
  const seen = new Set<string>();
  const pairs: { a: string; b: string; r: number }[] = [];
  for (const d of data) {
    const a = String(d.row), b = String(d.col);
    if (a === b) continue;
    const key = [a, b].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ a, b, r: Number(d.v) });
  }
  pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  const n = pairs.length;
  if (n === 0) return null;
  const W = 700, LG = 252, AX1 = W - 38, AX0 = LG + 12, MT = 28, rowH = 46;
  const H = MT + n * rowH + 14;
  const xOf = (r: number) => AX0 + ((Math.max(-1, Math.min(1, r)) + 1) / 2) * (AX1 - AX0);
  const mid = xOf(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" style={{ maxWidth: 640 }} role="img" aria-label="feature correlations, ranked">
      {[-0.5, 0.5].map((g) => <line key={g} x1={xOf(g)} y1={MT - 8} x2={xOf(g)} y2={MT + n * rowH - 6} stroke={c.hairline} />)}
      <line x1={mid} y1={MT - 11} x2={mid} y2={MT + n * rowH - 4} stroke={c.hairline2} />
      <text x={mid} y={MT - 15} textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="8.5" fill={c.faint} letterSpacing="1.5">DIVERGE · 0 · CO-MOVE</text>
      {pairs.map((p, i) => {
        const y = MT + i * rowH + rowH / 2 - 4;
        const xr = xOf(p.r), col = p.r >= 0 ? c.data : c.clay, right = p.r >= 0;
        return (
          <g key={i}>
            <text x={LG - 6} y={y - 2} textAnchor="end" fontFamily="var(--font-inter)" fontSize="13" fill={c.ink}>{prettify(p.a)}</text>
            <text x={LG - 6} y={y + 13} textAnchor="end" fontFamily="var(--font-inter)" fontSize="11" fill={c.muted}>&amp; {prettify(p.b)}</text>
            <line x1={mid} y1={y + 4} x2={xr} y2={y + 4} stroke={col} strokeWidth={2} />
            <circle cx={xr} cy={y + 4} r={4.5} fill={col} />
            <text x={xr + (right ? 11 : -11)} y={y + 8} textAnchor={right ? "start" : "end"} fontFamily="var(--font-jetbrains)" fontSize="13" fontWeight={500} fill={col}>{right ? "+" : ""}{p.r.toFixed(2)}</text>
          </g>
        );
      })}
      {[-1, 0, 1].map((t) => <text key={t} x={xOf(t)} y={MT + n * rowH + 6} textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="9" fill={c.faint}>{t > 0 ? "+" : ""}{t}</text>)}
    </svg>
  );
}

const REGIME_LABEL: Record<string, string> = {
  UP: "trending up", DOWN: "trending down", MR: "mean-reverting", NO_TRADE: "no trade",
};

/** A regime ribbon — one colored segment per step (regimeColors), with a direct
 *  legend. Reads as "which regime ruled, when" across the eval window. */
function Regime({ data }: { data: FigurePoint[] }) {
  const present: string[] = [];
  const seen = new Set<string>();
  for (const d of data) { const s = String(d.state); if (!seen.has(s)) { seen.add(s); present.push(s); } }
  return (
    <div>
      <div className="flex w-full h-6 overflow-hidden border border-hairline">
        {data.map((d, i) => (
          <div key={i} title={REGIME_LABEL[String(d.state)] ?? String(d.state)} style={{ flex: 1, background: regimeColors[String(d.state)] ?? c.hairline }} />
        ))}
      </div>
      {/* month axis — on the same calendar as the equity above */}
      <div className="flex w-full mt-1">
        {data.map((d, i) => {
          const m = monthAbbr(String(d.t));
          const show = i === 0 || monthAbbr(String(data[i - 1].t)) !== m;
          return <div key={i} className="flex-1 font-mono text-meta text-faint leading-none">{show ? m : ""}</div>;
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {present.map((s) => (
          <span key={s} className="flex items-center gap-1.5 font-mono text-meta text-muted">
            <span className="inline-block w-2.5 h-2.5 shrink-0" style={{ background: regimeColors[s] ?? c.hairline }} />
            {REGIME_LABEL[s] ?? s}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Signed feature weights as diverging bars off a center line — positive (data
 *  blue) reaches right, negative (clay) reaches left, direct value labels. */
function Weights({ data }: { data: FigurePoint[] }) {
  const max = Math.max(...data.map((d) => Math.abs(Number(d.value))), 0.001);
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d, i) => {
        const v = Number(d.value);
        const pos = v >= 0;
        const pct = (Math.abs(v) / max) * 50;
        return (
          <div key={i} className="grid items-center gap-3" style={{ gridTemplateColumns: "minmax(84px,34%) 1fr 46px" }}>
            <div className="text-ui text-ink-2 text-right truncate" title={String(d.label)}>{String(d.label)}</div>
            <div className="relative h-5" style={{ background: `linear-gradient(90deg, transparent calc(50% - 0.5px), ${c.hairline2} 50%, transparent calc(50% + 0.5px))` }}>
              <div className="absolute top-[3px] h-[14px]" style={pos ? { left: "50%", width: `${pct}%`, background: c.data } : { right: "50%", width: `${pct}%`, background: c.clay }} />
            </div>
            <div className="font-mono text-ui tabular-nums" style={{ color: pos ? c.data : c.clay }}>{pos ? "+" : ""}{v.toFixed(2)}</div>
          </div>
        );
      })}
    </div>
  );
}

/** A horizontal bar across categories (e.g. a metric per variant), with optional
 *  per-row color (winner in clay). Direct value labels, no legend. */
function Bars({ spec, height }: { spec: ChartSpec; height: number }) {
  const yKey = Array.isArray(spec.y) ? spec.y[0] : spec.y;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={spec.data} layout="vertical" margin={{ top: 2, right: 16, bottom: 2, left: 4 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke={c.hairline} />
          <XAxis type="number" tick={TICK} axisLine={AXIS} tickLine={false} />
          <YAxis type="category" dataKey={spec.x} tick={{ ...TICK, fill: c.muted }} axisLine={false} tickLine={false} width={56} />
          <Tooltip {...TOOLTIP} cursor={{ fill: c.clayWash }} />
          <Bar dataKey={yKey} radius={[0, 2, 2, 0]} animationDuration={550}>
            {spec.data.map((_, i) => (
              <Cell key={i} fill={spec.colors?.[i] ?? spec.color ?? c.data} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A single line (or filled area) over an x key — dataset previews, simple series. */
function LineArea({ spec, height }: { spec: ChartSpec; height: number }) {
  const yKey = Array.isArray(spec.y) ? spec.y[0] : spec.y;
  const stroke = spec.color ?? c.data;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={spec.data} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={c.hairline} />
          <XAxis dataKey={spec.x} tick={TICK} axisLine={AXIS} tickLine={false} interval={Math.max(0, Math.floor(spec.data.length / 8))} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} width={40} />
          {spec.mark === "area" && <Area type="monotone" dataKey={yKey} stroke="none" fill={stroke} fillOpacity={0.1} isAnimationActive={false} />}
          <Line type="monotone" dataKey={yKey} stroke={stroke} strokeWidth={1.5} dot={false} animationDuration={650} />
          <Tooltip {...TOOLTIP} cursor={{ stroke: c.clay, strokeWidth: 1, strokeDasharray: "3 3" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

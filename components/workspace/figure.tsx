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
        <Signal data={spec.data} focus={spec.focus} />
      ) : spec.mark === "equity-drawdown" ? (
        <EquityDrawdown data={spec.data} height={height} />
      ) : spec.mark === "heatmap" ? (
        <Heatmap data={spec.data} />
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

/** The signal space — the 20-day z-score over the window, ±2σ bands, with the
 *  dived point in focus, its neighborhood shaded, and extended (|z|>2) points
 *  marked. The space a return point opens into. */
function Signal({ data, focus }: { data: FigurePoint[]; focus?: number }) {
  const z = data.map((d) => Number(d.z));
  const n = z.length;
  if (n < 2) return null;
  const W = 1000, ML = 42, MR = 16, MT = 14, plotH = 184;
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
        <g>
          <circle cx={x(f)} cy={y(z[f])} r={6} fill="none" stroke={c.clay} strokeWidth={1.5} />
          <circle cx={x(f)} cy={y(z[f])} r={3.2} fill={c.clay} />
        </g>
      )}
      {ticks.map((t) => <text key={t.i} x={x(t.i)} y={H - 5} textAnchor="middle" {...tk}>{t.m}</text>)}
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

// Diverging color for correlations: clay (−1) ↔ paper (0) ↔ data blue (+1), via
// the editorial 5-stop ramp. Pure interpolation; no dependency.
function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function diverge(v: number): string {
  const stops = editorial.diverging;
  const t = Math.max(-1, Math.min(1, v));
  const pos = ((t + 1) / 2) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(pos));
  const f = pos - i;
  const a = hexRgb(stops[i]);
  const b = hexRgb(stops[i + 1]);
  const ch = (k: number) => Math.round(a[k] + (b[k] - a[k]) * f).toString(16).padStart(2, "0");
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

/** A correlation heatmap — long-format cells (row × col → value) on the diverging
 *  scale, with direct value labels (no legend). Responsive via viewBox. */
function Heatmap({ data }: { data: FigurePoint[] }) {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const d of data) {
    const r = String(d.row);
    if (!seen.has(r)) { seen.add(r); labels.push(r); }
  }
  const N = labels.length;
  const idx: Record<string, number> = Object.fromEntries(labels.map((l, i) => [l, i]));
  const CELL = 104, LG = 152, TG = 30, PAD = 6;
  const W = LG + N * CELL + PAD;
  const H = TG + N * CELL + PAD;
  const short = (s: string) => (s.length > 13 ? s.slice(0, 12) + "…" : s);
  const lab = { fontFamily: "var(--font-jetbrains)", fontSize: 12, fill: c.muted } as const;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto" role="img" aria-label="feature correlation heatmap">
      {labels.map((l, j) => (
        <text key={"c" + l} x={LG + j * CELL + CELL / 2} y={TG - 9} textAnchor="middle" {...lab}>{short(l)}</text>
      ))}
      {labels.map((l, i) => (
        <text key={"r" + l} x={LG - 10} y={TG + i * CELL + CELL / 2 + 4} textAnchor="end" {...lab}>{short(l)}</text>
      ))}
      {data.map((d, k) => {
        const i = idx[String(d.row)];
        const j = idx[String(d.col)];
        const v = Number(d.v);
        const x = LG + j * CELL;
        const y = TG + i * CELL;
        const light = Math.abs(v) < 0.55;
        return (
          <g key={k}>
            <rect x={x + 1} y={y + 1} width={CELL - 2} height={CELL - 2} fill={diverge(v)} />
            <text x={x + CELL / 2} y={y + CELL / 2 + 6} textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="18" fill={light ? c.ink : c.paper}>{v.toFixed(2)}</text>
          </g>
        );
      })}
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
      <div className="flex w-full h-5 overflow-hidden border border-hairline">
        {data.map((d, i) => (
          <div key={i} title={REGIME_LABEL[String(d.state)] ?? String(d.state)} style={{ flex: 1, background: regimeColors[String(d.state)] ?? c.hairline }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
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

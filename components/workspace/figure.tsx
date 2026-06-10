"use client";

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
export function Figure({ spec, height = 240 }: { spec: ChartSpec | null; height?: number }) {
  if (!spec || spec.data.length === 0) return null;
  return (
    <figure className="m-0">
      {spec.title && (
        <figcaption className="font-serif text-h3 text-ink leading-snug mb-0.5">{spec.title}</figcaption>
      )}
      {spec.caption && <p className="font-mono text-meta text-faint mb-2">{spec.caption}</p>}
      {spec.mark === "equity-drawdown" ? (
        <EquityDrawdown data={spec.data} height={height} />
      ) : spec.mark === "heatmap" ? (
        <Heatmap data={spec.data} />
      ) : spec.mark === "regime" ? (
        <Regime data={spec.data} />
      ) : spec.mark === "bar" ? (
        <Bars spec={spec} height={height} />
      ) : (
        <LineArea spec={spec} height={height} />
      )}
    </figure>
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
  const CELL = 46, LG = 76, TG = 16, PAD = 4;
  const W = LG + N * CELL + PAD;
  const H = TG + N * CELL + PAD;
  const short = (s: string) => (s.length > 9 ? s.slice(0, 8) + "…" : s);
  const lab = { fontFamily: "var(--font-jetbrains)", fontSize: 8.5, fill: c.muted } as const;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full h-auto" role="img" aria-label="feature correlation heatmap">
        {labels.map((l, j) => (
          <text key={"c" + l} x={LG + j * CELL + CELL / 2} y={TG - 5} textAnchor="middle" {...lab}>{short(l)}</text>
        ))}
        {labels.map((l, i) => (
          <text key={"r" + l} x={LG - 8} y={TG + i * CELL + CELL / 2 + 3} textAnchor="end" {...lab}>{short(l)}</text>
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
              <text x={x + CELL / 2} y={y + CELL / 2 + 3} textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="9.5" fill={light ? c.ink : c.paper}>{v.toFixed(2)}</text>
            </g>
          );
        })}
      </svg>
    </div>
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

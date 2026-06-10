"use client";

import {
  ComposedChart, Area, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip,
} from "recharts";
import type { ChartSpec, FigurePoint } from "@/lib/types";
import { editorial } from "@/lib/theme/editorial";

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

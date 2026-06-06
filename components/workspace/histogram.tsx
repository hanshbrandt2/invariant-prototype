"use client";

import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { ColumnHistogram } from "@/lib/types";
import { fmtNumber } from "@/lib/format";

/** Editorial distribution chart — ink bars, hairline axis, mono ticks. Driven
 *  by a pre-binned histogram (authored snapshot, never computed live). */
export function Histogram({ hist, height = 170 }: { hist: ColumnHistogram; height?: number }) {
  const data = hist.bins.map((b) => ({
    mid: (b.start + b.end) / 2,
    label: `${fmtNumber(b.start)} – ${fmtNumber(b.end)}`,
    count: b.count,
  }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -8 }} barCategoryGap={2}>
          <XAxis
            dataKey="mid"
            tickFormatter={(v) => fmtNumber(v as number)}
            tick={{ fontFamily: "var(--font-jetbrains)", fontSize: 9, fill: "#9A9388" }}
            axisLine={{ stroke: "#d8d0bf" }}
            tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 6))}
          />
          <YAxis
            tick={{ fontFamily: "var(--font-jetbrains)", fontSize: 9, fill: "#9A9388" }}
            axisLine={false}
            tickLine={false}
            width={38}
            tickFormatter={(v) => fmtNumber(v as number)}
          />
          <Tooltip
            contentStyle={{ background: "#FAF7F1", border: "1px solid #1C1B18", borderRadius: 8, fontFamily: "var(--font-jetbrains)", fontSize: 11, boxShadow: "none" }}
            labelStyle={{ color: "#837c6e" }}
            cursor={{ fill: "rgba(190,77,43,0.08)" }}
            formatter={(val) => [Number(val).toLocaleString(), "rows"]}
            labelFormatter={(_label, p) => (p?.[0]?.payload?.label as string) ?? ""}
          />
          <Bar dataKey="count" fill="#1C1B18" radius={[2, 2, 0, 0]} animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
